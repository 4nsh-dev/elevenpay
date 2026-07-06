import { Text, View } from 'react-native';

import { Screen } from '@/components/ui';

/** Conversational copilot — AI phase. */
export default function AiScreen() {
  return (
    <Screen>
      <View className="flex-1 justify-center gap-2">
        <Text className="font-inter-semibold text-2xl text-content-primary">
          What would you like to do?
        </Text>
        <Text className="font-inter text-[15px] text-content-secondary">
          Copilot chat — AI phase.
        </Text>
      </View>
    </Screen>
  );
}
