import { Pressable, Text } from 'react-native';

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

/** Slate-filled twin of PrimaryButton; `destructive` renders text-only in error red. */
export function SecondaryButton({ label, onPress, destructive }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`h-14 w-full items-center justify-center rounded-button active:scale-[0.98] ${
        destructive ? 'bg-transparent' : 'bg-surface-slate active:bg-surface-card-hover'
      }`}
    >
      <Text
        className={`font-inter-semibold text-base ${
          destructive ? 'text-state-error' : 'text-content-primary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
