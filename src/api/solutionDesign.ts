import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { QuickSolution, SolutionDesign, SolutionTask, SolutionTaskStatus, TaskChannel } from './types';

export function useSolutionDesign(id: string | undefined) {
  return useQuery({
    queryKey: ['solutions', id],
    queryFn: async () => (await apiClient.get<SolutionDesign>(`/solutions/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateSolutionDesign() {
  return useMutation({
    mutationFn: async (signalId: string) => (await apiClient.post<SolutionDesign>('/solutions', { signalId })).data,
  });
}

function useSolutionMutation(id: string, path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body?: Record<string, unknown>) =>
      (await apiClient.post<SolutionDesign>(`/solutions/${id}${path}`, body)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['solutions', id], updated);
    },
  });
}

export function useCopySolution(id: string) {
  return useSolutionMutation(id, '/copy');
}

export function useRunValidation(id: string) {
  return useSolutionMutation(id, '/run-validation');
}

export function useSendForApproval(id: string) {
  return useSolutionMutation(id, '/send-for-approval');
}

export function useApproveSolution(id: string) {
  return useSolutionMutation(id, '/approve');
}

// ---------- Solution in hand (fast path — reviewer already has a fix) ----------
export function useCreateQuickSolution() {
  return useMutation({
    mutationFn: async (vars: { signalId: string; description: string }) =>
      (await apiClient.post<QuickSolution>('/quick-solutions', vars)).data,
  });
}

export function useQuickSolution(id: string | undefined) {
  return useQuery({
    queryKey: ['quick-solutions', id],
    queryFn: async () => (await apiClient.get<QuickSolution>(`/quick-solutions/${id}`)).data,
    enabled: !!id,
  });
}

export function useConfirmQuickSolution(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<QuickSolution>(`/quick-solutions/${id}/confirm`)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['quick-solutions', id], updated);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ---------- Tasks (assigned across all solution designs, "Operate → Tasks") ----------
export function useTasks(status?: SolutionTaskStatus | 'all') {
  return useQuery({
    queryKey: ['tasks', status],
    queryFn: async () => (await apiClient.get<SolutionTask[]>('/tasks', { params: { status } })).data,
  });
}

export function useAddTaskFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; text: string }) =>
      (await apiClient.post<SolutionTask>(`/tasks/${vars.taskId}/feedback`, { text: vars.text })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; status: SolutionTaskStatus }) =>
      (await apiClient.patch<SolutionTask>(`/tasks/${vars.taskId}/status`, { status: vars.status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTaskChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { taskId: string; channel: TaskChannel }) =>
      (await apiClient.patch<SolutionTask>(`/tasks/${vars.taskId}/channel`, { channel: vars.channel })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
