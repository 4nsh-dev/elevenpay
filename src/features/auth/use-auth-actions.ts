import { useState } from 'react';

import {
  loginWithEmail,
  logout,
  sendPasswordReset,
  signupWithEmail,
} from './auth-service';
import type { ForgotPasswordFormValues, LoginFormValues, SignupFormValues } from './schemas';

type AuthAction<T> = (values: T) => Promise<unknown>;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function useAuthAction<T>(action: AuthAction<T>) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  async function run(values: T) {
    setError(null);
    setLoading(true);

    try {
      return await action(values);
    } catch (caught) {
      const message = getErrorMessage(caught);
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }

  return { error, isLoading, run, setError };
}

export function useLogin() {
  return useAuthAction<LoginFormValues>(loginWithEmail);
}

export function useSignup() {
  return useAuthAction<SignupFormValues>(signupWithEmail);
}

export function useForgotPassword() {
  return useAuthAction<ForgotPasswordFormValues>(async (values) => {
    await sendPasswordReset(values);
  });
}

export function useLogout() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);

  async function run() {
    setError(null);
    setLoading(true);

    try {
      await logout();
    } catch (caught) {
      const message = getErrorMessage(caught);
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }

  return { error, isLoading, run };
}
