import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AgentDelegateIdentity, AgentSpec, AgentSpecCapability } from './types';

export function useAgentSpec(id: string | undefined) {
  return useQuery({
    queryKey: ['agent-specs', id],
    queryFn: async () => (await apiClient.get<AgentSpec>(`/agent-specs/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateAgentSpec() {
  return useMutation({
    mutationFn: async (vars: { solutionId: string; taskId: string }) =>
      (await apiClient.post<AgentSpec>('/agent-specs', vars)).data,
  });
}

function useAgentSpecMutation(id: string, path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body?: Record<string, unknown>) =>
      (await apiClient.post<AgentSpec>(`/agent-specs/${id}${path}`, body)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['agent-specs', id], updated);
      queryClient.invalidateQueries({ queryKey: ['agents', 'catalog'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateBusinessAltitude(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { intent?: string; capabilities?: AgentSpecCapability[] }) =>
      (await apiClient.patch<AgentSpec>(`/agent-specs/${id}/business`, vars)).data,
    onSuccess: (updated) => queryClient.setQueryData(['agent-specs', id], updated),
  });
}

export function useUpdateDelegateIdentity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: Partial<AgentDelegateIdentity>) =>
      (await apiClient.patch<AgentSpec>(`/agent-specs/${id}/delegate`, vars)).data,
    onSuccess: (updated) => queryClient.setQueryData(['agent-specs', id], updated),
  });
}

export function useUpdateDeveloperAltitude(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { dataContract?: string[]; permissions?: string[]; guardrails?: string }) =>
      (await apiClient.patch<AgentSpec>(`/agent-specs/${id}/developer`, vars)).data,
    onSuccess: (updated) => queryClient.setQueryData(['agent-specs', id], updated),
  });
}

export function useEscalateAgentSpec(id: string) {
  return useAgentSpecMutation(id, '/escalate');
}

export function useTestRunAgentSpec(id: string) {
  return useAgentSpecMutation(id, '/test-run');
}

export function useHandbackAgentSpec(id: string) {
  return useAgentSpecMutation(id, '/handback');
}

export function usePublishAgentSpec(id: string) {
  return useAgentSpecMutation(id, '/publish');
}
