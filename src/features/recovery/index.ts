/**
 * Wallet recovery feature — reveal, verify, and backup reminders.
 *
 * The mnemonic never leaves the device: reads are SecureStore-gated behind
 * the OS biometric/passcode prompt, verification is graded locally, and the
 * backup flag is stored in device secure storage — nothing recovery-related
 * ever touches Supabase.
 */
export {
  getBackupStatus,
  hydrateBackupStatus,
  markPhraseVerified,
  shouldShowBackupReminder,
  snoozeBackupReminder,
  type BackupStatus,
} from './backup-status';
export {
  AUTO_HIDE_SECONDS,
  buildQuiz,
  useRecoveryFlow,
  type QuizQuestion,
  type RecoveryStage,
} from './use-recovery';
