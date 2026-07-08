/**
 * Copilot context — the live wallet snapshot that grounds every reply.
 *
 * Read-only by construction: cached balance and RLS-scoped rows only. The
 * context never includes anything from src/services/wdk custody — the
 * copilot reasons about money, it cannot move it.
 */

import { listPools, type PredictionPoolView } from '@/features/prediction-pool';
import { listParties, type WatchPartyView } from '@/features/watch-party';
import {
  listMyTransactions,
  type Transaction,
} from '@/services/supabase/repositories/transactions';
import { getMyWallet } from '@/services/supabase/repositories/wallets';
import { useSessionStore } from '@/stores/session';

import {
  demoBalance,
  demoLedgerRows,
  demoPartyBoard,
  demoPoolBoard,
  demoWalletId,
  isDemoModeActive,
} from '@/features/demo';

export type CopilotContext = {
  userId: string | null;
  username: string | null;
  firstName: string | null;
  /** Supabase wallet row id (never the key material). */
  walletId: string | null;
  /** Cached display balance in USDT; the chain stays the source of truth. */
  balance: string | null;
  /** Recent ledger rows, newest first (incoming + outgoing). */
  recent: Transaction[];
  /** Upcoming watch parties with free seats the user has not joined. */
  parties: WatchPartyView[];
  /** OPEN prediction pools the user has not entered. */
  pools: PredictionPoolView[];
  loadedAt: string;
};

/** Builds a fresh snapshot; every source degrades to empty instead of throwing. */
export async function buildCopilotContext(): Promise<CopilotContext> {
  const session = useSessionStore.getState();

  // Demo mode: ground the copilot in the sandbox snapshot - no Supabase reads.
  if (isDemoModeActive()) {
    const partyBoardDemo = demoPartyBoard();
    const poolBoardDemo = demoPoolBoard();
    const joinedDemo = new Set(partyBoardDemo.joinedPartyIds);
    return {
      userId: session.userId,
      username: session.username,
      firstName: session.fullName ? session.fullName.split(' ')[0] : 'Demo',
      walletId: demoWalletId(),
      balance: demoBalance(),
      recent: demoLedgerRows(),
      parties: partyBoardDemo.parties.filter(
        (party) => party.seatsLeft > 0 && !joinedDemo.has(party.id),
      ),
      pools: poolBoardDemo.pools.filter((pool) => pool.status === 'OPEN'),
      loadedAt: new Date().toISOString(),
    };
  }

  const [wallet, recent, partyBoard, poolBoard] = await Promise.all([
    getMyWallet().catch(() => null),
    listMyTransactions({ limit: 50 }).catch(() => [] as Transaction[]),
    listParties().catch(() => ({
      parties: [] as WatchPartyView[],
      joinedPartyIds: [] as string[],
    })),
    listPools().catch(() => ({
      pools: [] as PredictionPoolView[],
      joinedPoolIds: new Set<string>(),
    })),
  ]);

  const joinedParties = new Set(partyBoard.joinedPartyIds);

  return {
    userId: session.userId,
    username: session.username,
    firstName: session.fullName ? session.fullName.split(' ')[0] : null,
    walletId: wallet?.id ?? null,
    balance: wallet?.balance ?? null,
    recent,
    parties: partyBoard.parties.filter(
      (party) => party.seatsLeft > 0 && !joinedParties.has(party.id),
    ),
    pools: poolBoard.pools.filter(
      (pool) => pool.status === 'OPEN' && !poolBoard.joinedPoolIds.has(pool.id),
    ),
    loadedAt: new Date().toISOString(),
  };
}
