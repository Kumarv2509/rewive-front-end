import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { CustomKpiInput, KpiCatalogEntry, KpiSegment, PlanningImportResult, TrackedKpi } from './types';

export function useKpiCatalog(segment?: KpiSegment | 'all') {
  return useQuery({
    queryKey: ['kpi-catalog', segment],
    queryFn: async () => (await apiClient.get<KpiCatalogEntry[]>('/kpi-catalog', { params: { segment } })).data,
  });
}

export function useTrackedKpis() {
  return useQuery({
    queryKey: ['tracked-kpis'],
    queryFn: async () => (await apiClient.get<TrackedKpi[]>('/tracked-kpis')).data,
  });
}

export function useTrackKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kpiId: string) => (await apiClient.post<TrackedKpi>('/tracked-kpis', { kpiId })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracked-kpis'] }),
  });
}

export function useAddCustomKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomKpiInput) => (await apiClient.post<TrackedKpi>('/tracked-kpis/custom', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracked-kpis'] }),
  });
}

export function useUntrackKpi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete(`/tracked-kpis/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracked-kpis'] }),
  });
}

export function useImportPlanningData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) =>
      (await apiClient.post<PlanningImportResult>(`/connections/${connectionId}/import-planning-data`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracked-kpis'] }),
  });
}
