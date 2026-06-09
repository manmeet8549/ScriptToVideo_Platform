'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { historyApi } from '@/lib/api';

export const HISTORY_KEYS = {
  all: ['generation-history'] as const,
  byProject: (projectId: string) => ['generation-history', projectId] as const,
};

export function useGenerationHistory(projectId?: string) {
  return useQuery({
    queryKey: projectId ? HISTORY_KEYS.byProject(projectId) : HISTORY_KEYS.all,
    queryFn: async () => {
      const data = await historyApi.list({ projectId, limit: 20 });
      return data.history;
    },
    staleTime: 60_000,
  });
}

export function useLogGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: historyApi.log,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HISTORY_KEYS.all });
    },
  });
}
