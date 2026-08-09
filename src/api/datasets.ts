import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AnalysisRequest, Dataset, RegisterDatasetInput } from './types';

// The dataset registry: placeholder slots for the data to come, plus staged
// uploads. Company-wide like the business context — the lens does not
// partition it.
export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: async () => (await apiClient.get<Dataset[]>('/datasets')).data,
    refetchInterval: 30_000, // 'live' datasets get fresh loads from the heartbeat
  });
}

export function useRegisterDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterDatasetInput) => (await apiClient.post<Dataset>('/datasets', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['datasets'] }),
  });
}

export function useAnalysisRequests() {
  return useQuery({
    queryKey: ['analysis-requests'],
    queryFn: async () => (await apiClient.get<AnalysisRequest[]>('/analysis-requests')).data,
  });
}

export function useQueueAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { datasetId: string | null; question: string }) =>
      (await apiClient.post<AnalysisRequest>('/analysis-requests', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analysis-requests'] }),
  });
}
