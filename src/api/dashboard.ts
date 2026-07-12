import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { CurrentUser, DashboardSummary, PendingDecision, Persona, PulseItem, LiveRunSummary, TopPerformer } from './types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<CurrentUser>('/me')).data,
    staleTime: Infinity,
  });
}

export function useDashboardSummary(persona?: Persona | 'all') {
  return useQuery({
    queryKey: ['dashboard', 'summary', persona],
    queryFn: async () => (await apiClient.get<DashboardSummary>('/dashboard/summary', { params: { persona } })).data,
  });
}

export function usePendingDecisions(persona?: Persona | 'all') {
  return useQuery({
    queryKey: ['decisions', 'pending', persona],
    queryFn: async () => (await apiClient.get<PendingDecision[]>('/decisions/pending', { params: { persona } })).data,
  });
}

export function usePulse() {
  return useQuery({
    queryKey: ['pulse'],
    queryFn: async () => (await apiClient.get<PulseItem[]>('/pulse')).data,
  });
}

export function useLiveRuns() {
  return useQuery({
    queryKey: ['runs', 'live'],
    queryFn: async () => (await apiClient.get<LiveRunSummary[]>('/runs/live')).data,
    refetchInterval: 4000,
  });
}

export function useTopPerformer(period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: ['people', 'top-performer', period],
    queryFn: async () =>
      (await apiClient.get<TopPerformer>('/people/top-performer', { params: { period } })).data,
  });
}
