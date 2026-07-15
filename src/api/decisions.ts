import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { DecisionLedgerItem, DecisionStats, PendingDecision, Persona, PlImpactLine, PlStatement, RoleScope } from './types';

export function useDecisionStats() {
  return useQuery({
    queryKey: ['decisions', 'stats'],
    queryFn: async () => (await apiClient.get<DecisionStats>('/decisions/stats')).data,
  });
}

// The full P&L: lines × SKU/channel, Actual vs Budget vs Forecast, with the
// drift anomalies embedded as a task list.
export function usePlStatement() {
  return useQuery({
    queryKey: ['decisions', 'pl-statement'],
    queryFn: async () => (await apiClient.get<PlStatement>('/pl-statement')).data,
  });
}

// FP&A rollup: findings translated onto the P&L, per line item.
export function usePlImpact() {
  return useQuery({
    queryKey: ['decisions', 'pl-impact'],
    queryFn: async () => (await apiClient.get<PlImpactLine[]>('/pl-impact')).data,
  });
}

export interface DecisionLedgerFilters {
  function?: 'all' | 'finance' | 'hr' | 'procurement';
  verdict?: 'all' | 'worked' | 'not_worked';
  persona?: Persona | 'all';
  scope?: RoleScope;
}

export function useDecisionLedger(filters: DecisionLedgerFilters = {}) {
  return useQuery({
    queryKey: ['decisions', 'ledger', filters],
    queryFn: async () =>
      (await apiClient.get<DecisionLedgerItem[]>('/decisions', { params: filters })).data,
  });
}

export function useApproveDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (decisionId: string) =>
      (await apiClient.post<PendingDecision>(`/decisions/${decisionId}/approve`)).data,
    onSuccess: (_data, decisionId) => {
      queryClient.setQueryData<PendingDecision[]>(['decisions', 'pending'], (prev) =>
        prev ? prev.filter((d) => d.id !== decisionId) : prev
      );
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
