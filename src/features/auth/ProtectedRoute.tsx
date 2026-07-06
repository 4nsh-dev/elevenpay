import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSessionStore } from '@/stores/session';
import { colors } from '@/theme/tokens';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isBootstrapping = useSessionStore((s) => s.isBootstrapping);

  if (isBootstrapping) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;

  return children;
}
