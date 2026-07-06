import { Clock } from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { colors, iconSize } from '@/theme/tokens';
import type { ActivityItem } from '@/types/activity';

import { TransactionCard } from './TransactionCard';

interface RecentActivityProps {
  items: ActivityItem[];
  isLoading?: boolean;
  limit?: number;
  onSeeAll?: () => void;
  onSelect?: (item: ActivityItem) => void;
  /** Section label; defaults to "Recent Activity". */
  title?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
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

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="items-center gap-3 py-8">
      <View className="h-24 w-24 items-center justify-center rounded-full bg-surface-slate">
        <Clock size={iconSize.emptyState} color={colors.text.tertiary} strokeWidth={1.5} />
      </View>
      <View className="items-center gap-1">
        <Text className="font-inter-semibold text-[18px] text-content-primary">{title}</Text>
        <Text className="text-center font-inter text-[13px] text-content-secondary">{subtitle}</Text>
      </View>
    </View>
  );
}

/** Recent activity section: header, skeletons while loading, empty state, or rows. */
export function RecentActivity({
  items,
  isLoading,
  limit = 4,
  onSeeAll,
  onSelect,
  title = 'Recent Activity',
  emptyTitle = 'Your matchday story starts here',
  emptySubtitle = 'Every payment will show up in this list.',
}: RecentActivityProps) {
  const visible = items.slice(0, limit);

  return (
    <View className="gap-1">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-secondary">
          {title}
        </Text>
        {!isLoading && items.length > 0 && onSeeAll ? (
          <Pressable onPress={onSeeAll} hitSlop={8} className="active:opacity-70">
            <Text className="font-inter-medium text-[13px] text-brand-primary">See all</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        visible.map((item, index) => (
          <Fragment key={item.id}>
            {index > 0 ? <View className="h-px bg-white/[0.06]" /> : null}
            <TransactionCard item={item} onPress={onSelect ? () => onSelect(item) : undefined} />
          </Fragment>
        ))
      )}
    </View>
  );
}
