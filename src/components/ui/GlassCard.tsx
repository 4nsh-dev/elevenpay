import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { colors, radius } from '@/theme/tokens';

type Variant = 'solid' | 'glass' | 'outlined';

interface GlassCardProps extends PropsWithChildren {
  variant?: Variant;
  className?: string;
}

/**
 * Base surface. `glass` only over gradients/imagery, one per viewport;
 * `solid` for lists; `outlined` for empty states (docs/ui-design.md §4).
 */
export function GlassCard({ variant = 'solid', className = '', children }: GlassCardProps) {
  if (variant === 'glass') {
    return (
      <View
        className={`overflow-hidden rounded-card border ${className}`}
        style={{ borderColor: colors.border.subtle }}
      >
        <BlurView intensity={24} tint="dark" style={{ borderRadius: radius.card }}>
          <View className="p-gutter" style={{ backgroundColor: colors.surface.glass }}>
            {children}
          </View>
        </BlurView>
      </View>
    );
  }

  return (
    <View
      className={`rounded-card border p-gutter ${
        variant === 'outlined' ? 'bg-transparent' : 'bg-surface-card'
      } ${className}`}
      style={{ borderColor: colors.border.subtle }}
    >
      {children}
    </View>
  );
}
