/**
 * Persistent transaction storage.
 *
 * The durable ledger is `public.transactions` in Supabase. The device
 * SecureStore history (src/services/wdk) remains a fast local cache; this
 * layer makes transactions survive reinstalls and appear across devices:
 *
 *  - OUTGOING: a PENDING intent row is saved BEFORE signing (idempotency-
 *    keyed), then flipped to BROADCAST with the on-chain hash after WDK
 *    broadcasts — or to FAILED if signing/broadcast fails.
 *  - INCOMING: received sends, faucet drips, and pool rewards are written
 *    server-side (RLS: clients cannot forge incoming rows); `loadLedger`
 *    pulls them into the transactions store.
 *  - RETRY: writes that fail on connectivity are queued in an AsyncStorage
 *    outbox and replayed on the next ledger load / app start. The
 *    idempotency key guarantees a replayed create can never double-pay.
 *  - Loading + error state live in stores/transactions.ts.
 *
 * SUCCESS confirmation stays server-side (submit-tx edge function) — the
 * client can never claim a payment succeeded.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ensureWalletRegistered } from '@/features/wallet/wallet-sync';
import { supabase } from '@/services/supabase/client';
import {
  createPendingTransaction,
  listMyTransactions,
  type CreatePendingInput,
  type Transaction,
} from '@/services/supabase/repositories/transactions';
import { getMyWallet } from '@/services/supabase/repositories/wallets';
import { wdkService, type PreparedTransfer } from '@/services/wdk';
import { demoLedgerEntries, isDemoModeActive } from '@/features/demo';
import { useTransactionsStore, type LedgerEntry } from '@/stores/transactions';
import type { TransactionType } from '@/lib/constants';

const OUTBOX_KEY = 'elevenpay.transactions.outbox';
const LEDGER_PAGE_SIZE = 50;

export type SavePendingResult = {
  /** Supabase row id, or null when the create was queued for retry. */
  ledgerId: string | null;
  idempotencyKey: string;
  queued: boolean;
};

type OutboxOp =
  | { kind: 'create'; at: string; payload: CreatePendingInput }
  | { kind: 'mark-broadcast'; at: string; idempotencyKey: string; hash: string }
  | { kind: 'mark-failed'; at: string; idempotencyKey: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function newIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

  // UUID-v4-shaped fallback for runtimes without crypto.randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isRetryableError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('abort') ||
    message.includes('offline')
  );
}

function friendlyLedgerError(error: unknown): string {
  if (isRetryableError(error)) {
    return 'Network error. Your transactions will sync when you are back online.';
  }
  return 'Could not load your transaction history. Please try again.';
}

// ---------------------------------------------------------------------------
// Outbox (AsyncStorage) — retry queue for writes dropped by connectivity
// ---------------------------------------------------------------------------

async function readOutbox(): Promise<OutboxOp[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(ops: OutboxOp[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
  useTransactionsStore.getState().setOutboxCount(ops.length);
}

async function enqueue(op: OutboxOp): Promise<void> {
  const ops = await readOutbox();
  ops.push(op);
  await writeOutbox(ops);
}

async function applyOp(op: OutboxOp): Promise<void> {
  if (op.kind === 'create') {
    try {
      await createPendingTransaction(op.payload);
    } catch (error) {
      // Replayed create already landed earlier — idempotency key makes
      // the duplicate harmless.
      if ((error as { code?: string } | null)?.code === '23505') return;
      throw error;
    }
    return;
  }

  const patch =
    op.kind === 'mark-broadcast'
      ? { status: 'BROADCAST' as const, transaction_hash: op.hash }
      : { status: 'FAILED' as const };

  const { data, error } = await supabase
    .from('transactions')
    .update(patch)
    .eq('idempotency_key', op.idempotencyKey)
    .eq('status', 'PENDING')
    .select('id');

  if (error) throw error;
  // Zero rows: either the PENDING create is still queued ahead of us (it will
  // land first — ops replay in order) or the server already advanced the row.
  if (!data?.length) {
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('idempotency_key', op.idempotencyKey)
      .maybeSingle();
    if (!existing) throw new Error('Pending transaction row not found yet (network).');
  }
}

/**
 * Replays queued writes in order. Safe to call any time; keeps ops that are
 * still failing and drops ops that succeed or become permanent errors.
 */
export async function flushTransactionOutbox(): Promise<void> {
  const ops = await readOutbox();
  if (!ops.length) return;

  const remaining: OutboxOp[] = [];
  for (const op of ops) {
    try {
      await applyOp(op);
    } catch (error) {
      if (isRetryableError(error) || remaining.length > 0) {
        // Keep retrying later; also preserve order behind an earlier failure.
        remaining.push(op);
      } else {
        // Permanent rejection (e.g. RLS) — drop it and log, never loop forever.
        console.warn('[payments] Dropping unreplayable ledger write:', error);
      }
    }
  }

  await writeOutbox(remaining);
}

// ---------------------------------------------------------------------------
// Outgoing: save → broadcast → record status + hash
// ---------------------------------------------------------------------------

/**
 * Step 1: persist the PENDING intent. If Supabase is unreachable the create
 * is queued in the outbox (same idempotency key — replay cannot double-pay).
 */
export async function savePendingTransaction(
  input: Omit<CreatePendingInput, 'idempotency_key'> & { idempotency_key?: string },
): Promise<SavePendingResult> {
  const idempotencyKey = input.idempotency_key ?? newIdempotencyKey();
  const payload: CreatePendingInput = { ...input, idempotency_key: idempotencyKey };

  try {
    const tx = await createPendingTransaction(payload);
    return { ledgerId: tx.id, idempotencyKey, queued: false };
  } catch (error) {
    if (isRetryableError(error)) {
      await enqueue({ kind: 'create', at: new Date().toISOString(), payload });
      return { ledgerId: null, idempotencyKey, queued: true };
    }
    throw error;
  }
}

/** Step 2a: record the on-chain hash after WDK broadcasts. */
export async function markTransactionBroadcast(
  idempotencyKey: string,
  hash: string,
): Promise<void> {
  const op: OutboxOp = {
    kind: 'mark-broadcast',
    at: new Date().toISOString(),
    idempotencyKey,
    hash,
  };
  try {
    await applyOp(op);
  } catch (error) {
    await enqueue(op);
    console.warn('[payments] Broadcast status queued for retry:', error);
  }
}

/** Step 2b: record a client-side failure (signing rejected, broadcast error). */
export async function markTransactionFailed(idempotencyKey: string): Promise<void> {
  const op: OutboxOp = { kind: 'mark-failed', at: new Date().toISOString(), idempotencyKey };
  try {
    await applyOp(op);
  } catch (error) {
    await enqueue(op);
    console.warn('[payments] Failed status queued for retry:', error);
  }
}

async function requireSenderWalletId(ownerId?: string | null): Promise<string> {
  const existing = await getMyWallet();
  if (existing) return existing.id;

  // Wallet not mirrored into Supabase yet — register it now (metadata only).
  const address = await wdkService.getAddress(ownerId);
  const result = await ensureWalletRegistered({ address, blockchain: 'ethereum-sepolia' });
  if (result.status === 'registered' || result.status === 'already-registered') {
    return result.walletId;
  }
  throw new Error('Your wallet is not linked to this account yet.');
}

const CLIENT_TYPES = ['SEND', 'WATCH_PARTY', 'POOL_ENTRY', 'SPLIT_BILL', 'TIP'] as const;
type ClientTransactionType = (typeof CLIENT_TYPES)[number];

function normalizeType(type: string): ClientTransactionType {
  return (CLIENT_TYPES as readonly string[]).includes(type)
    ? (type as ClientTransactionType)
    : 'SEND';
}

/**
 * Full persistent send pipeline: save PENDING → sign & broadcast (WDK) →
 * record BROADCAST + hash (or FAILED). Drop-in wrapper around
 * `wdkService.signAndBroadcast` for the confirm sheet — a retry after failure
 * simply calls this again (a fresh PENDING intent is created; the old one is
 * marked FAILED).
 */
export async function recordAndBroadcast(
  prepared: PreparedTransfer,
  options?: { ownerId?: string | null; receiverWalletId?: string | null },
): Promise<{ transactionHash: string; idempotencyKey: string }> {
  const senderWalletId = await requireSenderWalletId(options?.ownerId);

  const saved = await savePendingTransaction({
    sender_wallet: senderWalletId,
    receiver_wallet: options?.receiverWalletId ?? null,
    amount: prepared.draft.amount,
    type: normalizeType(prepared.draft.type),
    reference_id: prepared.draft.referenceId ?? null,
    memo: prepared.draft.memo ?? null,
  });

  try {
    const { transactionHash } = await wdkService.signAndBroadcast(prepared, options?.ownerId);
    await markTransactionBroadcast(saved.idempotencyKey, transactionHash);
    void loadLedger();
    return { transactionHash, idempotencyKey: saved.idempotencyKey };
  } catch (error) {
    await markTransactionFailed(saved.idempotencyKey);
    void loadLedger();
    throw error instanceof Error
      ? error
      : new Error('Payment could not be broadcast. You were not charged.');
  }
}

// ---------------------------------------------------------------------------
// Incoming + outgoing: load the persistent ledger
// ---------------------------------------------------------------------------

const TYPE_TITLES: Record<string, { in: string; out: string }> = {
  SEND: { in: 'Received', out: 'Sent' },
  WATCH_PARTY: { in: 'Watch party', out: 'Watch party' },
  POOL_ENTRY: { in: 'Pool entry', out: 'Pool entry' },
  POOL_REWARD: { in: 'Pool reward', out: 'Pool reward' },
  SPLIT_BILL: { in: 'Split bill', out: 'Split bill' },
  TIP: { in: 'Tip received', out: 'Tip sent' },
  FAUCET: { in: 'Demo faucet', out: 'Demo faucet' },
};

function toLedgerEntry(row: Transaction, myWalletId: string | null): LedgerEntry {
  const direction: 'in' | 'out' =
    row.sender_wallet !== null && row.sender_wallet === myWalletId ? 'out' : 'in';
  const titles = TYPE_TITLES[row.type] ?? { in: 'Received', out: 'Sent' };

  return {
    id: row.id,
    title: titles[direction],
    subtitle: row.memo ?? undefined,
    amount: row.amount,
    direction,
    type: row.type as TransactionType,
    status: row.status,
    timestamp: row.created_at ?? undefined,
    fee: row.fee,
    hash: row.transaction_hash ?? undefined,
    memo: row.memo ?? undefined,
    counterparty:
      (direction === 'out' ? row.receiver_wallet : row.sender_wallet) ?? 'ElevenPay',
    referenceId: row.reference_id,
    idempotencyKey: row.idempotency_key,
  };
}

/**
 * Loads the persistent ledger (incoming + outgoing, newest first) into the
 * transactions store, flushing the outbox first so just-made payments are
 * included. Loading and error state are exposed on the store. Never throws.
 */
export async function loadLedger(): Promise<void> {
  // Demo mode: the ledger shows fixtures; never query or mutate Supabase.
  if (isDemoModeActive()) {
    useTransactionsStore.getState().setLedger(demoLedgerEntries());
    useTransactionsStore.getState().setOutboxCount(0);
    return;
  }
  const store = useTransactionsStore.getState();
  store.setLedgerLoading(true);

  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      store.clearLedger();
      return;
    }

    await flushTransactionOutbox();

    const [wallet, rows] = await Promise.all([
      getMyWallet(),
      listMyTransactions({ limit: LEDGER_PAGE_SIZE }),
    ]);

    store.setLedger(rows.map((row) => toLedgerEntry(row, wallet?.id ?? null)));
  } catch (error) {
    store.setLedgerError(friendlyLedgerError(error));
  } finally {
    useTransactionsStore.getState().setLedgerLoading(false);
  }
}

/** Clears ledger state on sign-out. */
export function clearLedger(): void {
  useTransactionsStore.getState().clearLedger();
}
