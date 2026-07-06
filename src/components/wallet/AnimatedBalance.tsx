import { Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useCountUp } from '@/hooks/use-count-up';
import { formatUsdt } from '@/lib/format';
import { motion } from '@/theme/tokens';

interface AnimatedBalanceProps {
  /** Decimal string from the wallet store; chain is the source of truth. */
  value: string;
  className?: string;
}

/** Balance that counts up on mount and animates old→new on change (docs/ui-design.md §7.1). */
export function AnimatedBalance({ value, className }: AnimatedBalanceProps) {
  const reduced = useReducedMotion();
  const target = Number.parseFloat(value) || 0;
  const display = useCountUp(target, motion.duration.emphasis * 2, !reduced);

  return (
    <Text
      className={className}
      style={{ fontVariant: ['tabular-nums'] }}
      accessibilityLabel={`${formatUsdt(value)} USDT`}
    >
      {formatUsdt(display)}
    </Text>
  );
}
