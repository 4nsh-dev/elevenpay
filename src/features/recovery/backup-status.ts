/**
 * Backup status — device-only bookkeeping for the recovery reminder.
 *
 * Stored in expo-secure-store next to the wallet (never in Supabase): whether
 * the user verified a manual backup of their phrase, and when they last
 * snoozed the reminder. The mnemonic itself is never read or written here.
 */

import * as SecureStore from 'expo-secure-store';

import { useWalletStore } from '@/stores/wallet';

const STATUS_KEY_PREFIX = 'elevenpay.recovery';
const REMIND_AGAIN_AFTER_MS = 24 * 60 * 60 * 1000;

export type BackupStatus = {
  backedUpAt: string | null;
  snoozedAt: string | null;
};

const EMPTY_STATUS: BackupStatus = { backedUpAt: null, snoozedAt: null };

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function statusKey(ownerId?: string | null): string {
  return `${STATUS_KEY_PREFIX}.${ownerId ?? 'local'}.backup-status`;
}

export async function getBackupStatus(ownerId?: string | null): Promise<BackupStatus> {
  try {
    const raw = await SecureStore.getItemAsync(statusKey(ownerId), secureOptions);
    return raw ? (JSON.parse(raw) as BackupStatus) : EMPTY_STATUS;
  } catch {
    return EMPTY_STATUS;
  }
}

async function saveBackupStatus(
  ownerId: string | null | undefined,
  status: BackupStatus,
): Promise<void> {
  await SecureStore.setItemAsync(statusKey(ownerId), JSON.stringify(status), secureOptions);
}

/** Reads the persisted flag and mirrors it into the wallet store on launch. */
export async function hydrateBackupStatus(ownerId?: string | null): Promise<BackupStatus> {
  const status = await getBackupStatus(ownerId);
  useWalletStore.getState().setBackedUp(Boolean(status.backedUpAt));
  return status;
}

/** Called only after the verify quiz passes. */
export async function markPhraseVerified(ownerId?: string | null): Promise<void> {
  const status = await getBackupStatus(ownerId);
  await saveBackupStatus(ownerId, { ...status, backedUpAt: new Date().toISOString() });
  useWalletStore.getState().setBackedUp(true);
}

export async function snoozeBackupReminder(ownerId?: string | null): Promise<void> {
  const status = await getBackupStatus(ownerId);
  await saveBackupStatus(ownerId, { ...status, snoozedAt: new Date().toISOString() });
}

/** Remind until verified; a snooze silences the banner for 24 hours. */
export function shouldShowBackupReminder(status: BackupStatus): boolean {
  if (status.backedUpAt) return false;
  if (!status.snoozedAt) return true;
  return Date.now() - new Date(status.snoozedAt).getTime() > REMIND_AGAIN_AFTER_MS;
}
