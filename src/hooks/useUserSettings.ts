'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api';

export const USER_SETTINGS_KEYS = {
  all: ['user-settings'] as const,
};

export function useUserSettings() {
  return useQuery({
    queryKey: USER_SETTINGS_KEYS.all,
    queryFn: settingsApi.get,
    staleTime: 60_000, // 1 minute
  });
}

export function useSaveUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_SETTINGS_KEYS.all });
    },
  });
}
