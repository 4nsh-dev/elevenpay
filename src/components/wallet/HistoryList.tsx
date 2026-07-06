import { SearchX } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, SectionList, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Skeleton } from '@/components/ui';
import { groupByDay, type HistorySection } from '@/features/wallet';
import { colors, iconSize, motion } from '@/theme/tokens';
import type { ActivityItem } from '@/types/activity';

import { TransactionCard } from './TransactionCard';

interface HistoryListProps {
  items: ActivityItem[];
  isLoading?: boolean;
  /** True while a next page is being appended (footer spinner). */
  isPaginating?: boolean;
  hasSearch?: boolean;
  onEndReached?: () => void;
  onSelect?: (item: ActivityItem) => void;
  ListHeaderComponent?: React.ReactElement;
}

function SkeletonRow() {
  return (
    <View className="h-[72px] flex-row items-center gap-3">
      <Skeleton width={44} height={44} radius={22} />
      <View className="flex-1 gap-2">
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
      <Skeleton width={56} height={14} />
    </View>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <View className="items-center gap-3 py-16">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-surface-slate">
        <SearchX size={iconSize.emptyState} color={colors.text.tertiary} strokeWidth={1.5} />
      </View>
      <View className="items-center gap-1">
        <Text className="font-inter-semibold text-[18px] text-content-primary">
          {hasSearch ? 'Nothing found' : 'Your matchday story starts here'}
        </Text>
        <Text className="text-center font-inter text-[13px] text-content-secondary">
          {hasSearch
            ? 'Try a different name, memo, or filter.'
            : 'Every payment will show up in this list.'}
        </Text>
      </View>
    </View>
  );
}

/**
 * Day-grouped, paginated transaction list. Rows slide in on mount (§7.2);
 * sticky day headers; infinite scroll via onEndReached.
 */
export function HistoryList({
  items,
  isLoading,
  isPaginating,
  hasSearch = false,
  onEndReached,
  onSelect,
  ListHeaderComponent,
}: HistoryListProps) {
  const sections = useMemo<HistorySection[]>(() => groupByDay(items), [items]);

  if (isLoading) {
    return (
      <View>
        {ListHeaderComponent}
        <View className="mt-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-12"
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState hasSearch={hasSearch} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      renderSectionHeader={({ section }) => (
        <View className="bg-bg-base py-2">
          <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-secondary">
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.duration(motion.duration.standard).delay(Math.min(index, 8) * 24)}>
          <TransactionCard item={item} onPress={onSelect ? () => onSelect(item) : undefined} />
        </Animated.View>
      )}
      ListFooterComponent={
        isPaginating ? (
          <View className="py-6">
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : null
      }
    />
  );
}
