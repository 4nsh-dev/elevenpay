import { wdkService } from '@/services/wdk';
import { useWalletStore } from '@/stores/wallet';

function walletErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Wallet operation failed.';
}

export async function hydrateWallet(ownerId: string | null | undefined) {
  const store = useWalletStore.getState();
  store.setWalletError(null);

  if (!ownerId) {
    store.clearWallet();
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

    try {
      store.setBalance(await wdkService.getBalance(ownerId));
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

    try {
      store.setBalance(await wdkService.getBalance(ownerId));
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
