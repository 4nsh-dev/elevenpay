import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

/** Query key factory — every feature keys through here so invalidation stays typo-proof. */
export const queryKeys = {
  profile: ['profile'] as const,
  wallet: ['wallet'] as const,
  transactions: (filter?: string) => ['transactions', filter ?? 'all'] as const,
  watchParties: ['watch-parties'] as const,
  watchParty: (id: string) => ['watch-parties', id] as const,
  pools: ['pools'] as const,
  pool: (id: string) => ['pools', id] as const,
  splits: ['splits'] as const,
  split: (id: string) => ['splits', id] as const,
};
