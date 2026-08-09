import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AppNotification } from './types';

// Lens-scoped like every data surface: you see the notifications addressed to
// the roles in view. Polls on the same 30s cadence as findings, so the bell
// lights up when the heartbeat escalates something.
export function useNotifications(persona?: string, scope?: string) {
  return useQuery({
    queryKey: ['notifications', persona ?? 'all', scope ?? 'self'],
    queryFn: async () =>
      (await apiClient.get<AppNotification[]>('/notifications', { params: { persona, scope } })).data,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) =>
      (await apiClient.post('/notifications/read', { ids })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
