import type { TextInputProps } from 'react-native';
import { Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/tokens';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <View className="gap-2">
      <Text className="font-inter-medium text-[13px] text-content-secondary">{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={colors.text.tertiary}
        selectionColor={colors.brand.primary}
        className={`h-[52px] rounded-input border bg-surface-slate px-4 font-inter text-[15px] text-content-primary ${
          error ? 'border-state-error' : 'border-white/10 focus:border-white/20'
        }`}
        {...props}
      />
      {error ? <Text className="font-inter text-[12px] text-state-error">{error}</Text> : null}
    </View>
  );
}
