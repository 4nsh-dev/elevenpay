import { useRouter } from 'expo-router';
import { ChevronLeft, Search, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { FilterChips, HistoryList, TransactionDetailSheet } from '@/components/wallet';
import { Screen } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import {
  buildSampleHistory,
  filterHistory,
  toActivityItem,
  type HistoryFilter,
} from '@/features/wallet';
import { useWalletStore } from '@/stores/wallet';
import { colors, iconSize } from '@/theme/tokens';
import type { ActivityItem } from '@/types/activity';

const PAGE_SIZE = 8;

/** Full transaction history: search, filters, day-grouping, pagination (docs/ux-flow.md §7). */
export default function HistoryScreen() {
  const router = useRouter();
  const transactions = useWalletStore((s) => s.transactions);

  const [filter, setFilter] = useState<HistoryFilter>('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  // Real WDK rows if present, else the timestamped demo history (remove once the
  // transactions API is live — mirrors the dashboard/receive demo-seed pattern).
  const allItems = useMemo<ActivityItem[]>(() => {
    return transactions.length ? transactions.map(toActivityItem) : buildSampleHistory();
  }, [transactions]);

  const filtered = useMemo(
    () => filterHistory(allItems, filter, query),
    [allItems, filter, query],
  );

  const paged = useMemo(() => filtered.slice(0, page * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  // Reset to the first page whenever the filter or search changes.
  const changeFilter = useCallback((next: HistoryFilter) => {
    setFilter(next);
    setPage(1);
  }, []);
  const changeQuery = useCallback((next: string) => {
    setQuery(next);
    setPage(1);
  }, []);

  const header = (
    <View className="gap-4 pb-2">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-full bg-surface-slate active:opacity-80"
        >
          <ChevronLeft size={iconSize.row} color={colors.text.primary} />
        </Pressable>
      </View>

      <View className="flex-row items-center gap-2 rounded-input bg-surface-slate px-4">
        <Search size={iconSize.row} color={colors.text.tertiary} />
        <TextInput
          value={query}
          onChangeText={changeQuery}
          placeholder="Search by name, memo, or type"
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.brand.primary}
          autoCapitalize="none"
          autoCorrect={false}
          className="h-[52px] flex-1 font-inter text-[15px] text-content-primary"
        />
        {query ? (
          <Pressable onPress={() => changeQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <X size={iconSize.row} color={colors.text.tertiary} />
          </Pressable>
        ) : null}
      </View>

      <FilterChips active={filter} onChange={changeFilter} />
    </View>
  );

  return (
    <ProtectedRoute>
      <Screen>
        <HistoryList
          items={paged}
          hasSearch={query.trim().length > 0 || filter !== 'ALL'}
          isPaginating={hasMore}
          onEndReached={() => hasMore && setPage((p) => p + 1)}
          onSelect={setSelected}
          ListHeaderComponent={header}
        />
        <TransactionDetailSheet item={selected} onClose={() => setSelected(null)} />
      </Screen>
    </ProtectedRoute>
  );
}
