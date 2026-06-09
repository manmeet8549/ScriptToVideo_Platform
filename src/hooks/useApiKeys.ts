'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi, type ApiKeyListing } from '@/lib/api';

export const API_KEY_KEYS = {
  all: ['api-keys'] as const,
};

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEY_KEYS.all,
    queryFn: async () => {
      const data = await apiKeysApi.list();
      return data.keys;
    },
    staleTime: 120_000, // 2 minutes
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiKeysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.all });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: API_KEY_KEYS.all });
      const previous = queryClient.getQueryData<ApiKeyListing[]>(API_KEY_KEYS.all);

      // Optimistic remove
      queryClient.setQueryData<ApiKeyListing[]>(API_KEY_KEYS.all, (old = []) =>
        old.filter((k) => k.id !== id)
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(API_KEY_KEYS.all, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: API_KEY_KEYS.all });
    },
  });
}
