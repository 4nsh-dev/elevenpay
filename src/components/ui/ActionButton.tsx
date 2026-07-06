import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors, iconSize } from '@/theme/tokens';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
}

/** Home quick action: 56pt slate circle, emerald icon, caption label. */
export function ActionButton({ icon: Icon, label, onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center gap-2 active:scale-[0.94]"
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-surface-slate">
        <Icon size={iconSize.nav} color={colors.brand.primary} strokeWidth={1.75} />
      </View>
      <Text className="font-inter text-[13px] text-content-secondary">{label}</Text>
    </Pressable>
  );
}
