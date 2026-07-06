import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { AuthBootstrap } from '@/features/auth';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg.base },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="history" />
            <Stack.Screen name="send" options={{ presentation: 'modal' }} />
            <Stack.Screen name="receive" options={{ presentation: 'modal' }} />
            <Stack.Screen name="split" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="confirm"
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="pool/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="party/[id]" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthBootstrap>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
