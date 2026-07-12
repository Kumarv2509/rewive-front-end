import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { SuggestedSignal, DatasetSignalCoverage, SignalDetail, Persona } from './types';

export function useSignalDetail(signalId: string | undefined) {
  return useQuery({
    queryKey: ['signals', signalId, 'detail'],
    queryFn: async () => (await apiClient.get<SignalDetail>(`/signals/${signalId}/detail`)).data,
    enabled: !!signalId,
  });
}

export function useSuggestedSignals(connectionId?: string, persona?: Persona | 'all') {
  return useQuery({
    queryKey: ['signals', 'suggested', connectionId, persona],
    queryFn: async () => (await apiClient.get<SuggestedSignal[]>('/signals/suggested', { params: { connectionId, persona } })).data,
  });
}

export function useDatasetSignalCoverage(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['connections', connectionId, 'signal-coverage'],
    queryFn: async () => (await apiClient.get<DatasetSignalCoverage>(`/connections/${connectionId}/signal-coverage`)).data,
    enabled: !!connectionId,
  });
}

export function useRequestUnmask(signalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<SignalDetail>(`/signals/${signalId}/request-unmask`)).data,
    onSuccess: (updated) => queryClient.setQueryData(['signals', signalId, 'detail'], updated),
  });
}

export function useRequestSimilarAccess(signalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string) => (await apiClient.post<SignalDetail>(`/signals/${signalId}/similar/${matchId}/request-access`)).data,
    onSuccess: (updated) => queryClient.setQueryData(['signals', signalId, 'detail'], updated),
  });
}
