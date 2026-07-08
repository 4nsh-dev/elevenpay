import { applyDemoStateToStores, isDemoModeActive } from '@/features/demo';
import { clearLedger, loadLedger } from '@/features/payments/transaction-storage';
import { wdkService } from '@/services/wdk';
import { useWalletStore } from '@/stores/wallet';

import { syncBalanceToSupabase, syncWalletWithSupabase } from './wallet-sync';

function walletErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Wallet operation failed.';
}

export async function hydrateWallet(ownerId: string | null | undefined) {
  const store = useWalletStore.getState();
  store.setWalletError(null);

  // Demo mode: serve the sandbox snapshot; never touch WDK, Supabase, or keys.
  if (isDemoModeActive()) {
    applyDemoStateToStores();
    return;
  }

  if (!ownerId) {
    store.clearWallet();
    clearLedger();
    return;
  }

  try {
    store.setWalletLoading(true);

    if (!(await wdkService.hasWallet(ownerId))) {
      store.clearWallet();
      return;
    }

    const address = await wdkService.getAddress(ownerId);
    store.setWallet({ address, blockchain: 'ethereum-sepolia' });
    store.setTransactions(await wdkService.getTransactionHistory(ownerId));

    // Mirror wallet metadata into Supabase (register once, then no-op) and
    // refresh the persistent ledger (flushes the offline outbox first).
    // Fire-and-forget: sync never delays or breaks hydration.
    void syncWalletWithSupabase({ address, blockchain: 'ethereum-sepolia' });
    void loadLedger();

    try {
      const balance = await wdkService.getBalance(ownerId);
      store.setBalance(balance);
      void syncBalanceToSupabase(balance);
    } catch (balanceError) {
      store.setWalletError(walletErrorMessage(balanceError));
    }
  } finally {
    useWalletStore.getState().setWalletLoading(false);
  }
}

export async function createWalletForUser(ownerId: string) {
  const store = useWalletStore.getState();
  store.setWalletLoading(true);
  store.setWalletError(null);

  try {
    const wallet = await wdkService.createWallet(ownerId);
    store.setWallet(wallet);
    store.setTransactions(await wdkService.getTransactionHistory(ownerId));

    // Register the brand-new wallet against the signed-in profile.
    void syncWalletWithSupabase(wallet);
    void loadLedger();

    try {
      const balance = await wdkService.getBalance(ownerId);
      store.setBalance(balance);
      void syncBalanceToSupabase(balance);
    } catch (balanceError) {
      store.setWalletError(walletErrorMessage(balanceError));
    }

    return wallet;
  } catch (error) {
    const message = walletErrorMessage(error);
    store.setWalletError(message);
    throw new Error(message);
  } finally {
    useWalletStore.getState().setWalletLoading(false);
  }
}

export async function refreshWallet(ownerId: string | null | undefined) {
  return hydrateWallet(ownerId);
}

export async function refreshTransactionHistory(ownerId: string | null | undefined) {
  if (!ownerId) return;
  useWalletStore.getState().setTransactions(await wdkService.getTransactionHistory(ownerId));
}
