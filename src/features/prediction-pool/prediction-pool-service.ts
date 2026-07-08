/**
 * Prediction pools on live Supabase data.
 *
 * Replaces the dummy PREDICTION_POOLS module. Reads go through the pools
 * repository; entries go through the atomic enter_pool RPC (pick stored
 * server-side, entry fee paid through the standard payment pipeline to the
 * treasury wallet); results go through simulate_pool_result, which settles
 * the ledger server-side. Winning clients then record a WDK-signed payout
 * proof mirroring the treasury ledger payout.
 */

import { supabase } from '@/services/supabase/client';
import {
  createPool as createPoolRpc,
  enterPool,
  getMyPrediction,
  getPool,
  listMyPredictions,
  listOpenPools,
  simulatePoolResult,
  type Prediction,
  type PredictionPool as PredictionPoolRow,
} from '@/services/supabase/repositories/predictionPools';
import { resolveRecipient } from '@/services/supabase/repositories/wallets';
import type { DemoRewardDraft, PaymentDraft, WalletTransaction } from '@/services/wdk';

import { demoPoolBoard, demoPoolDetail, isDemoModeActive } from '@/features/demo';

export type PoolTeam = {
  id: string;
  name: string;
  shortName: string;
};

export type PredictionPoolView = {
  id: string;
  match: string;
  competition: string;
  kickoffAt: string;
  closesAt: string;
  entryFee: string;
  prizePool: string;
  poolWallet: string;
  status: 'OPEN' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  winnerTeam: string | null;
  entries: number;
  teams: [PoolTeam, PoolTeam];
};

export type PoolDetailData = {
  pool: PredictionPoolView;
  myPrediction: Prediction | null;
};

export type SimulatePoolOutcome = {
  winnerTeam: string | null;
  payoutPerWinner: string;
  didWin: boolean;
};

export type CreatePoolInput = {
  matchName: string;
  teamA: string;
  teamB: string;
  entryFee: string;
  closesAt: string;
  matchId?: string | null;
  watchPartyId?: string | null;
};

type MatchRow = {
  id: string;
  kickoff_at: string;
  status: string;
};

// ---------------------------------------------------------------------------
// View building
// ---------------------------------------------------------------------------

function teamShortName(name: string) {
  const compact = name.replace(/[^A-Za-z0-9]/g, '');
  return (compact || name).slice(0, 3).toUpperCase();
}

function toTeam(name: string): PoolTeam {
  return { id: name, name, shortName: teamShortName(name) };
}

export function getTeam(pool: PredictionPoolView, teamId: string | null | undefined) {
  return pool.teams.find((team) => team.id === teamId) ?? null;
}

/**
 * Individual picks are hidden by RLS while the pool is OPEN, so the entry
 * count is derived from the denormalized prize pool (accrued per entry).
 */
function entriesCount(row: PredictionPoolRow) {
  const fee = Number.parseFloat(row.entry_fee);
  const prize = Number.parseFloat(row.prize_pool);
  if (!Number.isFinite(fee) || fee <= 0 || !Number.isFinite(prize)) return 0;
  return Math.max(0, Math.round(prize / fee));
}

function toView(
  row: PredictionPoolRow,
  match: MatchRow | null,
  treasury: string,
): PredictionPoolView {
  return {
    id: row.id,
    match: row.match_name,
    competition: match?.status === 'LIVE' ? 'Live now' : 'Matchday pool',
    kickoffAt: match?.kickoff_at ?? row.closes_at,
    closesAt: row.closes_at,
    entryFee: row.entry_fee,
    prizePool: row.prize_pool,
    poolWallet: treasury,
    status: row.status as PredictionPoolView['status'],
    winnerTeam: row.winner_team,
    entries: entriesCount(row),
    teams: [toTeam(row.team_a), toTeam(row.team_b)],
  };
}

let cachedTreasury: string | null = null;

/** Escrow stand-in address that receives entry fees (see treasury_wallet()). */
async function treasuryAddress(): Promise<string> {
  if (cachedTreasury !== null) return cachedTreasury;
  try {
    const recipient = await resolveRecipient('elevenpay_treasury');
    cachedTreasury = recipient?.wallet_address ?? '';
  } catch {
    cachedTreasury = '';
  }
  return cachedTreasury;
}

async function loadMatches(ids: string[]): Promise<Map<string, MatchRow>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from('matches')
    .select('id, kickoff_at, status')
    .in('id', ids);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row as MatchRow]));
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listPools(): Promise<{
  pools: PredictionPoolView[];
  joinedPoolIds: Set<string>;
}> {
  // Demo mode: fixture pools only - no Supabase reads.
  if (isDemoModeActive()) return demoPoolBoard();

  const [rows, treasury] = await Promise.all([listOpenPools(25), treasuryAddress()]);
  const matchIds = rows.map((row) => row.match_id).filter((id): id is string => Boolean(id));
  const matches = await loadMatches(matchIds);

  const joinedPoolIds = new Set<string>();
  const { data: auth } = await supabase.auth.getSession();
  if (auth.session) {
    const mine = await listMyPredictions(100);
    for (const prediction of mine) joinedPoolIds.add(prediction.pool_id);
  }

  return {
    pools: rows.map((row) =>
      toView(row, row.match_id ? (matches.get(row.match_id) ?? null) : null, treasury),
    ),
    joinedPoolIds,
  };
}

export async function getPoolDetail(id: string): Promise<PoolDetailData | null> {
  if (isDemoModeActive()) return demoPoolDetail(id);

  const row = await getPool(id);
  if (!row) return null;
  const [treasury, matches, myPrediction] = await Promise.all([
    treasuryAddress(),
    loadMatches(row.match_id ? [row.match_id] : []),
    getMyPrediction(id).catch(() => null),
  ]);
  return {
    pool: toView(row, row.match_id ? (matches.get(row.match_id) ?? null) : null, treasury),
    myPrediction,
  };
}

// ---------------------------------------------------------------------------
// Join pool + entry payment
// ---------------------------------------------------------------------------

/**
 * Stores the pick server-side via the atomic enter_pool RPC (one final pick
 * per user, server-clock close enforcement), then returns the entry-fee
 * PaymentDraft for the standard confirm sheet (ledger PENDING -> WDK sign ->
 * BROADCAST). metadata.receiverWalletId links the ledger row to the treasury.
 */
export async function beginEnterPool(
  pool: PredictionPoolView,
  pick: PoolTeam,
): Promise<PaymentDraft> {
  if (isDemoModeActive()) {
    throw new Error(
      'DEMO: This pool is sample data. Use the payout button on the Demo screen to see winnings - no real entry needed.',
    );
  }

  const to = pool.poolWallet || (await treasuryAddress());
  if (!to) {
    throw new Error('The pool treasury wallet is not available yet. Try again shortly.');
  }
  const result = await enterPool(pool.id, pick.id);
  return {
    to,
    amount: result.payment.amount,
    type: 'POOL_ENTRY',
    referenceId: pool.id,
    memo: `Prediction pool entry: ${pool.match}, pick ${pick.name}`,
    metadata: {
      pick: pick.id,
      pickName: pick.name,
      match: pool.match,
      receiverWalletId: result.payment.receiver_wallet,
    },
  };
}

// ---------------------------------------------------------------------------
// Pool creation
// ---------------------------------------------------------------------------

/**
 * Opens a new pool via the create_pool RPC. There is no dedicated screen in
 * the current UI; seeded pools and service-created pools share this path.
 */
export async function createPool(input: CreatePoolInput): Promise<string> {
  const result = await createPoolRpc(input);
  return result.pool_id;
}

// ---------------------------------------------------------------------------
// Result simulation + winnings distribution
// ---------------------------------------------------------------------------

/**
 * Resolves the pool server-side (simulate_pool_result RPC): picks a winner,
 * marks winning predictions, mints POOL_REWARD ledger rows from the treasury,
 * and credits winner balances atomically.
 */
export async function simulatePool(poolId: string): Promise<SimulatePoolOutcome> {
  if (isDemoModeActive()) {
    throw new Error(
      'DEMO: Use the payout button on the Demo screen to run the sample payout.',
    );
  }

  const payload = await simulatePoolResult(poolId);
  return {
    winnerTeam: payload.winner_team ?? null,
    payoutPerWinner: payload.payout_per_winner ?? '0.000000',
    didWin: Boolean(payload.did_win),
  };
}

/** WDK-signed local payout proof mirroring the server treasury payout. */
export function buildPoolRewardDraft(
  pool: PredictionPoolView,
  winner: PoolTeam,
  rewardAmount: string,
): DemoRewardDraft {
  return {
    amount: rewardAmount,
    type: 'POOL_REWARD',
    referenceId: pool.id,
    counterparty: pool.poolWallet,
    memo: `Demo reward for ${pool.match}: ${winner.name}`,
    metadata: { winner: winner.id, winnerName: winner.name, match: pool.match },
  };
}

// ---------------------------------------------------------------------------
// WDK wallet-history lookups (unchanged behavior from the dummy module)
// ---------------------------------------------------------------------------

export function poolEntryTransaction(transactions: WalletTransaction[], poolId: string) {
  return transactions.find(
    (transaction) =>
      transaction.type === 'POOL_ENTRY' &&
      transaction.referenceId === poolId &&
      transaction.status === 'BROADCAST',
  );
}

export function poolRewardTransaction(transactions: WalletTransaction[], poolId: string) {
  return transactions.find(
    (transaction) =>
      transaction.type === 'POOL_REWARD' &&
      transaction.referenceId === poolId &&
      transaction.status === 'BROADCAST',
  );
}

// ---------------------------------------------------------------------------
// Formatting + errors
// ---------------------------------------------------------------------------

export function formatPoolDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function countdownLabel(targetIso: string, now = new Date()) {
  const ms = new Date(targetIso).getTime() - now.getTime();
  if (ms <= 0) return 'Closed';

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function friendlyPoolError(error: unknown): string {
  const demoText = caught instanceof Error ? caught.message : String(caught ?? '');
  if (demoText.startsWith('DEMO:')) return demoText.slice(5).trim();
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('ALREADY_EXISTS')) {
    return 'You already have a pick in this pool. Picks are final.';
  }
  if (message.includes('POOL_CLOSED')) return 'Entries are closed for this pool.';
  if (message.includes('UNAUTHENTICATED')) return 'Sign in again to continue.';
  if (message.includes('NOT_FOUND')) return 'This prediction pool is no longer available.';
  if (message.includes('CONFLICT')) return 'This pool has already been resolved.';
  if (message.includes('VALIDATION_ERROR')) return 'That entry is not valid for this pool.';
  if (message.includes('treasury wallet')) return message;
  return 'Something went wrong. Please try again.';
}
