import { ActivityIndicator, Pressable, Text } from 'react-native';

import { colors } from '@/theme/tokens';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

/** Full-width 56pt emerald button. Width stays locked while loading. */
export function PrimaryButton({ label, onPress, disabled, loading }: PrimaryButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      className={`h-14 w-full items-center justify-center rounded-button active:scale-[0.98] ${
        disabled ? 'bg-brand-primary/25' : 'bg-brand-primary active:bg-brand-primary-press'
      }`}
    >
      {loading ? (
        <ActivityIndicator color={colors.text.onPrimary} />
      ) : (
        <Text
          className={`font-inter-semibold text-base ${
            disabled ? 'text-content-tertiary' : 'text-content-on-primary'
          }`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
