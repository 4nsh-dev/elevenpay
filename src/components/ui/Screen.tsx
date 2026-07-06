import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Standard screen shell: base background, 24pt gutters, safe area. */
export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-bg-base">
      <View className="flex-1 px-gutter">{children}</View>
    </SafeAreaView>
  );
}
