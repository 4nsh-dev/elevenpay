/**
 * Demo mode — a self-contained sandbox of ElevenPay.
 *
 * Entering demo seeds fixture data into the demo store and mirrors it into
 * the UI stores; the data layers (wallet, watch parties, pools, ledger,
 * copilot) short-circuit to these fixtures while the flag is on.
 *
 * No production impact, by construction:
 * - No Supabase reads or writes happen from any demo-guarded path.
 * - WDK custody is never touched: no keys, no signing, no device history.
 * - Payments are disabled: party joins are local, pool entries and copilot
 *   transfer/split drafts refuse with a demo message.
 * - Demo state lives in memory only; exiting (or restarting the app) ends it
 *   and the real wallet is re-hydrated untouched.
 */

import type { PoolDetailData, PredictionPoolView } from '@/features/prediction-pool';
import type { WatchPartyDetail, WatchPartyView } from '@/features/watch-party';
import type { Transaction } from '@/services/supabase/repositories/transactions';
import { useDemoStore, type DemoSnapshot } from '@/stores/demo';
import { useTransactionsStore, type LedgerEntry } from '@/stores/transactions';
import { useWalletStore } from '@/stores/wallet';

import {
  buildDemoSnapshot,
  DEMO_PAYOUT_AMOUNT,
  DEMO_POOL_WINNER,
  DEMO_TREASURY_WALLET_ID,
  DEMO_WALLET_ID,
} from './fixtures';

export { DEMO_PAYOUT_AMOUNT, DEMO_WALLET_ADDRESS, DEMO_WALLET_ID } from './fixtures';

export function isDemoModeActive(): boolean {
  return useDemoStore.getState().isDemoMode;
}

function requireSnapshot(): DemoSnapshot {
  const snapshot = useDemoStore.getState().snapshot;
  if (!snapshot) throw new Error('Demo mode is not active.');
  return snapshot;
}

const TYPE_TITLES: Record<string, string> = {
  SEND: 'Transfer',
  SPLIT_BILL: 'Split bill',
  WATCH_PARTY: 'Watch party entry',
  POOL_ENTRY: 'Pool entry',
  POOL_REWARD: 'Pool payout',
  TIP: 'Tip',
};

function toLedgerEntry(row: Transaction): LedgerEntry {
  const direction: 'in' | 'out' = row.sender_wallet === DEMO_WALLET_ID ? 'out' : 'in';
  return {
    id: row.id,
    title: TYPE_TITLES[row.type] ?? row.type,
    subtitle: row.memo ?? undefined,
    amount: row.amount,
    direction,
    type: row.type,
    status: row.status,
    timestamp: row.created_at,
    fee: row.fee,
    hash: row.transaction_hash ?? undefined,
    memo: row.memo ?? undefined,
    referenceId: row.reference_id,
    idempotencyKey: row.idempotency_key,
  };
}

/** Mirrors the demo snapshot into the UI stores (wallet + ledger). */
export function applyDemoStateToStores(): void {
  const snapshot = requireSnapshot();
  const wallet = useWalletStore.getState();
  wallet.setWallet({ address: snapshot.walletAddress, blockchain: 'demo-sandbox' });
  wallet.setBalance(snapshot.balance);
  wallet.setWalletError(null);
  wallet.setWalletLoading(false);
  const ledger = useTransactionsStore.getState();
  ledger.setLedger(snapshot.ledger.map(toLedgerEntry));
  ledger.setOutboxCount(0);
}

export function enterDemoMode(): void {
  useDemoStore.getState().seed(buildDemoSnapshot());
  applyDemoStateToStores();
}

/** One-click reset: rebuild the pristine fixtures and re-apply them. */
export function resetDemoMode(): void {
  enterDemoMode();
}

/**
 * Leaves demo mode and clears demo data out of the UI stores. The caller
 * re-hydrates the real wallet afterwards (demo never modified it).
 */
export function exitDemoMode(): void {
  useDemoStore.getState().clear();
  useWalletStore.getState().clearWallet();
  useTransactionsStore.getState().clearLedger();
}

// ---------------------------------------------------------------------------
// Data served to the guarded production code paths
// ---------------------------------------------------------------------------

export function demoPartyBoard(): { parties: WatchPartyView[]; joinedPartyIds: string[] } {
  const snapshot = requireSnapshot();
  return { parties: snapshot.parties, joinedPartyIds: [...snapshot.joinedPartyIds] };
}

export function demoPartyDetail(id: string): WatchPartyDetail | null {
  const snapshot = requireSnapshot();
  const party = snapshot.parties.find((entry) => entry.id === id);
  if (!party) return null;
  return {
    party,
    membership: null,
    isJoined: snapshot.joinedPartyIds.includes(id),
    hasReservation: false,
  };
}

/** Demo join: the seat is confirmed locally — no RPC, no payment, no writes. */
export function demoJoinParty(id: string): void {
  const snapshot = requireSnapshot();
  if (snapshot.joinedPartyIds.includes(id)) return;
  useDemoStore.getState().patchSnapshot({
    joinedPartyIds: [...snapshot.joinedPartyIds, id],
    parties: snapshot.parties.map((party) =>
      party.id === id
        ? {
            ...party,
            seatsTaken: party.seatsTaken + 1,
            seatsLeft: Math.max(0, party.seatsLeft - 1),
          }
        : party,
    ),
  });
}

export function demoPoolBoard(): { pools: PredictionPoolView[]; joinedPoolIds: Set<string> } {
  const snapshot = requireSnapshot();
  return { pools: snapshot.pools, joinedPoolIds: new Set<string>() };
}

export function demoPoolDetail(id: string): PoolDetailData | null {
  const snapshot = requireSnapshot();
  const pool = snapshot.pools.find((entry) => entry.id === id);
  return pool ? { pool, myPrediction: null } : null;
}

/** Ledger rows in the Supabase repository shape (for the copilot tools). */
export function demoLedgerRows(): Transaction[] {
  return [...requireSnapshot().ledger];
}

/** Ledger rows in the transactions-store shape (for loadLedger). */
export function demoLedgerEntries(): LedgerEntry[] {
  return requireSnapshot().ledger.map(toLedgerEntry);
}

export function demoWalletId(): string {
  return DEMO_WALLET_ID;
}

export function demoBalance(): string {
  return requireSnapshot().balance;
}

// ---------------------------------------------------------------------------
// Payout demo
// ---------------------------------------------------------------------------

export type DemoPayoutOutcome = {
  match: string;
  winnerTeam: string;
  amount: string;
  alreadyPaid: boolean;
};

function addUsdt(a: string, b: string): string {
  const toMicro = (value: string): bigint => {
    const [whole, frac = ''] = value.split('.');
    return BigInt(whole || '0') * 1000000n + BigInt((frac + '000000').slice(0, 6));
  };
  const total = toMicro(a) + toMicro(b);
  const whole = total / 1000000n;
  const frac = (total % 1000000n).toString().padStart(6, '0');
  return `${whole.toString()}.${frac}`;
}

/**
 * Settles the featured demo pool: marks the winner, appends a POOL_REWARD
 * row to the demo ledger, and credits the demo balance. Pure in-memory store
 * mutation — no Supabase, no WDK, no persistence.
 */
export function runDemoPayout(): DemoPayoutOutcome {
  const store = useDemoStore.getState();
  const snapshot = requireSnapshot();
  const pool = snapshot.pools[0];

  if (store.payoutDone) {
    return {
      match: pool.match,
      winnerTeam: pool.winnerTeam ?? DEMO_POOL_WINNER,
      amount: DEMO_PAYOUT_AMOUNT,
      alreadyPaid: true,
    };
  }

  const now = new Date().toISOString();
  const reward: Transaction = {
    id: 'demo-tx-payout',
    sender_wallet: DEMO_TREASURY_WALLET_ID,
    receiver_wallet: DEMO_WALLET_ID,
    amount: DEMO_PAYOUT_AMOUNT,
    fee: '0.000000',
    currency: 'USDT',
    transaction_hash: '0xde10000000000000000000000000000000000000000000000000000000fee1',
    type: 'POOL_REWARD',
    status: 'SUCCESS',
    reference_id: pool.id,
    idempotency_key: 'demo-idem-payout',
    memo: `Pool payout: ${pool.match} — ${DEMO_POOL_WINNER} won`,
    created_at: now,
    confirmed_at: now,
  };

  useDemoStore.getState().patchSnapshot({
    balance: addUsdt(snapshot.balance, DEMO_PAYOUT_AMOUNT),
    ledger: [reward, ...snapshot.ledger],
    pools: snapshot.pools.map((entry) =>
      entry.id === pool.id
        ? { ...entry, status: 'FINISHED' as const, winnerTeam: DEMO_POOL_WINNER }
        : entry,
    ),
  });
  useDemoStore.getState().setPayoutDone(true);
  applyDemoStateToStores();

  return {
    match: pool.match,
    winnerTeam: DEMO_POOL_WINNER,
    amount: DEMO_PAYOUT_AMOUNT,
    alreadyPaid: false,
  };
}
