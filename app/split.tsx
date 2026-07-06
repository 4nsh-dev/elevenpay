import { Text, View } from 'react-native';

import { Screen } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth';

/** Amount → friends → review shares → requests — Payments phase. */
export default function SplitModal() {
  return (
    <ProtectedRoute>
      <Screen>
        <View className="flex-1 justify-center gap-2">
          <Text className="font-inter-semibold text-2xl text-content-primary">Split a bill</Text>
          <Text className="font-inter text-[15px] text-content-secondary">
            Split flow — Payments phase.
          </Text>
        </View>
      </Screen>
    </ProtectedRoute>
  );
}
