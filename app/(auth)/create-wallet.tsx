import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { createWalletForUser } from '@/features/wallet';
import { wdkService } from '@/services/wdk';
import { useSessionStore } from '@/stores/session';
import { useWalletStore } from '@/stores/wallet';
import { colors } from '@/theme/tokens';

export default function CreateWallet() {
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const setWallet = useWalletStore((s) => s.setWallet);
  const [mnemonic, setMnemonic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  async function create() {
    if (!userId) {
      router.replace('/(auth)/sign-in');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await createWalletForUser(userId);
      router.replace('/(tabs)/wallet');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create wallet.');
    } finally {
      setLoading(false);
    }
  }

  async function restore() {
    if (!userId) {
      router.replace('/(auth)/sign-in');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const wallet = await wdkService.restoreWallet(mnemonic, userId);
      setWallet(wallet);
      router.replace('/(tabs)/wallet');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not restore wallet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="flex-grow justify-center py-8"
        >
          <View className="gap-8">
            <View className="gap-2">
              <Text className="font-inter-medium text-[11px] uppercase tracking-widest text-brand-primary">
                WDK wallet
              </Text>
              <Text className="font-inter-bold text-3xl text-content-primary">
                Create or restore
              </Text>
              <Text className="font-inter text-[15px] leading-6 text-content-secondary">
                The recovery phrase is stored only in device secure storage.
              </Text>
            </View>

            <GlassCard>
              <View className="gap-5">
                <PrimaryButton label="Create new wallet" loading={isLoading} onPress={create} />

                <View className="h-px bg-white/10" />

                <Text className="font-inter-semibold text-[15px] text-content-primary">
                  Restore with recovery phrase
                </Text>
                <TextInput
                  multiline
                  value={mnemonic}
                  onChangeText={setMnemonic}
                  placeholder="twelve words separated by spaces"
                  placeholderTextColor={colors.text.tertiary}
                  selectionColor={colors.brand.primary}
                  className="min-h-28 rounded-input border border-white/10 bg-surface-slate p-4 font-inter text-[15px] leading-6 text-content-primary"
                />

                {error ? (
                  <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
                    <Text className="font-inter text-[13px] leading-5 text-state-error">
                      {error}
                    </Text>
                  </View>
                ) : null}

                <SecondaryButton label="Restore wallet" onPress={restore} />
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
