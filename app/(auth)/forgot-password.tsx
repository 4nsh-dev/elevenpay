import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { GlassCard, PrimaryButton, Screen, TextField } from '@/components/ui';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
  useForgotPassword,
} from '@/features/auth';

export default function ForgotPassword() {
  const router = useRouter();
  const forgotPassword = useForgotPassword();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSuccessMessage(null);
      await forgotPassword.run(values);
      setSuccessMessage('Password reset link sent. Check your inbox.');
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
                Account recovery
              </Text>
              <Text className="font-inter-bold text-3xl text-content-primary">Reset password</Text>
              <Text className="font-inter text-[15px] leading-6 text-content-secondary">
                We will email a secure reset link if the account exists.
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

                {forgotPassword.error ? (
                  <View className="rounded-input border border-state-error/30 bg-state-error/10 p-3">
                    <Text className="font-inter text-[13px] leading-5 text-state-error">
                      {forgotPassword.error}
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
                  label="Send reset link"
                  loading={forgotPassword.isLoading}
                  onPress={onSubmit}
                />
              </View>
            </GlassCard>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              className="items-center"
            >
              <Text className="font-inter-semibold text-[14px] text-brand-primary">
                Back to login
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
