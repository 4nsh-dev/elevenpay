import { z } from 'zod';

const email = z.string().trim().email('Enter a valid email address.');

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(80, 'Name is too long.'),
  email,
  password,
});

export const forgotPasswordSchema = z.object({
  email,
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
