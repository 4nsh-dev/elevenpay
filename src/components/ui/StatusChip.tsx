import { Text, View } from 'react-native';

type Status = 'PAID' | 'PENDING' | 'RESERVED' | 'FAILED' | 'REQUESTED' | 'OPEN' | 'FULL';

const STYLES: Record<Status, { container: string; text: string }> = {
  PAID: { container: 'bg-brand-primary/10', text: 'text-brand-primary' },
  PENDING: { container: 'bg-state-pending/10', text: 'text-state-pending' },
  RESERVED: { container: 'bg-state-warning/10', text: 'text-state-warning' },
  REQUESTED: { container: 'bg-state-pending/10', text: 'text-state-pending' },
  FAILED: { container: 'bg-state-error/10', text: 'text-state-error' },
  OPEN: { container: 'bg-brand-primary/10', text: 'text-brand-primary' },
  FULL: { container: 'bg-state-error/10', text: 'text-state-error' },
};

export function StatusChip({ status }: { status: Status }) {
  const style = STYLES[status];
  return (
    <View className={`h-6 justify-center rounded-full px-3 ${style.container}`}>
      <Text className={`font-inter-medium text-[11px] uppercase tracking-wide ${style.text}`}>
        {status}
      </Text>
    </View>
  );
}
