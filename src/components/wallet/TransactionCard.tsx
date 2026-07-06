import type { LucideIcon } from 'lucide-react-native';
import { ArrowDownLeft, ArrowUpRight, Gift, Sparkles, Trophy, Tv, Users } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { formatUsdt } from '@/lib/format';
import { colors, iconSize } from '@/theme/tokens';
import type { ActivityItem } from '@/types/activity';

const ICONS: Record<string, LucideIcon> = {
  SEND: ArrowUpRight,
  FAUCET: ArrowDownLeft,
  WATCH_PARTY: Tv,
  POOL_ENTRY: Trophy,
  POOL_REWARD: Trophy,
  SPLIT_BILL: Users,
  TIP: Gift,
};

interface TransactionCardProps {
  item: ActivityItem;
  onPress?: () => void;
}

/** Activity row: type-glyph disc, title/memo, signed amount, pending dot (docs/ui-design.md §4). */
export function TransactionCard({ item, onPress }: TransactionCardProps) {
  const Icon = ICONS[item.type] ?? Sparkles;
  const isIn = item.direction === 'in';
  const isWin = item.type === 'POOL_REWARD';
  const isPending = item.status === 'PENDING' || item.status === 'BROADCAST';
  const isFailed = item.status === 'FAILED';

  // Gold only when something was won; negatives stay white (spending isn't an error).
  const iconColor = isWin ? colors.accent.gold : colors.brand.primary;
  const amountColor = isFailed
    ? colors.text.tertiary
    : isIn
      ? colors.text.positive
      : colors.text.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="h-[72px] flex-row items-center gap-3 active:opacity-70"
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: isWin ? colors.accent.goldSoft : colors.surface.slate }}
      >
        <Icon size={iconSize.row} color={iconColor} strokeWidth={1.75} />
      </View>

      <View className="flex-1">
        <Text numberOfLines={1} className="font-inter-medium text-[15px] text-content-primary">
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text numberOfLines={1} className="mt-0.5 font-inter text-[13px] text-content-secondary">
            {item.subtitle}
          </Text>
        ) : null}
      </View>

      <View className="items-end">
        <Text
          className="font-inter-semibold text-[15px]"
          style={{
            color: amountColor,
            fontVariant: ['tabular-nums'],
            textDecorationLine: isFailed ? 'line-through' : 'none',
          }}
        >
          {isIn ? '+' : '−'}
          {formatUsdt(item.amount)}
        </Text>
        {isPending ? (
          <View className="mt-1 flex-row items-center gap-1">
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.state.pending }} />
            <Text className="font-inter text-[11px] text-content-secondary">Pending</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
