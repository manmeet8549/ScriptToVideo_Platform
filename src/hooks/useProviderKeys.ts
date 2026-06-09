'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providerKeysApi } from '@/lib/api';

export const PROVIDER_KEY_KEYS = {
  all: ['provider-keys'] as const,
};

export function useProviderKeys() {
  return useQuery({
    queryKey: PROVIDER_KEY_KEYS.all,
    queryFn: async () => {
      const data = await providerKeysApi.list();
      return data.keys;
    },
    staleTime: 60_000, // 1 minute
  });
}

export function useSaveProviderKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: providerKeysApi.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROVIDER_KEY_KEYS.all });
    },
  });
}

export function useTestProviderKey() {
  return useMutation({
    mutationFn: providerKeysApi.test,
  });
}
