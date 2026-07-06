import { create } from 'zustand';

import type { WalletTransaction } from '@/services/wdk';

/**
 * Wallet METADATA only — address and cached display balance.
 * Keys and mnemonics never enter any store (see services/wdk).
 */
interface WalletState {
  address: string | null;
  blockchain: string | null;
  /** Display cache; chain is the source of truth. */
  balance: string;
  balanceUpdatedAt: string | null;
  isBackedUp: boolean;
  transactions: WalletTransaction[];
  isWalletLoading: boolean;
  walletError: string | null;
  setWallet: (wallet: { address: string; blockchain: string }) => void;
  setBalance: (balance: string) => void;
  setTransactions: (transactions: WalletTransaction[]) => void;
  setBackedUp: (isBackedUp: boolean) => void;
  setWalletLoading: (isWalletLoading: boolean) => void;
  setWalletError: (walletError: string | null) => void;
  clearWallet: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  blockchain: null,
  balance: '0',
  balanceUpdatedAt: null,
  isBackedUp: false,
  transactions: [],
  isWalletLoading: false,
  walletError: null,
  setWallet: ({ address, blockchain }) => set({ address, blockchain }),
  setBalance: (balance) => set({ balance, balanceUpdatedAt: new Date().toISOString() }),
  setTransactions: (transactions) => set({ transactions }),
  setBackedUp: (isBackedUp) => set({ isBackedUp }),
  setWalletLoading: (isWalletLoading) => set({ isWalletLoading }),
  setWalletError: (walletError) => set({ walletError }),
  clearWallet: () =>
    set({
      address: null,
      blockchain: null,
      balance: '0',
      balanceUpdatedAt: null,
      isBackedUp: false,
      transactions: [],
      isWalletLoading: false,
      walletError: null,
    }),
}));
