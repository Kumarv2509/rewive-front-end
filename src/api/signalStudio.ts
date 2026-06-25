import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  SuggestedSignal,
  ReviewCommitteeMember,
  TrackedKpiTicket,
  ItsmStatus,
  DatasetSignalCoverage,
} from './types';

export function useSuggestedSignals(connectionId?: string) {
  return useQuery({
    queryKey: ['signals', 'suggested', connectionId],
    queryFn: async () => (await apiClient.get<SuggestedSignal[]>('/signals/suggested', { params: { connectionId } })).data,
  });
}

export function useReviewCommittee() {
  return useQuery({
    queryKey: ['signals', 'committee'],
    queryFn: async () => (await apiClient.get<ReviewCommitteeMember[]>('/signals/committee')).data,
  });
}

export function useSubmitSignalForReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<SuggestedSignal>(`/signals/${id}/submit-for-review`)).data,
    onSuccess: (updated) => {
      queryClient.setQueriesData<SuggestedSignal[]>({ queryKey: ['signals', 'suggested'] }, (prev) =>
        prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev
      );
    },
  });
}

export function useApproveSignal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; approverUserId: string }) =>
      (await apiClient.post<SuggestedSignal>(`/signals/${vars.id}/approve`, { approverUserId: vars.approverUserId })).data,
    onSuccess: (updated) => {
      queryClient.setQueriesData<SuggestedSignal[]>({ queryKey: ['signals', 'suggested'] }, (prev) =>
        prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev
      );
      queryClient.invalidateQueries({ queryKey: ['kpi-tickets'] });
    },
  });
}

export function useRejectSignal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<SuggestedSignal>(`/signals/${id}/reject`)).data,
    onSuccess: (updated) => {
      queryClient.setQueriesData<SuggestedSignal[]>({ queryKey: ['signals', 'suggested'] }, (prev) =>
        prev ? prev.map((s) => (s.id === updated.id ? updated : s)) : prev
      );
    },
  });
}

export function useKpiTickets(filters: { status?: ItsmStatus | 'all' } = {}) {
  return useQuery({
    queryKey: ['kpi-tickets', filters],
    queryFn: async () => (await apiClient.get<TrackedKpiTicket[]>('/kpi-tickets', { params: filters })).data,
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: ItsmStatus }) =>
      (await apiClient.patch<TrackedKpiTicket>(`/kpi-tickets/${vars.id}/status`, { status: vars.status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi-tickets'] }),
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; text: string }) =>
      (await apiClient.post<TrackedKpiTicket>(`/kpi-tickets/${vars.id}/comments`, { text: vars.text })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi-tickets'] }),
  });
}

export function useDatasetSignalCoverage(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['connections', connectionId, 'signal-coverage'],
    queryFn: async () => (await apiClient.get<DatasetSignalCoverage>(`/connections/${connectionId}/signal-coverage`)).data,
    enabled: !!connectionId,
  });
}
