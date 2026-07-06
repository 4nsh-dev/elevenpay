import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, TextField } from '@/components/ui';
import { signupSchema, type SignupFormValues, useSignup } from '@/features/auth';
import { createWalletForUser } from '@/features/wallet';

export default function SignUp() {
  const router = useRouter();
  const signup = useSignup();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSuccessMessage(null);
      const result = await signup.run(values);
      const maybeUser = result && typeof result === 'object' && 'user' in result ? result.user : null;
      const userId =
        maybeUser &&
        typeof maybeUser === 'object' &&
        'id' in maybeUser &&
        typeof maybeUser.id === 'string'
          ? maybeUser.id
          : null;

      if (userId) {
        await createWalletForUser(userId);
      }

      if (result && typeof result === 'object' && 'session' in result && result.session) {
        router.replace('/(tabs)');
        return;
      }

      setSuccessMessage('Wallet created on this device. Check your inbox to confirm your email.');
    } catch {
      // Error is rendered from the feature hook.
    }
  });

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
                Get started
              </Text>
              <Text className="font-inter-bold text-3xl text-content-primary">
                Create your account
              </Text>
              <Text className="font-inter text-[15px] leading-6 text-content-secondary">
                Your account identifies you. Wallet keys still stay on this device.
              </Text>
            </View>

            <GlassCard>
              <View className="gap-5">
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextField
                      label="Full name"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      textContentType="name"
                      autoComplete="name"
                      autoCapitalize="words"
                      placeholder="Alex Morgan"
                      error={errors.fullName?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextField
                      label="Email"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoComplete="email"
                      placeholder="you@example.com"
                      error={errors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextField
                      label="Password"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      secureTextEntry
                      placeholder="8+ chars, letters and numbers"
                      error={errors.password?.message}
                    />
                  )}
                />

                {signup.error ? (
                  <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
                    <Text className="font-inter text-[13px] leading-5 text-state-error">
                      {signup.error}
                    </Text>
                  </View>
                ) : null}

                {successMessage ? (
                  <View className="rounded-input border border-brand-primary/30 bg-brand-primary/10 p-3">
                    <Text className="font-inter text-[13px] leading-5 text-brand-primary">
                      {successMessage}
                    </Text>
                  </View>
                ) : null}

                <PrimaryButton
                  label="Create account"
                  loading={signup.isLoading}
                  onPress={onSubmit}
                />
              </View>
            </GlassCard>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/(auth)/sign-in')}
              className="items-center"
            >
              <Text className="font-inter text-[14px] text-content-secondary">
                Already have an account?{' '}
                <Text className="font-inter-semibold text-brand-primary">Log in</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
