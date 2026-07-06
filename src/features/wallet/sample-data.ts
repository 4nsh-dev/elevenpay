import type { WalletTransaction } from '@/services/wdk';
import type { ActivityItem } from '@/types/activity';

const TYPE_TITLES: Record<string, string> = {
  SEND: 'Sent',
  FAUCET: 'Demo USDT',
  WATCH_PARTY: 'Watch Party',
  POOL_ENTRY: 'Prediction Pool',
  POOL_REWARD: 'Prize Won',
  SPLIT_BILL: 'Bill Split',
  TIP: 'Tip',
};

/** Map a WDK on-device transaction to the activity view model. */
export function toActivityItem(tx: WalletTransaction): ActivityItem {
  return {
    id: tx.id,
    title: TYPE_TITLES[tx.type] ?? 'Payment',
    subtitle: tx.memo,
    amount: tx.amount,
    direction: tx.direction,
    type: tx.type as ActivityItem['type'],
    status: tx.status,
    timestamp: tx.createdAt,
    fee: tx.fee,
    hash: tx.hash,
    memo: tx.memo,
    counterparty: tx.counterparty,
  };
}

const DAY_MS = 86_400_000;

type SampleSeed = Omit<ActivityItem, 'id' | 'timestamp'> & { daysAgo: number; hoursAgo?: number };

/** Seed rows spread across several days so grouping + pagination are demonstrable. */
const HISTORY_SEEDS: SampleSeed[] = [
  {
    title: 'Prize Won',
    subtitle: 'Argentina vs Brazil pool',
    amount: '20.00',
    direction: 'in',
    type: 'POOL_REWARD',
    status: 'SUCCESS',
    daysAgo: 0,
    hoursAgo: 1,
  },
  {
    title: 'Prediction Pool',
    subtitle: 'England vs Brazil',
    amount: '2.00',
    direction: 'out',
    type: 'POOL_ENTRY',
    status: 'PENDING',
    daysAgo: 0,
    hoursAgo: 2,
  },
  {
    title: 'Sent',
    subtitle: 'To Emma · dinner',
    amount: '8.00',
    direction: 'out',
    type: 'SPLIT_BILL',
    status: 'SUCCESS',
    daysAgo: 0,
    hoursAgo: 5,
  },
  {
    title: 'Friend',
    subtitle: 'From Alex · kebabs 🌯',
    amount: '15.00',
    direction: 'in',
    type: 'SEND',
    status: 'SUCCESS',
    daysAgo: 1,
    hoursAgo: 3,
  },
  {
    title: 'Watch Party',
    subtitle: 'Delhi Sports Cafe',
    amount: '5.00',
    direction: 'out',
    type: 'WATCH_PARTY',
    status: 'SUCCESS',
    daysAgo: 1,
    hoursAgo: 8,
  },
  {
    title: 'Tip',
    subtitle: 'To @matchday_creator',
    amount: '1.50',
    direction: 'out',
    type: 'TIP',
    status: 'SUCCESS',
    daysAgo: 2,
    hoursAgo: 4,
  },
  {
    title: 'Sent',
    subtitle: 'To John · failed',
    amount: '4.00',
    direction: 'out',
    type: 'SEND',
    status: 'FAILED',
    daysAgo: 2,
    hoursAgo: 6,
  },
  {
    title: 'Demo USDT',
    subtitle: 'Welcome faucet',
    amount: '50.00',
    direction: 'in',
    type: 'FAUCET',
    status: 'SUCCESS',
    daysAgo: 3,
    hoursAgo: 1,
  },
  {
    title: 'Bill Split',
    subtitle: 'Pizza night',
    amount: '12.00',
    direction: 'out',
    type: 'SPLIT_BILL',
    status: 'SUCCESS',
    daysAgo: 4,
    hoursAgo: 2,
  },
  {
    title: 'Prize Won',
    subtitle: 'France vs Spain pool',
    amount: '18.00',
    direction: 'in',
    type: 'POOL_REWARD',
    status: 'SUCCESS',
    daysAgo: 6,
    hoursAgo: 5,
  },
  {
    title: 'Watch Party',
    subtitle: 'Mumbai Fan Club',
    amount: '5.00',
    direction: 'out',
    type: 'WATCH_PARTY',
    status: 'SUCCESS',
    daysAgo: 9,
    hoursAgo: 3,
  },
  {
    title: 'Prediction Pool',
    subtitle: 'Portugal vs Germany',
    amount: '3.00',
    direction: 'out',
    type: 'POOL_ENTRY',
    status: 'SUCCESS',
    daysAgo: 12,
    hoursAgo: 7,
  },
];

/**
 * Timestamped placeholder history shown only when the wallet has no real rows
 * yet. Timestamps are computed at call time so the "Today/Yesterday" grouping
 * stays correct. Remove once the transactions API is live.
 */
export function buildSampleHistory(now = Date.now()): ActivityItem[] {
  return HISTORY_SEEDS.map((seed, i) => {
    const { daysAgo, hoursAgo = 0, ...rest } = seed;
    return {
      ...rest,
      id: `sample-${i + 1}`,
      timestamp: new Date(now - daysAgo * DAY_MS - hoursAgo * 3_600_000).toISOString(),
      hash:
        rest.status === 'PENDING' ? undefined : `0x${(i + 1).toString(16).padStart(8, '0')}demo`,
      fee: rest.direction === 'out' ? '0.001' : undefined,
    };
  });
}

/**
 * Placeholder feed shown only when the wallet has no real history yet, so the
 * dashboard reads as designed before the backend is wired. Remove once the
 * transactions API is live.
 */
export const SAMPLE_ACTIVITY: ActivityItem[] = [
  {
    id: 'sample-1',
    title: 'Prize Won',
    subtitle: 'Argentina vs Brazil pool',
    amount: '20.00',
    direction: 'in',
    type: 'POOL_REWARD',
    status: 'SUCCESS',
  },
  {
    id: 'sample-2',
    title: 'Friend',
    subtitle: 'From Alex · kebabs 🌯',
    amount: '15.00',
    direction: 'in',
    type: 'SEND',
    status: 'SUCCESS',
  },
  {
    id: 'sample-3',
    title: 'Watch Party',
    subtitle: 'Delhi Sports Cafe',
    amount: '5.00',
    direction: 'out',
    type: 'WATCH_PARTY',
    status: 'SUCCESS',
  },
  {
    id: 'sample-4',
    title: 'Prediction Pool',
    subtitle: 'England vs Brazil',
    amount: '2.00',
    direction: 'out',
    type: 'POOL_ENTRY',
    status: 'PENDING',
  },
];
