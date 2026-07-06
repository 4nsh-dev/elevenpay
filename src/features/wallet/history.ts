import type { TransactionType } from '@/lib/constants';
import type { ActivityItem } from '@/types/activity';

/** Filter categories shown as chips (docs/ux-flow.md §7). */
export type HistoryFilter = 'ALL' | 'IN' | 'OUT' | 'POOLS' | 'PARTIES' | 'SPLITS';

export const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'IN', label: 'Received' },
  { key: 'OUT', label: 'Sent' },
  { key: 'POOLS', label: 'Pools' },
  { key: 'PARTIES', label: 'Parties' },
  { key: 'SPLITS', label: 'Splits' },
];

const FILTER_TYPES: Partial<Record<HistoryFilter, TransactionType[]>> = {
  POOLS: ['POOL_ENTRY', 'POOL_REWARD'],
  PARTIES: ['WATCH_PARTY'],
  SPLITS: ['SPLIT_BILL'],
};

function matchesFilter(item: ActivityItem, filter: HistoryFilter): boolean {
  switch (filter) {
    case 'ALL':
      return true;
    case 'IN':
      return item.direction === 'in';
    case 'OUT':
      return item.direction === 'out';
    default:
      return (FILTER_TYPES[filter] ?? []).includes(item.type);
  }
}

function matchesQuery(item: ActivityItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.title, item.subtitle, item.counterparty, item.type]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
}

/** Apply the active filter chip and search query. */
export function filterHistory(
  items: ActivityItem[],
  filter: HistoryFilter,
  query: string,
): ActivityItem[] {
  return items.filter((item) => matchesFilter(item, filter) && matchesQuery(item, query));
}

export interface HistorySection {
  title: string;
  data: ActivityItem[];
}

function dayLabel(iso: string | undefined, now: Date): string {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;
  const diffDays = Math.floor((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / dayMs);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/**
 * Group items into day sections, newest first. Items keep their incoming order
 * within a day (callers pass already-sorted lists).
 */
export function groupByDay(items: ActivityItem[], now = new Date()): HistorySection[] {
  const sections: HistorySection[] = [];
  const index = new Map<string, HistorySection>();

  for (const item of items) {
    const label = dayLabel(item.timestamp, now);
    let section = index.get(label);
    if (!section) {
      section = { title: label, data: [] };
      index.set(label, section);
      sections.push(section);
    }
    section.data.push(item);
  }

  return sections;
}

/** Full status timeline for the detail sheet. */
export function statusSteps(item: ActivityItem): { label: string; done: boolean; failed?: boolean }[] {
  const failed = item.status === 'FAILED';
  const confirmed = item.status === 'SUCCESS';
  const broadcast = confirmed || item.status === 'BROADCAST';
  return [
    { label: 'Created', done: true },
    { label: 'Broadcast', done: broadcast },
    failed
      ? { label: 'Failed', done: true, failed: true }
      : { label: 'Confirmed', done: confirmed },
  ];
}
