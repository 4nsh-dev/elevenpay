/**
 * Split bill feature — create a bill, add participants, AI share assistant,
 * payment requests, WDK payments through the standard confirm sheet, and
 * settlement history. Backed by the splits/split_members tables and the
 * create_split / pay_split_leg / confirm_split_payment RPCs.
 *
 * Full write-up: docs/split-bill-supabase.md.
 */

import { supabase } from '@/services/supabase/client';
import { searchProfiles } from '@/services/supabase/repositories/profiles';
import {
  confirmSplitPayment,
  createSplit,
  getSplit,
  listLegsForSplits,
  listMyOwedLegs,
  listMySplits,
  listSplitsByIds,
  paySplitLeg,
  type Split,
  type SplitLeg,
} from '@/services/supabase/repositories/splits';
import type {
  CreateSplitMemberInput,
  CreateSplitResult,
} from '@/services/supabase/repositories/types';
import { resolveRecipient } from '@/services/supabase/repositories/wallets';
import type { PaymentDraft } from '@/services/wdk';

export type { CreateSplitResult, Split, SplitLeg };

/** Friend search for the participant picker (safe public columns only). */
export const searchFriends = searchProfiles;

// ---------------------------------------------------------------------------
// Exact 6-decimal USDT math (bigint micro units — no float drift)
// ---------------------------------------------------------------------------

const MICRO = 1_000_000n;

/** Parses a USDT decimal string (up to 6 dp) into micro units; null if invalid. */
export function parseUsdt(value: string): bigint | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  return BigInt(whole) * MICRO + BigInt(fraction.padEnd(6, '0'));
}

/** Formats micro units back into a 6 dp decimal string. */
export function formatMicroUsdt(micro: bigint): string {
  const sign = micro < 0n ? '-' : '';
  const abs = micro < 0n ? -micro : micro;
  return `${sign}${abs / MICRO}.${(abs % MICRO).toString().padStart(6, '0')}`;
}

// ---------------------------------------------------------------------------
// Participants + AI share assistant
// ---------------------------------------------------------------------------

export type SplitParticipant = {
  key: string;
  kind: 'self' | 'friend' | 'guest';
  displayName: string;
  userId?: string;
  username?: string | null;
  /** 6 dp decimal string; empty until assigned. */
  share: string;
  /** Locked shares are kept as-is; the assistant only fills unlocked ones. */
  locked: boolean;
};

export type ShareSuggestion =
  | { ok: true; shares: Record<string, string>; explanation: string }
  | { ok: false; error: string };

/**
 * On-device AI share assistant. Deterministic and exact: honors locked
 * shares, splits the remainder evenly across unlocked participants in
 * micro-USDT, and assigns rounding so shares always sum to the total
 * (create_split rejects anything else). The heuristic is intentionally
 * swappable for an LLM-backed suggester later — the contract is just
 * (total, participants) -> exact shares + explanation.
 */
export function aiCalculateShares(
  total: string,
  participants: SplitParticipant[],
): ShareSuggestion {
  const totalMicro = parseUsdt(total);
  if (totalMicro === null || totalMicro <= 0n) {
    return { ok: false, error: 'Enter a valid total amount first (up to 6 decimals).' };
  }
  if (participants.length === 0) {
    return { ok: false, error: 'Add at least one participant.' };
  }

  const locked = participants.filter((participant) => participant.locked);
  const flexible = participants.filter((participant) => !participant.locked);

  let lockedSum = 0n;
  for (const participant of locked) {
    const share = parseUsdt(participant.share);
    if (share === null || share <= 0n) {
      return {
        ok: false,
        error: `${participant.displayName} has a locked share that is not a valid amount.`,
      };
    }
    lockedSum += share;
  }

  if (flexible.length === 0) {
    if (lockedSum !== totalMicro) {
      return { ok: false, error: 'All shares are locked but they do not sum to the total.' };
    }
    return { ok: true, shares: {}, explanation: 'All shares are locked and already sum exactly to the total.' };
  }

  const remainder = totalMicro - lockedSum;
  if (remainder <= 0n) {
    return { ok: false, error: 'Locked shares already use the whole total — lower one to continue.' };
  }
  if (remainder < BigInt(flexible.length)) {
    return { ok: false, error: 'The total is too small to split among this many people.' };
  }

  const base = remainder / BigInt(flexible.length);
  const leftover = remainder % BigInt(flexible.length);

  const shares: Record<string, string> = {};
  flexible.forEach((participant, index) => {
    const extra = BigInt(index) < leftover ? 1n : 0n;
    shares[participant.key] = formatMicroUsdt(base + extra);
  });

  const people = flexible.length === 1 ? 'person' : 'people';
  let explanation = `Assigned ${formatMicroUsdt(remainder)} USDT evenly across ${flexible.length} ${people}`;
  if (locked.length > 0) {
    explanation += `, keeping ${locked.length} locked share${locked.length === 1 ? '' : 's'} untouched`;
  }
  explanation +=
    leftover > 0n
      ? `. Rounding of ${formatMicroUsdt(leftover)} USDT went to the first ${leftover.toString()} ${leftover === 1n ? 'entry' : 'entries'} so shares sum exactly.`
      : '. Shares sum exactly to the total.';

  return { ok: true, shares, explanation };
}

export type BillValidation = { ok: true } | { ok: false; error: string };

/** Client-side mirror of the create_split RPC rules (server re-validates). */
export function validateBill(total: string, participants: SplitParticipant[]): BillValidation {
  const totalMicro = parseUsdt(total);
  if (totalMicro === null || totalMicro <= 0n) {
    return { ok: false, error: 'Enter a valid total amount (up to 6 decimals).' };
  }
  if (participants.length < 1 || participants.length > 20) {
    return { ok: false, error: 'A split needs between 1 and 20 participants.' };
  }

  let sum = 0n;
  for (const participant of participants) {
    const share = parseUsdt(participant.share);
    if (share === null || share <= 0n) {
      return { ok: false, error: `${participant.displayName} needs a share greater than zero.` };
    }
    sum += share;
  }

  if (sum !== totalMicro) {
    const diff = totalMicro - sum;
    return {
      ok: false,
      error:
        diff > 0n
          ? `${formatMicroUsdt(diff)} USDT is still unassigned.`
          : `Shares exceed the total by ${formatMicroUsdt(-diff)} USDT.`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Create bill -> payment requests
// ---------------------------------------------------------------------------

/**
 * Creates the bill atomically via create_split. The creator's own leg is
 * settled instantly; every other leg becomes a REQUESTED payment request
 * (friends see it in their Activity, guests get a share code).
 */
export async function createBill(input: {
  total: string;
  memo?: string;
  participants: SplitParticipant[];
}): Promise<CreateSplitResult> {
  const members: CreateSplitMemberInput[] = input.participants.map((participant) => {
    if (participant.kind === 'self') {
      return { self: true as const, share_amount: participant.share };
    }
    if (participant.kind === 'friend' && participant.userId) {
      return { user_id: participant.userId, share_amount: participant.share };
    }
    return { share_amount: participant.share };
  });

  const memo = input.memo?.trim();
  return createSplit({
    total_amount: input.total.trim(),
    memo: memo ? memo : null,
    members,
  });
}

// ---------------------------------------------------------------------------
// History board (splits I'm in + requests I owe)
// ---------------------------------------------------------------------------

export type SplitHistoryView = {
  split: Split;
  paidLegs: number;
  totalLegs: number;
};

export type OwedRequestView = {
  leg: SplitLeg;
  split: Split | null;
  creatorName: string;
  memo: string;
};

export async function loadSplitBoard(): Promise<{
  mySplits: SplitHistoryView[];
  owedRequests: OwedRequestView[];
}> {
  const [splits, owedLegs] = await Promise.all([listMySplits(), listMyOwedLegs()]);

  const legsBySplit = await listLegsForSplits(splits.map((split) => split.id));
  const mySplits: SplitHistoryView[] = splits.map((split) => {
    const legs = legsBySplit.get(split.id) ?? [];
    return {
      split,
      paidLegs: legs.filter((leg) => leg.status === 'PAID').length,
      totalLegs: legs.length,
    };
  });

  const splitById = new Map(splits.map((split) => [split.id, split]));
  const missingIds = [...new Set(owedLegs.map((leg) => leg.split_id))].filter(
    (id) => !splitById.has(id),
  );
  if (missingIds.length > 0) {
    for (const split of await listSplitsByIds(missingIds)) {
      splitById.set(split.id, split);
    }
  }

  const creatorIds = [
    ...new Set(
      owedLegs
        .map((leg) => splitById.get(leg.split_id)?.creator_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const creatorNames = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data } = await supabase
      .from('public_profiles')
      .select('id, username, full_name')
      .in('id', creatorIds);
    for (const profile of data ?? []) {
      creatorNames.set(
        profile.id,
        profile.full_name ?? (profile.username ? `@${profile.username}` : 'A friend'),
      );
    }
  }

  const owedRequests: OwedRequestView[] = owedLegs.map((leg) => {
    const split = splitById.get(leg.split_id) ?? null;
    return {
      leg,
      split,
      creatorName: split ? (creatorNames.get(split.creator_id) ?? 'A friend') : 'A friend',
      memo: split?.memo ?? 'Split bill',
    };
  });

  return { mySplits, owedRequests };
}

// ---------------------------------------------------------------------------
// Pay a leg with WDK (standard confirm sheet pipeline)
// ---------------------------------------------------------------------------

/**
 * Accepts the caller's leg via pay_split_leg (server validates ownership and
 * status) and builds a PaymentDraft to the creator's wallet for the confirm
 * sheet. metadata.receiverWalletId links the ledger row to the creator's
 * wallet; the leg flips to PAID via confirm_split_payment after broadcast.
 */
export async function beginPaySplitLeg(
  leg: SplitLeg,
  split?: Split | null,
): Promise<PaymentDraft> {
  let splitRow = split ?? null;
  if (!splitRow) {
    const detail = await getSplit(leg.split_id);
    splitRow = detail?.split ?? null;
  }
  if (!splitRow) {
    throw new Error('NOT_FOUND: split does not exist');
  }

  const result = await paySplitLeg(leg.id);

  // Resolve the creator's payable address (wallet rows are private; the
  // resolve_wallet RPC exposes just address + blockchain by username).
  const { data: creator } = await supabase
    .from('public_profiles')
    .select('username')
    .eq('id', splitRow.creator_id)
    .maybeSingle();
  const resolved = creator?.username ? await resolveRecipient(creator.username) : null;
  if (!resolved?.wallet_address) {
    throw new Error('CONFLICT: the split creator has no payable wallet address yet');
  }

  const draft: PaymentDraft = {
    to: resolved.wallet_address,
    amount: result.payment.amount,
    type: 'SPLIT_BILL',
    referenceId: result.payment.reference_id ?? leg.split_id,
    memo: splitRow.memo ? `Split bill: ${splitRow.memo}` : 'Split bill share',
    metadata: {
      receiverWalletId: result.payment.receiver_wallet,
      legId: leg.id,
    },
  };
  return draft;
}

/**
 * Called by the confirm sheet after a successful broadcast. No-op for other
 * payment types; for SPLIT_BILL drafts it verifies the ledger row server-side
 * and flips the caller's leg to PAID (the split auto-settles when the last
 * leg pays).
 */
export async function confirmSplitLegPaid(draft: PaymentDraft): Promise<void> {
  if (draft.type !== 'SPLIT_BILL' || !draft.referenceId) return;
  await confirmSplitPayment(draft.referenceId);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Maps stable RPC error prefixes to friendly copy. */
export function friendlySplitError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught);
  if (message.includes('UNAUTHENTICATED')) return 'Please sign in again to continue.';
  if (message.includes('FORBIDDEN')) return 'This split request belongs to a different account.';
  if (message.includes('NOT_FOUND')) return 'This split request is no longer available.';
  if (message.includes('VALIDATION_ERROR')) {
    return message.split('VALIDATION_ERROR:')[1]?.trim() ?? 'Please double-check the amounts.';
  }
  if (message.includes('CONFLICT')) {
    return message.split('CONFLICT:')[1]?.trim() ?? 'This split was already settled or cancelled.';
  }
  return 'Something went wrong. Please try again.';
}
