import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSessionStore } from '@/stores/session';
import { colors } from '@/theme/tokens';

/**
 * Entry gate. Session bootstrap (Supabase session restore + wallet presence
 * check) lands in the Authentication phase; until then everyone starts at Welcome.
 */
export default function Index() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isBootstrapping = useSessionStore((s) => s.isBootstrapping);

  if (isBootstrapping) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-base">
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/welcome'} />;
}
