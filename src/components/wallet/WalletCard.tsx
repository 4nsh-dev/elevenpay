import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { colors, gradients } from '@/theme/tokens';

import { AnimatedBalance } from './AnimatedBalance';

interface WalletCardProps {
  name: string;
  /** Display-cache balance as a decimal string. */
  balance: string;
  chainLabel?: string;
  /** e.g. "as of 10:32" — shown when the balance is a stale cache. */
  updatedLabel?: string | null;
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

/** Hero glass card over grad/hero: greeting, balance count-up, chain chip (docs/ui-design.md §4). */
export function WalletCard({ name, balance, chainLabel = 'Sepolia Testnet', updatedLabel }: WalletCardProps) {
  const greeting = greetingFor(new Date().getHours());

  return (
    <View className="overflow-hidden rounded-card border" style={{ borderColor: colors.border.subtle }}>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View className="p-6">
          <Text className="font-inter text-[13px] text-content-secondary">{greeting} 👋</Text>
          <Text className="mt-0.5 font-inter-semibold text-[18px] text-content-primary">{name}</Text>

          <Text className="mt-5 font-inter-medium text-[11px] uppercase tracking-widest text-content-secondary">
            World Cup Wallet
          </Text>
          <View className="mt-1 flex-row items-end">
            <AnimatedBalance
              value={balance}
              className="font-inter-bold text-[44px] leading-[48px] text-content-primary"
            />
            <Text className="mb-2 ml-2 font-inter text-[13px] text-content-secondary">USDT</Text>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-white/5 px-3 py-1">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.brand.primary }} />
              <Text className="font-inter-medium text-[11px] text-content-secondary">{chainLabel}</Text>
            </View>
            {updatedLabel ? (
              <Text className="font-inter text-[11px] text-content-tertiary">{updatedLabel}</Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
