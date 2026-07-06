import { Redirect, Tabs } from 'expo-router';
import { Home, Sparkles, Tv, User, Wallet } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { useSessionStore } from '@/stores/session';
import { colors, iconSize } from '@/theme/tokens';

export default function TabsLayout() {
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.bg.raised,
          borderTopColor: colors.border.subtle,
          height: 64,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg.base },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={iconSize.nav} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <Wallet size={iconSize.nav} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: 'Watch',
          tabBarIcon: ({ color }) => <Tv size={iconSize.nav} color={color} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => (
            <Sparkles size={iconSize.nav} color={color} strokeWidth={1.75} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={iconSize.nav} color={color} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
