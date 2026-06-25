import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AgentWorkflow, SimulationResult, StudioEdge, StudioNode } from './types';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => (await apiClient.get<AgentWorkflow[]>('/workflows')).data,
  });
}

export function useWorkflow(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflows', workflowId],
    queryFn: async () => (await apiClient.get<AgentWorkflow>(`/workflows/${workflowId}`)).data,
    enabled: !!workflowId,
  });
}

export function useCreateWorkflow() {
  return useMutation({
    mutationFn: async (name?: string) => (await apiClient.post<AgentWorkflow>('/workflows', { name })).data,
  });
}

export function useSaveWorkflow(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { name?: string; nodes?: StudioNode[]; edges?: StudioEdge[] }) =>
      (await apiClient.put<AgentWorkflow>(`/workflows/${workflowId}`, patch)).data,
    onSuccess: (data) => queryClient.setQueryData(['workflows', workflowId], data),
  });
}

export function useGenerateProcessPrompt(workflowId: string) {
  return useMutation({
    mutationFn: async (vars: { nodeId: string; instructions: string }) =>
      (
        await apiClient.post<{ generatedPrompt: string }>(
          `/workflows/${workflowId}/nodes/${vars.nodeId}/generate-prompt`,
          { instructions: vars.instructions }
        )
      ).data,
  });
}

export function useSimulateWorkflow(workflowId: string) {
  return useMutation({
    mutationFn: async () => (await apiClient.post<SimulationResult>(`/workflows/${workflowId}/simulate`)).data,
  });
}

export function usePublishWorkflow(workflowId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<AgentWorkflow & { agentId: string }>(`/workflows/${workflowId}/publish`)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['workflows', workflowId], data);
      queryClient.invalidateQueries({ queryKey: ['agents', 'catalog'] });
    },
  });
}
