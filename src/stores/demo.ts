import { create } from 'zustand';

import type { PredictionPoolView } from '@/features/prediction-pool';
import type { WatchPartyView } from '@/features/watch-party';
import type { Transaction } from '@/services/supabase/repositories/transactions';

/**
 * Demo mode state — memory only, never persisted.
 *
 * The snapshot is the single source of truth for every demo surface (wallet,
 * ledger, parties, pools, copilot). Closing the app ends the demo; nothing
 * demo-related is ever written to SecureStore, AsyncStorage, or Supabase.
 */
export type DemoSnapshot = {
  walletAddress: string;
  walletId: string;
  balance: string;
  ledger: Transaction[];
  parties: WatchPartyView[];
  joinedPartyIds: string[];
  pools: PredictionPoolView[];
};

interface DemoState {
  isDemoMode: boolean;
  snapshot: DemoSnapshot | null;
  /** True once the payout demo ran for the current seed (reset clears it). */
  payoutDone: boolean;
  seed: (snapshot: DemoSnapshot) => void;
  patchSnapshot: (partial: Partial<DemoSnapshot>) => void;
  setPayoutDone: (payoutDone: boolean) => void;
  clear: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemoMode: false,
  snapshot: null,
  payoutDone: false,
  seed: (snapshot) => set({ isDemoMode: true, snapshot, payoutDone: false }),
  patchSnapshot: (partial) =>
    set((state) =>
      state.snapshot ? { snapshot: { ...state.snapshot, ...partial } } : state,
    ),
  setPayoutDone: (payoutDone) => set({ payoutDone }),
  clear: () => set({ isDemoMode: false, snapshot: null, payoutDone: false }),
}));
