export const CURRENCY = 'USDT';

/** Confirm-sheet biometric gate threshold (see docs/ux-flow.md §global patterns). */
export const BIOMETRIC_CONFIRM_THRESHOLD = 10;

/** Seat reservation window for watch parties, in minutes. */
export const RESERVATION_WINDOW_MINUTES = 3;

export const TRANSACTION_TYPES = [
  'SEND',
  'WATCH_PARTY',
  'POOL_ENTRY',
  'POOL_REWARD',
  'SPLIT_BILL',
  'TIP',
  'FAUCET',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ['PENDING', 'BROADCAST', 'SUCCESS', 'FAILED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
