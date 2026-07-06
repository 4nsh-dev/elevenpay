import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PrimaryButton, Screen, SecondaryButton } from '@/components/ui';

/** Splash → Welcome. Pager + entrance animation land in Demo Polish. */
export default function Welcome() {
  const router = useRouter();

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="font-inter-bold text-3xl tracking-tight text-content-primary">
          ELEVENPAY <Text className="text-brand-primary">⚽</Text>
        </Text>
        <Text className="font-inter text-[15px] text-content-secondary">
          The AI Wallet for Football Fans
        </Text>
      </View>
      <View className="gap-3 pb-8">
        <PrimaryButton label="Log in" onPress={() => router.push('/(auth)/sign-in')} />
        <SecondaryButton
          label="Create account"
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>
    </Screen>
  );
}
