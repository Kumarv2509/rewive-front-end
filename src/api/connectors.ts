import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  ConnectorType,
  CreateCustomConnectorTypeInput,
  DataConnection,
  ConnectionStatus,
  CreateConnectionInput,
} from './types';

export function useConnectorTypes() {
  return useQuery({
    queryKey: ['connector-types'],
    queryFn: async () => (await apiClient.get<ConnectorType[]>('/connector-types')).data,
  });
}

export function useCreateCustomConnectorType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomConnectorTypeInput) =>
      (await apiClient.post<ConnectorType>('/connector-types', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connector-types'] }),
  });
}

export function useConnections(filters: { status?: ConnectionStatus | 'all' } = {}) {
  return useQuery({
    queryKey: ['connections', filters],
    queryFn: async () => (await apiClient.get<DataConnection[]>('/connections', { params: filters })).data,
  });
}

export function useApprovedConnections() {
  const { data, ...rest } = useConnections();
  return {
    ...rest,
    data: data?.filter((c) => c.status === 'approved' || c.status === 'active'),
  };
}

export function useCreateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateConnectionInput) =>
      (await apiClient.post<DataConnection>('/connections', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  });
}

export function useApproveConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<DataConnection>(`/connections/${id}/approve`)).data,
    onSuccess: (updated) => {
      queryClient.setQueriesData<DataConnection[]>({ queryKey: ['connections'] }, (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev
      );
    },
  });
}

export function useRejectConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<DataConnection>(`/connections/${id}/reject`)).data,
    onSuccess: (updated) => {
      queryClient.setQueriesData<DataConnection[]>({ queryKey: ['connections'] }, (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev
      );
    },
  });
}
