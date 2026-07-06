import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, TextField } from '@/components/ui';
import { loginSchema, type LoginFormValues, useLogin } from '@/features/auth';

export default function SignIn() {
  const router = useRouter();
  const login = useLogin();
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.run(values);
      router.replace('/(tabs)');
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
                ElevenPay
              </Text>
              <Text className="font-inter-bold text-3xl text-content-primary">Welcome back</Text>
              <Text className="font-inter text-[15px] leading-6 text-content-secondary">
                Sign in to restore your matchday wallet session.
              </Text>
            </View>

            <GlassCard>
              <View className="gap-5">
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
                      textContentType="password"
                      autoComplete="password"
                      secureTextEntry
                      placeholder="Your password"
                      error={errors.password?.message}
                    />
                  )}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/(auth)/forgot-password')}
                  className="self-end"
                >
                  <Text className="font-inter-medium text-[13px] text-brand-primary">
                    Forgot password?
                  </Text>
                </Pressable>

                {login.error ? (
                  <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
                    <Text className="font-inter text-[13px] leading-5 text-state-error">
                      {login.error}
                    </Text>
                  </View>
                ) : null}

                <PrimaryButton label="Log in" loading={login.isLoading} onPress={onSubmit} />
              </View>
            </GlassCard>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(auth)/sign-up')}
              className="items-center"
            >
              <Text className="font-inter text-[14px] text-content-secondary">
                New to ElevenPay?{' '}
                <Text className="font-inter-semibold text-brand-primary">Create account</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
