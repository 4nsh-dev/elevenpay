import { useRouter } from 'expo-router';
import { RefreshCw, Wallet } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen } from '@/components/ui';
import { RecentActivity } from '@/components/wallet';
import { buildSampleHistory, refreshWallet, toActivityItem } from '@/features/wallet';
import { formatUsdt, shortenAddress } from '@/lib/format';
import { useSessionStore } from '@/stores/session';
import { useWalletStore } from '@/stores/wallet';
import { colors } from '@/theme/tokens';
import type { ActivityItem } from '@/types/activity';

export default function WalletScreen() {
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const address = useWalletStore((s) => s.address);
  const balance = useWalletStore((s) => s.balance);
  const balanceUpdatedAt = useWalletStore((s) => s.balanceUpdatedAt);
  const transactions = useWalletStore((s) => s.transactions);
  const isWalletLoading = useWalletStore((s) => s.isWalletLoading);
  const walletError = useWalletStore((s) => s.walletError);

  const recent = useMemo<ActivityItem[]>(
    () => (transactions.length ? transactions.map(toActivityItem) : buildSampleHistory()),
    [transactions],
  );

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-6 py-6">
        <View className="gap-2">
          <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
            Self-custodial wallet
          </Text>
          <Text className="font-inter-bold text-3xl text-content-primary">Wallet</Text>
          <Text className="font-inter text-[15px] leading-6 text-content-secondary">
            WDK signs locally. Supabase never receives private keys.
          </Text>
        </View>

        <GlassCard>
          <View className="gap-5">
            <View className="flex-row items-center justify-between">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10">
                <Wallet size={24} color={colors.brand.primary} strokeWidth={1.75} />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  refreshWallet(userId).catch(() => undefined);
                }}
                className="h-10 w-10 items-center justify-center rounded-full bg-surface-slate"
              >
                <RefreshCw size={18} color={colors.text.secondary} strokeWidth={1.75} />
              </Pressable>
            </View>

            <View>
              <Text className="font-inter-bold text-[44px] leading-[48px] text-content-primary">
                {formatUsdt(balance)}{' '}
                <Text className="font-inter text-[13px] text-content-secondary">USDT</Text>
              </Text>
              <Text className="mt-2 font-inter text-[13px] text-content-secondary">
                {balanceUpdatedAt
                  ? `Updated ${new Date(balanceUpdatedAt).toLocaleTimeString()}`
                  : 'Balance sync requires RPC configuration'}
              </Text>
            </View>

            <View className="rounded-input bg-surface-slate p-4">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                Wallet address
              </Text>
              <Text className="mt-2 font-inter-semibold text-[15px] text-content-primary">
                {address ? shortenAddress(address, 6) : 'No local wallet found'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {walletError ? (
          <View className="rounded-input border border-state-warning/30 bg-state-warning/10 p-3">
            <Text className="font-inter text-[13px] leading-5 text-state-warning">
              {walletError}
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <PrimaryButton
            label={isWalletLoading ? 'Refreshing' : 'Refresh'}
            loading={isWalletLoading}
            onPress={() => {
              refreshWallet(userId).catch(() => undefined);
            }}
          />
        </View>

        <RecentActivity
          items={recent}
          onSeeAll={() => router.push('/history')}
          onSelect={() => router.push('/history')}
        />
      </ScrollView>
    </Screen>
  );
}
