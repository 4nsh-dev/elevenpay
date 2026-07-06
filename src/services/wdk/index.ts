import * as SecureStore from 'expo-secure-store';
import WDK from '@tetherto/wdk';
import WalletManagerEvm, {
  WalletAccountReadOnlyEvm,
  type WalletAccountEvm,
} from '@tetherto/wdk-wallet-evm';

import { env } from '@/lib/env';
import { CURRENCY, type TransactionStatus } from '@/lib/constants';

import { baseUnitsToUsdt, usdtToBaseUnits, weiToEth } from './amounts';

const WALLET_KEY_PREFIX = 'elevenpay.wdk.wallet';
const DEFAULT_OWNER_ID = 'local';
const EVM_ACCOUNT_INDEX = 0;

type StoredWalletMetadata = {
  ownerId: string;
  address: string;
  blockchain: string;
  createdAt: string;
};

export interface PaymentDraft {
  /** Recipient address (resolved via API, never guessed client-side). */
  to: string;
  /** Decimal string, e.g. "5.000000". */
  amount: string;
  type: string;
  /** Domain row this payment settles (party/pool/split id), if any. */
  referenceId?: string;
  memo?: string;
  metadata?: Record<string, string>;
}

export interface DemoRewardDraft {
  amount: string;
  type: 'POOL_REWARD';
  referenceId: string;
  counterparty: string;
  memo: string;
  metadata?: Record<string, string>;
}

export interface PreparedTransfer {
  draft: PaymentDraft;
  /** Estimated network fee as a decimal string, for the confirm sheet. */
  estimatedFee: string;
}

export type WalletTransaction = {
  id: string;
  hash: string;
  direction: 'in' | 'out';
  amount: string;
  fee: string;
  currency: typeof CURRENCY;
  type: string;
  referenceId?: string;
  counterparty: string;
  status: TransactionStatus;
  createdAt: string;
  memo?: string;
  metadata?: Record<string, string>;
};

export interface WdkService {
  hasWallet(ownerId?: string | null): Promise<boolean>;
  createWallet(ownerId?: string | null): Promise<{ address: string; blockchain: string }>;
  restoreWallet(
    mnemonic: string,
    ownerId?: string | null,
  ): Promise<{ address: string; blockchain: string }>;
  getAddress(ownerId?: string | null): Promise<string>;
  getBalance(ownerId?: string | null): Promise<string>;
  prepareTransfer(draft: PaymentDraft, ownerId?: string | null): Promise<PreparedTransfer>;
  /** Biometric/SecureStore gate happens inside — callers cannot skip it. */
  signAndBroadcast(
    prepared: PreparedTransfer,
    ownerId?: string | null,
  ): Promise<{ transactionHash: string }>;
  signMessage(message: string, ownerId?: string | null): Promise<{ signature: string }>;
  recordDemoReward(
    reward: DemoRewardDraft,
    ownerId?: string | null,
  ): Promise<{ proofSignature: string }>;
  /** SecureStore-gated. Returns words for the hold-to-reveal screen only. */
  revealRecoveryPhrase(ownerId?: string | null): Promise<string[]>;
  getTransactionHistory(ownerId?: string | null): Promise<WalletTransaction[]>;
  removeWalletFromDevice(ownerId?: string | null): Promise<void>;
}

function walletId(ownerId?: string | null) {
  return ownerId ?? DEFAULT_OWNER_ID;
}

function mnemonicKey(ownerId?: string | null) {
  return `${WALLET_KEY_PREFIX}.${walletId(ownerId)}.mnemonic`;
}

function metadataKey(ownerId?: string | null) {
  return `${WALLET_KEY_PREFIX}.${walletId(ownerId)}.metadata`;
}

function historyKey(ownerId?: string | null) {
  return `${WALLET_KEY_PREFIX}.${walletId(ownerId)}.history`;
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const secretOptions: SecureStore.SecureStoreOptions = {
  ...secureOptions,
  requireAuthentication: true,
  authenticationPrompt: 'Unlock your ElevenPay wallet',
};

function evmConfig() {
  return {
    provider: env.EXPO_PUBLIC_EVM_RPC_URL,
    chainId: env.EXPO_PUBLIC_EVM_CHAIN_ID,
  };
}

function requireRpc() {
  if (!env.EXPO_PUBLIC_EVM_RPC_URL) {
    throw new Error('Missing EXPO_PUBLIC_EVM_RPC_URL. Add an EVM RPC URL to .env.');
  }
}

function requireToken() {
  if (!env.EXPO_PUBLIC_USDT_CONTRACT_ADDRESS) {
    throw new Error(
      'Missing EXPO_PUBLIC_USDT_CONTRACT_ADDRESS. Add the USDT testnet token address.',
    );
  }

  return env.EXPO_PUBLIC_USDT_CONTRACT_ADDRESS;
}

async function saveMetadata(metadata: StoredWalletMetadata) {
  await SecureStore.setItemAsync(
    metadataKey(metadata.ownerId),
    JSON.stringify(metadata),
    secureOptions,
  );
}

async function readMetadata(ownerId?: string | null): Promise<StoredWalletMetadata | null> {
  const raw = await SecureStore.getItemAsync(metadataKey(ownerId), secureOptions);
  return raw ? (JSON.parse(raw) as StoredWalletMetadata) : null;
}

async function readMnemonic(ownerId?: string | null) {
  const mnemonic = await SecureStore.getItemAsync(mnemonicKey(ownerId), secretOptions);

  if (!mnemonic) {
    throw new Error('Wallet is not available on this device.');
  }

  return mnemonic;
}

async function saveMnemonic(ownerId: string, mnemonic: string) {
  await SecureStore.setItemAsync(mnemonicKey(ownerId), mnemonic, secretOptions);
}

async function buildAccount(ownerId?: string | null) {
  const mnemonic = await readMnemonic(ownerId);
  const wdk = new WDK(mnemonic);
  wdk.registerWallet(env.EXPO_PUBLIC_CHAIN, WalletManagerEvm, evmConfig());

  return (await wdk.getAccount(
    env.EXPO_PUBLIC_CHAIN,
    EVM_ACCOUNT_INDEX,
  )) as unknown as WalletAccountEvm;
}

async function appendTransaction(ownerId: string | null | undefined, tx: WalletTransaction) {
  const history = await wdkService.getTransactionHistory(ownerId);
  await SecureStore.setItemAsync(
    historyKey(ownerId),
    JSON.stringify([tx, ...history].slice(0, 50)),
    secureOptions,
  );
}

export const wdkService: WdkService = {
  async hasWallet(ownerId) {
    return Boolean(await readMetadata(ownerId));
  },

  async createWallet(ownerId) {
    const id = walletId(ownerId);

    if (await this.hasWallet(id)) {
      const metadata = await readMetadata(id);
      if (!metadata) throw new Error('Wallet metadata is missing.');
      return { address: metadata.address, blockchain: metadata.blockchain };
    }

    const mnemonic = WDK.getRandomSeedPhrase(12);

    if (!WDK.isValidSeed(mnemonic)) {
      throw new Error('WDK generated an invalid seed phrase.');
    }

    await saveMnemonic(id, mnemonic);
    const account = await buildAccount(id);
    const address = await account.getAddress();
    const metadata: StoredWalletMetadata = {
      ownerId: id,
      address,
      blockchain: env.EXPO_PUBLIC_CHAIN,
      createdAt: new Date().toISOString(),
    };

    await saveMetadata(metadata);
    return { address, blockchain: metadata.blockchain };
  },

  async restoreWallet(mnemonic, ownerId) {
    const id = walletId(ownerId);
    const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');

    if (!WDK.isValidSeed(normalized)) {
      throw new Error('Recovery phrase is not valid.');
    }

    await saveMnemonic(id, normalized);
    const account = await buildAccount(id);
    const address = await account.getAddress();
    const metadata: StoredWalletMetadata = {
      ownerId: id,
      address,
      blockchain: env.EXPO_PUBLIC_CHAIN,
      createdAt: new Date().toISOString(),
    };

    await saveMetadata(metadata);
    return { address, blockchain: metadata.blockchain };
  },

  async getAddress(ownerId) {
    const metadata = await readMetadata(ownerId);
    if (metadata?.address) return metadata.address;

    const account = await buildAccount(ownerId);
    const address = await account.getAddress();
    await saveMetadata({
      ownerId: walletId(ownerId),
      address,
      blockchain: env.EXPO_PUBLIC_CHAIN,
      createdAt: new Date().toISOString(),
    });

    return address;
  },

  async getBalance(ownerId) {
    requireRpc();
    const address = await this.getAddress(ownerId);
    const readOnly = new WalletAccountReadOnlyEvm(address, evmConfig());

    if (env.EXPO_PUBLIC_USDT_CONTRACT_ADDRESS) {
      const balance = await readOnly.getTokenBalance(env.EXPO_PUBLIC_USDT_CONTRACT_ADDRESS);
      return baseUnitsToUsdt(balance);
    }

    const balance = await readOnly.getBalance();
    return weiToEth(balance);
  },

  async prepareTransfer(draft, ownerId) {
    requireRpc();
    const address = await this.getAddress(ownerId);
    const readOnly = new WalletAccountReadOnlyEvm(address, evmConfig());

    if (env.EXPO_PUBLIC_USDT_CONTRACT_ADDRESS) {
      const quote = await readOnly.quoteTransfer({
        token: requireToken(),
        recipient: draft.to,
        amount: usdtToBaseUnits(draft.amount),
      });

      return { draft, estimatedFee: weiToEth(quote.fee) };
    }

    const quote = await readOnly.quoteSendTransaction({
      to: draft.to,
      value: usdtToBaseUnits(draft.amount),
    });

    return { draft, estimatedFee: weiToEth(quote.fee) };
  },

  async signAndBroadcast(prepared, ownerId) {
    requireRpc();
    const account = await buildAccount(ownerId);
    const token = requireToken();
    const result = await account.transfer({
      token,
      recipient: prepared.draft.to,
      amount: usdtToBaseUnits(prepared.draft.amount),
    });
    const transaction: WalletTransaction = {
      id: `${Date.now()}-${result.hash}`,
      hash: result.hash,
      direction: 'out',
      amount: prepared.draft.amount,
      fee: weiToEth(result.fee),
      currency: CURRENCY,
      type: prepared.draft.type,
      referenceId: prepared.draft.referenceId,
      counterparty: prepared.draft.to,
      status: 'BROADCAST',
      createdAt: new Date().toISOString(),
      memo: prepared.draft.memo,
      metadata: prepared.draft.metadata,
    };

    await appendTransaction(ownerId, transaction);
    return { transactionHash: result.hash };
  },

  async signMessage(message, ownerId) {
    const account = await buildAccount(ownerId);
    const signature = await account.sign(message);
    return { signature };
  },

  async recordDemoReward(reward, ownerId) {
    const message = [
      'ElevenPay demo pool reward',
      `pool=${reward.referenceId}`,
      `amount=${reward.amount}`,
      `winner=${reward.metadata?.winner ?? 'unknown'}`,
      `timestamp=${new Date().toISOString()}`,
    ].join('\n');
    const { signature } = await this.signMessage(message, ownerId);
    const transaction: WalletTransaction = {
      id: `${Date.now()}-${signature.slice(0, 18)}`,
      hash: signature,
      direction: 'in',
      amount: reward.amount,
      fee: '0',
      currency: CURRENCY,
      type: reward.type,
      referenceId: reward.referenceId,
      counterparty: reward.counterparty,
      status: 'BROADCAST',
      createdAt: new Date().toISOString(),
      memo: reward.memo,
      metadata: reward.metadata,
    };

    await appendTransaction(ownerId, transaction);
    return { proofSignature: signature };
  },

  async revealRecoveryPhrase(ownerId) {
    const mnemonic = await readMnemonic(ownerId);
    return mnemonic.split(' ');
  },

  async getTransactionHistory(ownerId) {
    const raw = await SecureStore.getItemAsync(historyKey(ownerId), secureOptions);
    return raw ? (JSON.parse(raw) as WalletTransaction[]) : [];
  },

  async removeWalletFromDevice(ownerId) {
    await SecureStore.deleteItemAsync(mnemonicKey(ownerId));
    await SecureStore.deleteItemAsync(metadataKey(ownerId));
    await SecureStore.deleteItemAsync(historyKey(ownerId));
  },
};
