import { z } from 'zod';

/**
 * Runtime-validated environment. EXPO_PUBLIC_* vars are inlined at build time;
 * failing fast here beats a blank screen from an undefined Supabase URL.
 */
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_CHAIN: z.string().min(1).default('ethereum-sepolia'),
  EXPO_PUBLIC_EVM_RPC_URL: z.string().url().optional(),
  EXPO_PUBLIC_EVM_CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  EXPO_PUBLIC_USDT_CONTRACT_ADDRESS: z.string().optional(),
  EXPO_PUBLIC_USDT_DECIMALS: z.coerce.number().int().positive().default(6),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_CHAIN: process.env.EXPO_PUBLIC_CHAIN,
  EXPO_PUBLIC_EVM_RPC_URL: process.env.EXPO_PUBLIC_EVM_RPC_URL,
  EXPO_PUBLIC_EVM_CHAIN_ID: process.env.EXPO_PUBLIC_EVM_CHAIN_ID,
  EXPO_PUBLIC_USDT_CONTRACT_ADDRESS: process.env.EXPO_PUBLIC_USDT_CONTRACT_ADDRESS,
  EXPO_PUBLIC_USDT_DECIMALS: process.env.EXPO_PUBLIC_USDT_DECIMALS,
});
