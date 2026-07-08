import { RESERVATION_WINDOW_MINUTES } from '@/lib/constants';
import { supabase } from '@/services/supabase/client';
import {
  getMyMembership,
  getWatchParty as getWatchPartyRow,
  joinParty as joinPartyRpc,
  listPartyAttendees,
  listUpcomingParties,
  type PartyAttendance,
  type WatchParty as WatchPartyRow,
  type WatchPartyMember,
} from '@/services/supabase/repositories/watchParties';
import { resolveRecipient } from '@/services/supabase/repositories/wallets';
import type { PaymentDraft } from '@/services/wdk';

import {
  demoJoinParty,
  demoPartyBoard,
  demoPartyDetail,
  isDemoModeActive,
} from '@/features/demo';

/** Participant entry rendered in the party detail list. */
export type WatchPartyParticipant = {
  id: string;
  name: string;
  team: string;
  status: 'PAID' | 'RESERVED';
};

/**
 * UI model for a watch party, hydrated from Supabase
 * (`watch_parties` + `party_attendance` + `party_attendee_previews`).
 * Field names intentionally match the old dummy model so the screens keep
 * their existing layout.
 */
export type WatchPartyView = {
  id: string;
  title: string;
  match: string;
  competition: string;
  kickoffAt: string;
  venue: string;
  city: string;
  /** Organizer display name (public profile). */
  host: string;
  /** Organizer wallet address resolved via the `resolve_wallet` RPC; empty when not linked. */
  hostWallet: string;
  entryFee: string;
  capacity: number;
  seatsTaken: number;
  seatsLeft: number;
  status: string;
  organizerId: string;
  cover: string;
  perks: string[];
  participants: WatchPartyParticipant[];
};

export type WatchPartyDetail = {
  party: WatchPartyView;
  membership: WatchPartyMember | null;
  /** Entry fee settled - seat locked in (`payment_status = 'PAID'`). */
  isJoined: boolean;
  /** Active seat hold awaiting payment (`payment_status = 'RESERVED'`, not expired). */
  hasReservation: boolean;
};

export type JoinOutcome =
  | { kind: 'joined' }
  | { kind: 'payment-required'; draft: PaymentDraft };

type MatchRow = { id: string; team_a: string; team_b: string; status: string };

function isActiveReservation(membership: WatchPartyMember | null): boolean {
  if (!membership || membership.payment_status !== 'RESERVED') return false;
  if (!membership.reserved_until) return true;
  return new Date(membership.reserved_until).getTime() > Date.now();
}

function derivePerks(row: WatchPartyRow): string[] {
  const isFree = Number(row.entry_fee) <= 0;
  return [
    `Reserved seat at ${row.venue}`,
    'Live big-screen coverage with the crew',
    isFree ? 'Free entry - just reserve your seat' : 'On-chain USDT entry receipt',
  ];
}

function toView(
  row: WatchPartyRow,
  attendance: PartyAttendance | null,
  match: MatchRow | null,
): WatchPartyView {
  const seatsTaken = attendance?.seats_taken ?? 0;
  const seatsLeft = attendance?.seats_left ?? Math.max(0, row.max_participants - seatsTaken);

  return {
    id: row.id,
    title: row.title,
    match: row.match_name ?? (match ? `${match.team_a} vs ${match.team_b}` : row.title),
    competition: match?.status === 'LIVE' ? 'Live now' : 'Matchday',
    kickoffAt: row.event_date,
    venue: row.venue,
    city: row.city,
    host: 'the host',
    hostWallet: '',
    entryFee: row.entry_fee,
    capacity: row.max_participants,
    seatsTaken,
    seatsLeft,
    status: row.status,
    organizerId: row.organizer_id,
    cover: `Hosted screening at ${row.venue}, ${row.city}. Seats are confirmed with a USDT entry fee signed through WDK.`,
    perks: derivePerks(row),
    participants: [],
  };
}

/** Load upcoming parties plus which of them the signed-in user already paid for. */
export async function listParties(): Promise<{
  parties: WatchPartyView[];
  joinedPartyIds: string[];
}> {
  // Demo mode: fixture parties only - no Supabase reads.
  if (isDemoModeActive()) return demoPartyBoard();

  const rows = await listUpcomingParties({ limit: 50 });
  if (rows.length === 0) return { parties: [], joinedPartyIds: [] };

  const ids = rows.map((row) => row.id);
  const matchIds = rows
    .map((row) => row.match_id)
    .filter((value): value is string => Boolean(value));

  const [attendanceResult, matchesResult, sessionResult] = await Promise.all([
    supabase.from('party_attendance').select('*').in('watch_party_id', ids),
    matchIds.length > 0
      ? supabase.from('matches').select('id, team_a, team_b, status').in('id', matchIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.auth.getSession(),
  ]);

  const attendanceByParty = new Map<string, PartyAttendance>();
  for (const entry of (attendanceResult.data ?? []) as PartyAttendance[]) {
    if (entry.watch_party_id) attendanceByParty.set(entry.watch_party_id, entry);
  }

  const matchById = new Map<string, MatchRow>();
  for (const entry of (matchesResult.data ?? []) as MatchRow[]) {
    matchById.set(entry.id, entry);
  }

  let joinedPartyIds: string[] = [];
  const userId = sessionResult.data.session?.user.id;
  if (userId) {
    const { data: memberships } = await supabase
      .from('watch_party_members')
      .select('watch_party_id, payment_status')
      .eq('user_id', userId)
      .in('watch_party_id', ids);
    joinedPartyIds = (memberships ?? [])
      .filter((membership) => membership.payment_status === 'PAID')
      .map((membership) => membership.watch_party_id);
  }

  return {
    parties: rows.map((row) =>
      toView(
        row,
        attendanceByParty.get(row.id) ?? null,
        row.match_id ? (matchById.get(row.match_id) ?? null) : null,
      ),
    ),
    joinedPartyIds,
  };
}

/** Load one party with live attendance, attendee previews, host info, and my membership. */
export async function getPartyDetail(id: string): Promise<WatchPartyDetail | null> {
  if (isDemoModeActive()) return demoPartyDetail(id);

  const row = await getWatchPartyRow(id);
  if (!row) return null;

  const [attendanceResult, attendees, membership, matchResult, organizerResult] =
    await Promise.all([
      supabase.from('party_attendance').select('*').eq('watch_party_id', id).maybeSingle(),
      listPartyAttendees(id, 12).catch(() => []),
      getMyMembership(id).catch(() => null),
      row.match_id
        ? supabase
            .from('matches')
            .select('id, team_a, team_b, status')
            .eq('id', row.match_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('public_profiles')
        .select('id, username, full_name')
        .eq('id', row.organizer_id)
        .maybeSingle(),
    ]);

  const party = toView(
    row,
    (attendanceResult.data as PartyAttendance | null) ?? null,
    (matchResult.data as MatchRow | null) ?? null,
  );

  const organizer = organizerResult.data as {
    id: string;
    username: string | null;
    full_name: string | null;
  } | null;
  if (organizer) {
    party.host = organizer.full_name ?? (organizer.username ? `@${organizer.username}` : 'the host');
    if (organizer.username) {
      try {
        const resolved = await resolveRecipient(organizer.username);
        party.hostWallet = resolved.wallet_address;
      } catch {
        party.hostWallet = '';
      }
    }
  }

  const isJoined = membership?.payment_status === 'PAID';
  const hasReservation = isActiveReservation(membership);

  party.participants = (attendees ?? [])
    .filter((attendee) => !membership || attendee.user_id !== membership.user_id)
    .map((attendee, index) => ({
      id: attendee.user_id ?? `attendee-${index}`,
      name: attendee.full_name ?? (attendee.username ? `@${attendee.username}` : 'Fan'),
      team: attendee.username ? `@${attendee.username}` : 'ElevenPay',
      // The public preview intentionally hides RESERVED vs PAID; everyone shown holds a seat.
      status: 'PAID' as const,
    }));

  return { party, membership, isJoined, hasReservation };
}

function buildEntryFeeDraft(party: WatchPartyView, receiverWalletId: string | null): PaymentDraft {
  if (!party.hostWallet) {
    throw new Error('The host has not linked a wallet yet, so paid entry is unavailable right now.');
  }
  const draft: PaymentDraft = {
    to: party.hostWallet,
    amount: party.entryFee,
    type: 'WATCH_PARTY',
    referenceId: party.id,
    memo: `Entry fee for ${party.match}`,
  };
  if (receiverWalletId) draft.metadata = { receiverWalletId };
  return draft;
}

/**
 * Reserve a seat through the atomic `join_party` RPC and, for paid parties,
 * produce the payment draft for the shared confirm sheet.
 *
 * - Capacity is enforced server-side (`PARTY_FULL`), so two users cannot race
 *   past the seat limit.
 * - Duplicate joins are blocked by the `unique (watch_party_id, user_id)`
 *   constraint plus `ALREADY_EXISTS` from the RPC; an active RESERVED hold is
 *   resumed locally instead of re-calling the RPC.
 */
export async function beginJoinParty(detail: WatchPartyDetail): Promise<JoinOutcome> {
  const { party } = detail;

  // Demo mode: confirm the seat locally - no RPC, no payment, no writes.
  if (isDemoModeActive()) {
    demoJoinParty(party.id);
    return { kind: 'joined' };
  }

  if (detail.isJoined) {
    throw new Error('ALREADY_EXISTS: you already have a seat at this party');
  }

  if (detail.hasReservation) {
    // Seat is already held for us - go straight to payment.
    return { kind: 'payment-required', draft: buildEntryFeeDraft(party, null) };
  }

  const result = await joinPartyRpc(party.id);
  if (!result.payment) return { kind: 'joined' };
  return {
    kind: 'payment-required',
    draft: buildEntryFeeDraft(party, result.payment.receiver_wallet),
  };
}

/** Map RPC / network errors to copy that is safe to show in the UI. */
export function friendlyJoinError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught ?? '');
  if (message.includes('ALREADY_EXISTS')) return 'You already have a seat at this party.';
  if (message.includes('PARTY_FULL')) return 'This party is full - no seats left.';
  if (message.includes('CONFLICT')) return 'This party is not open for new joins.';
  if (message.includes('UNAUTHENTICATED')) return 'Sign in to join a watch party.';
  if (message.includes('NOT_FOUND')) return 'This watch party no longer exists.';
  if (message.includes('host has not linked')) return message;
  return 'Could not join the party. Check your connection and try again.';
}

export function formatPartyTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function reservationLabel() {
  return `${RESERVATION_WINDOW_MINUTES}-minute reservation`;
}

/**
 * After the confirm sheet broadcasts a WATCH_PARTY entry fee, link the ledger
 * row to the seat: the `confirm_party_payment` RPC verifies the transaction
 * server-side and flips the membership RESERVED -> PAID. Non-fatal on
 * failure - the payment is already stored and can be confirmed later.
 */
export async function confirmWatchPartySeat(draft: PaymentDraft): Promise<void> {
  if (draft.type !== 'WATCH_PARTY' || !draft.referenceId) return;
  try {
    const { error } = await supabase.rpc('confirm_party_payment', {
      p_party_id: draft.referenceId,
    });
    if (error) throw new Error(error.message);
  } catch (caught) {
    if (__DEV__) {
      console.warn('[watch-party] could not confirm seat payment yet:', caught);
    }
  }
}
