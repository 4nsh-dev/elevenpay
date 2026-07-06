import * as Linking from 'expo-linking';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/services/supabase/client';

import type { ForgotPasswordFormValues, LoginFormValues, SignupFormValues } from './schemas';

function friendlyAuthError(error: unknown): Error {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials')) {
    return new Error('Email or password is incorrect.');
  }

  if (lower.includes('email not confirmed')) {
    return new Error('Please confirm your email before signing in.');
  }

  if (lower.includes('user already registered') || lower.includes('already registered')) {
    return new Error('An account already exists for this email.');
  }

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return new Error('Too many attempts. Wait a moment, then try again.');
  }

  if (lower.includes('network')) {
    return new Error('Network error. Check your connection and try again.');
  }

  return new Error(message);
}

export async function loginWithEmail(values: LoginFormValues) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) throw friendlyAuthError(error);
  return data;
}

export async function signupWithEmail(values: SignupFormValues) {
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: {
        full_name: values.fullName,
      },
    },
  });

  if (error) throw friendlyAuthError(error);
  return data;
}

export async function sendPasswordReset(values: ForgotPasswordFormValues) {
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
    redirectTo: Linking.createURL('/(auth)/sign-in'),
  });

  if (error) throw friendlyAuthError(error);
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  queryClient.clear();

  if (error) throw friendlyAuthError(error);
}
