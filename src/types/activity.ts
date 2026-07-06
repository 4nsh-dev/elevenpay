import type { TransactionStatus, TransactionType } from '@/lib/constants';

/**
 * View model for a transaction row (docs/ui-design.md §4 TransactionCard).
 * Amounts are unsigned decimal strings — the row renders the +/− from `direction`.
 */
export interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  amount: string;
  direction: 'in' | 'out';
  type: TransactionType;
  status: TransactionStatus;
  /** ISO string. Used for day-grouping and the detail timeline. */
  timestamp?: string;
  /** Detail-sheet fields (optional — not every row has them yet). */
  fee?: string;
  hash?: string;
  memo?: string;
  counterparty?: string;
}
