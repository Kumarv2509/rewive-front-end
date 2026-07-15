import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { ChaseEscalation, ExceptionStatus, Persona, RoleScope, RunDetail, RunException, RunListItem, RunStatus } from './types';

export function useRuns(status: RunStatus | 'all' = 'all', persona?: Persona | 'all', scope?: RoleScope) {
  return useQuery({
    queryKey: ['runs', 'list', status, persona, scope],
    queryFn: async () => (await apiClient.get<RunListItem[]>('/runs', { params: { status, persona, scope } })).data,
  });
}

export function useRunDetail(runId: string | undefined) {
  return useQuery({
    queryKey: ['runs', 'detail', runId],
    queryFn: async () => (await apiClient.get<RunDetail>(`/runs/${runId}`)).data,
    enabled: !!runId,
    refetchInterval: (query) => (query.state.data?.isLive ? 3000 : false),
  });
}

export function usePauseRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => (await apiClient.post(`/runs/${runId}/pause`)).data,
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({ queryKey: ['runs', 'detail', runId] });
      queryClient.invalidateQueries({ queryKey: ['runs', 'list'] });
    },
  });
}

export function useResumeRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => (await apiClient.post(`/runs/${runId}/resume`)).data,
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({ queryKey: ['runs', 'detail', runId] });
      queryClient.invalidateQueries({ queryKey: ['runs', 'list'] });
    },
  });
}

export function useRunExceptions(status: ExceptionStatus | 'all' = 'all') {
  return useQuery({
    queryKey: ['runs', 'exceptions', status],
    queryFn: async () => (await apiClient.get<RunException[]>('/runs/exceptions', { params: { status } })).data,
  });
}

export function useResolveException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<RunException>(`/runs/exceptions/${id}/resolve`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['runs', 'exceptions'] }),
  });
}

export function useRunChases() {
  return useQuery({
    queryKey: ['runs', 'chases'],
    queryFn: async () => (await apiClient.get<ChaseEscalation[]>('/runs/chases')).data,
  });
}

export function useFlagRunFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { runId: string; text: string }) =>
      (await apiClient.post<ChaseEscalation>(`/runs/${vars.runId}/flag-feedback`, { text: vars.text })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['runs', 'chases'] }),
  });
}
