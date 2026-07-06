import { useRouter } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, Trophy, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { InsightCard, type Suggestion } from '@/components/ai';
import { ActionButton, Avatar, Screen, Skeleton } from '@/components/ui';
import { RecentActivity, WalletCard } from '@/components/wallet';
import { SAMPLE_ACTIVITY, refreshWallet, toActivityItem } from '@/features/wallet';
import { useSessionStore } from '@/stores/session';
import { useWalletStore } from '@/stores/wallet';
import { colors } from '@/theme/tokens';

function formatTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `as of ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Loading placeholder for the hero + quick actions (first load only). */
function HeroSkeleton() {
  return (
    <View className="gap-8">
      <Skeleton height={188} radius={24} />
      <View className="flex-row justify-between px-2">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} className="items-center gap-2">
            <Skeleton width={56} height={56} radius={28} />
            <Skeleton width={40} height={11} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** AI Wallet Dashboard — hero, quick actions, AI suggestions, recent activity (docs/ux-flow.md §4). */
export default function HomeScreen() {
  const router = useRouter();

  const userId = useSessionStore((s) => s.userId);
  const fullName = useSessionStore((s) => s.fullName);

  const address = useWalletStore((s) => s.address);
  const balance = useWalletStore((s) => s.balance);
  const balanceUpdatedAt = useWalletStore((s) => s.balanceUpdatedAt);
  const walletError = useWalletStore((s) => s.walletError);
  const isWalletLoading = useWalletStore((s) => s.isWalletLoading);
  const transactions = useWalletStore((s) => s.transactions);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWallet(userId);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  const firstLoad = isWalletLoading && !address;
  const activity = transactions.length ? transactions.map(toActivityItem) : SAMPLE_ACTIVITY;
  // Only surface a staleness stamp when the fresh chain read failed.
  const updatedLabel = walletError ? formatTime(balanceUpdatedAt) : null;

  const suggestions: Suggestion[] = [
    { label: 'Split last dinner', onPress: () => router.push('/split') },
    { label: 'Join England vs Brazil pool', onPress: () => router.push('/(tabs)/watch') },
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-8 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        }
      >
        <View className="flex-row items-center justify-between">
          <View className="h-2 w-2 rounded-full bg-brand-primary" />
          <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
            <Avatar name={fullName ?? 'Player'} size="md" />
          </Pressable>
        </View>

        {firstLoad ? (
          <HeroSkeleton />
        ) : (
          <>
            <WalletCard name={fullName ?? 'there'} balance={balance} updatedLabel={updatedLabel} />

            <View className="flex-row justify-between px-2">
              <ActionButton icon={ArrowUpRight} label="Send" onPress={() => router.push('/send')} />
              <ActionButton icon={ArrowDownLeft} label="Receive" onPress={() => router.push('/receive')} />
              <ActionButton icon={Users} label="Split" onPress={() => router.push('/split')} />
              <ActionButton icon={Trophy} label="Pool" onPress={() => router.push('/(tabs)/watch')} />
            </View>

            <InsightCard
              message="You spent 12 USDT on football this week — nicely under budget."
              suggestions={suggestions}
            />
          </>
        )}

        <RecentActivity
          items={activity}
          isLoading={firstLoad}
          onSeeAll={() => router.push('/history')}
        />
      </ScrollView>
    </Screen>
  );
}
