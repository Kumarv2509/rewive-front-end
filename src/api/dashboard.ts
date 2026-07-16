import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { CurrentUser, DashboardSummary, PendingDecision, Persona, PulseItem, LiveRunSummary, RoleScope, TopPerformer } from './types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<CurrentUser>('/me')).data,
    staleTime: Infinity,
  });
}

// Greeting + summary sentence only — Today's stats are computed client-side
// from role-scoped findings / approvals / decision-stats.
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => (await apiClient.get<DashboardSummary>('/dashboard/summary')).data,
  });
}

export function usePendingDecisions(persona?: Persona | 'all', scope?: RoleScope) {
  return useQuery({
    queryKey: ['decisions', 'pending', persona, scope],
    queryFn: async () => (await apiClient.get<PendingDecision[]>('/decisions/pending', { params: { persona, scope } })).data,
  });
}

export function usePulse() {
  return useQuery({
    queryKey: ['pulse'],
    queryFn: async () => (await apiClient.get<PulseItem[]>('/pulse')).data,
  });
}

export function useLiveRuns(persona?: Persona | 'all', scope?: RoleScope) {
  return useQuery({
    queryKey: ['runs', 'live', persona, scope],
    queryFn: async () => (await apiClient.get<LiveRunSummary[]>('/runs/live', { params: { persona, scope } })).data,
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
