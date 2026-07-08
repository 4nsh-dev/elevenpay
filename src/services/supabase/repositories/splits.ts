/**
 * Split repository — bill splits and legs.
 *
 * create_split is an atomic RPC: split header + all legs in one transaction,
 * with shares validated to sum exactly to the total. pay_split_leg returns a
 * payment template for the standard pipeline; legs flip to PAID server-side
 * after verification, and the split auto-settles when the last leg pays.
 */

import { supabase } from '@/services/supabase/client';
import type { Tables } from '@/types/database';
import { toAmountString } from './types';
import type {
  CreateSplitMemberInput,
  CreateSplitResult,
  PaySplitLegResult,
} from './types';

export type Split = Omit<Tables<'splits'>, 'total_amount'> & { total_amount: string };
export type SplitLeg = Omit<Tables<'split_members'>, 'share_amount'> & {
  share_amount: string;
};

function toSplit(row: Tables<'splits'>): Split {
  return { ...row, total_amount: toAmountString(row.total_amount) };
}

function toLeg(row: Tables<'split_members'>): SplitLeg {
  return { ...row, share_amount: toAmountString(row.share_amount) };
}

/**
 * Creates a split atomically. Include `{ self: true, share_amount }` for the
 * creator's own (instantly settled) leg. Amounts are decimal strings.
 */
export async function createSplit(input: {
  total_amount: string;
  memo?: string | null;
  members: CreateSplitMemberInput[];
}): Promise<CreateSplitResult> {
  const { data, error } = await supabase.rpc('create_split', {
    p_total_amount: Number(input.total_amount),
    p_memo: input.memo ?? null,
    p_members: input.members,
  });
  if (error) throw error;
  return data as CreateSplitResult;
}

/** Splits the caller created or participates in (RLS-scoped), newest first. */
export async function listMySplits(limit = 25): Promise<Split[]> {
  const { data, error } = await supabase
    .from('splits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toSplit);
}

export async function getSplit(id: string): Promise<{
  split: Split;
  legs: SplitLeg[];
} | null> {
  const { data, error } = await supabase
    .from('splits')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: legs, error: legsError } = await supabase
    .from('split_members')
    .select('*')
    .eq('split_id', id)
    .order('created_at', { ascending: true });
  if (legsError) throw legsError;

  return { split: toSplit(data), legs: (legs ?? []).map(toLeg) };
}

/** Legs the caller still owes ("you owe" badge). */
export async function listMyOwedLegs(): Promise<SplitLeg[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('UNAUTHENTICATED');

  const { data, error } = await supabase
    .from('split_members')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('status', 'REQUESTED')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toLeg);
}

/** Accepts a leg -> payment template for the standard pipeline. */
export async function paySplitLeg(legId: string): Promise<PaySplitLegResult> {
  const { data, error } = await supabase.rpc('pay_split_leg', { p_leg_id: legId });
  if (error) throw error;
  return data as PaySplitLegResult;
}

/** Creator cancels an OPEN split (status change; nothing is deleted). */
export async function cancelSplit(splitId: string): Promise<void> {
  const { error } = await supabase
    .from('splits')
    .update({ status: 'CANCELLED' })
    .eq('id', splitId)
    .eq('status', 'OPEN');
  if (error) throw error;
}

/** Creator nudges an unpaid leg (server enforces the 24h rule). */
export async function remindSplitLeg(legId: string): Promise<void> {
  const { error } = await supabase
    .from('split_members')
    .update({ reminded_at: new Date().toISOString() })
    .eq('id', legId)
    .eq('status', 'REQUESTED');
  if (error) throw error;
}

/** Splits by ids (RLS still applies: creator or member only). */
export async function listSplitsByIds(ids: string[]): Promise<Split[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('splits').select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []) as Split[];
}

/** Legs for many splits in one query (RLS: your legs + legs of splits you created). */
export async function listLegsForSplits(splitIds: string[]): Promise<Map<string, SplitLeg[]>> {
  const grouped = new Map<string, SplitLeg[]>();
  if (splitIds.length === 0) return grouped;
  const { data, error } = await supabase
    .from('split_members')
    .select('*')
    .in('split_id', splitIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  for (const leg of (data ?? []) as SplitLeg[]) {
    const list = grouped.get(leg.split_id);
    if (list) list.push(leg);
    else grouped.set(leg.split_id, [leg]);
  }
  return grouped;
}

export type ConfirmSplitPaymentResult = {
  leg_id: string;
  status: string;
  transaction_id: string | null;
  split_status: string;
};

/**
 * Verifies the broadcast SPLIT_BILL ledger row server-side and flips the
 * caller's leg REQUESTED -> PAID with the receipt linked (idempotent). The
 * split auto-settles when the last leg pays.
 */
export async function confirmSplitPayment(splitId: string): Promise<ConfirmSplitPaymentResult> {
  const { data, error } = await supabase.rpc('confirm_split_payment', { p_split_id: splitId });
  if (error) throw error;
  return data as ConfirmSplitPaymentResult;
}
