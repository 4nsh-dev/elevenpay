import { useRouter } from 'expo-router';
import { Check, Copy, Share2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';

import { AddressQr, RecentActivity } from '@/components/wallet';
import { GlassCard, Screen, SecondaryButton } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';
import { SAMPLE_ACTIVITY, toActivityItem } from '@/features/wallet';
import { useCopy } from '@/hooks/use-copy';
import { shortenAddress } from '@/lib/format';
import { useWalletStore } from '@/stores/wallet';
import { colors, iconSize } from '@/theme/tokens';

export default function ReceiveModal() {
  const router = useRouter();
  const address = useWalletStore((s) => s.address);
  const transactions = useWalletStore((s) => s.transactions);
  const { copied, copy } = useCopy();

  // Incoming payments only. WDK's local history is outgoing-only today, so fall
  // back to the demo seed until the transactions API is live (mirrors the dashboard).
  const incoming = useMemo(() => {
    const real = transactions.map(toActivityItem).filter((t) => t.direction === 'in');
    return real.length ? real : SAMPLE_ACTIVITY.filter((t) => t.direction === 'in');
  }, [transactions]);

  async function onShare() {
    if (!address) return;
    await Share.share({ message: `My ElevenPay USDT address:\n${address}` });
  }

  return (
    <ProtectedRoute>
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-8 py-8">
          <View className="gap-2">
            <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
              Receive
            </Text>
            <Text className="font-inter-bold text-3xl text-content-primary">Wallet address</Text>
            <Text className="font-inter text-[15px] leading-6 text-content-secondary">
              Share this public address to receive USDT. It is not a secret.
            </Text>
          </View>

          <GlassCard>
            <View className="items-center gap-6">
              <AddressQr address={address} />

              <View className="items-center gap-2">
                <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-content-tertiary">
                  Ethereum address
                </Text>
                <Pressable
                  onPress={() => address && copy(address)}
                  disabled={!address}
                  accessibilityRole="button"
                  accessibilityLabel="Copy wallet address"
                  className="active:opacity-70"
                >
                  <Text className="font-inter-semibold text-[17px] text-content-primary">
                    {address ? shortenAddress(address, 8) : 'No wallet on this device'}
                  </Text>
                </Pressable>
                <Text className="text-center font-inter text-[13px] leading-5 text-content-secondary">
                  Works with any USDT wallet.
                </Text>
              </View>
            </View>
          </GlassCard>

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => address && copy(address)}
              disabled={!address}
              accessibilityRole="button"
              className={`h-14 flex-1 flex-row items-center justify-center gap-2 rounded-button bg-surface-slate active:bg-surface-card-hover ${
                address ? '' : 'opacity-40'
              }`}
            >
              {copied ? (
                <Check size={iconSize.row} color={colors.brand.primary} strokeWidth={2} />
              ) : (
                <Copy size={iconSize.row} color={colors.brand.primary} strokeWidth={2} />
              )}
              <Text className="font-inter-semibold text-[15px] text-content-primary">
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onShare}
              disabled={!address}
              accessibilityRole="button"
              className={`h-14 flex-1 flex-row items-center justify-center gap-2 rounded-button bg-surface-slate active:bg-surface-card-hover ${
                address ? '' : 'opacity-40'
              }`}
            >
              <Share2 size={iconSize.row} color={colors.brand.primary} strokeWidth={2} />
              <Text className="font-inter-semibold text-[15px] text-content-primary">Share</Text>
            </Pressable>
          </View>

          <RecentActivity
            items={incoming}
            title="Receive History"
            emptyTitle="No incoming payments yet"
            emptySubtitle="Money you receive will appear here."
          />

          <View className="gap-4">
            <Text className="text-center font-inter text-[12px] text-content-tertiary">
              Never share your recovery phrase. Address sharing is safe.
            </Text>
            <SecondaryButton label="Done" onPress={() => router.back()} />
          </View>
        </ScrollView>
      </Screen>
    </ProtectedRoute>
  );
}
