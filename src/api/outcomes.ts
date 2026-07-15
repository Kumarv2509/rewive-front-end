import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { OutcomeReport } from './types';

export function useOutcomeReport(runId: string) {
  return useQuery({
    queryKey: ['outcomes', runId],
    queryFn: async () => (await apiClient.get<OutcomeReport>(`/outcomes/${runId}`)).data,
  });
}

export function useAssignAction(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (actionId: string) =>
      (await apiClient.post(`/outcomes/${runId}/actions/${actionId}/assign`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcomes', runId] });
    },
  });
}

export function useScheduleAction(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (actionId: string) =>
      (await apiClient.post(`/outcomes/${runId}/actions/${actionId}/schedule`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outcomes', runId] });
    },
  });
}

export function useExportOutcome(runId: string) {
  return useMutation({
    mutationFn: async (format: 'pptx' | 'pdf') =>
      (await apiClient.post<{ downloadUrl: string }>(`/outcomes/${runId}/export`, null, { params: { format } })).data,
  });
}

export function useShareOutcome(runId: string) {
  return useMutation({
    mutationFn: async () =>
      (await apiClient.post<{ shareUrl: string; expiresInDays: number }>(`/outcomes/${runId}/share`)).data,
  });
}
