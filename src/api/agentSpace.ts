import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AgentCatalogEntry, AgentCatalogFilters } from './types';

export function useAgentCatalog(filters: AgentCatalogFilters = {}) {
  return useQuery({
    queryKey: ['agents', 'catalog', filters],
    queryFn: async () => (await apiClient.get<AgentCatalogEntry[]>('/agents/catalog', { params: filters })).data,
  });
}

export function useAgentCatalogEntry(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agents', 'catalog-detail', agentId],
    queryFn: async () => (await apiClient.get<AgentCatalogEntry>(`/agents/${agentId}/catalog-detail`)).data,
    enabled: !!agentId,
  });
}
