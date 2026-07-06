import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius as radii } from '@/theme/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  className?: string;
}

/** Shimmer placeholder that mirrors real layout while data loads (docs/ui-design.md §11). */
export function Skeleton({ width = '100%', height = 16, radius = radii.chip, className = '' }: SkeletonProps) {
  const opacity = useSharedValue(0.4);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    opacity.value = withRepeat(withTiming(0.85, { duration: 800 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduced]);

  const style = useAnimatedStyle(() => ({ opacity: reduced ? 0.6 : opacity.value }));

  return (
    <Animated.View
      className={className}
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surface.slate }, style]}
    />
  );
}
