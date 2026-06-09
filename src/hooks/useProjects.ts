'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type Project, type VideoRatio } from '@/lib/api';

export const PROJECT_KEYS = {
  all: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
};

// ─── Queries ───────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: PROJECT_KEYS.all,
    queryFn: async () => {
      const data = await projectsApi.list();
      return data.projects;
    },
    staleTime: 30_000, // 30 seconds
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: PROJECT_KEYS.detail(id),
    queryFn: async () => {
      const data = await projectsApi.get(id);
      return data.project;
    },
    enabled: !!id,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; prompt: string; videoRatio?: VideoRatio }) =>
      projectsApi.create(data),

    onSuccess: (data) => {
      // Prepend the new project into the cached list
      queryClient.setQueryData<Project[]>(PROJECT_KEYS.all, (old = []) => [
        data.project,
        ...old,
      ]);
    },

    onError: (error) => {
      console.error('[useCreateProject] Error:', error);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Project> }) =>
      projectsApi.update(id, data),

    onMutate: async ({ id, data }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: PROJECT_KEYS.all });
      const previous = queryClient.getQueryData<Project[]>(PROJECT_KEYS.all);

      queryClient.setQueryData<Project[]>(PROJECT_KEYS.all, (old = []) =>
        old.map((p) => (p.id === id ? { ...p, ...data } : p))
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(PROJECT_KEYS.all, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PROJECT_KEYS.all });
      const previous = queryClient.getQueryData<Project[]>(PROJECT_KEYS.all);

      // Optimistic remove
      queryClient.setQueryData<Project[]>(PROJECT_KEYS.all, (old = []) =>
        old.filter((p) => p.id !== id)
      );

      return { previous };
    },

    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PROJECT_KEYS.all, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PROJECT_KEYS.all });
    },
  });
}
