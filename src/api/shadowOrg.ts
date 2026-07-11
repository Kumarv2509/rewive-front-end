import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, setActiveIndustry } from './client';
import type {
  ClosureKpi,
  CustomBrainNodeInput,
  DispositionInput,
  Finding,
  FindingStatus,
  IndustryOption,
  KpiBrain,
  OrgProfile,
  Persona,
  ShadowOrg,
  UpdateBrainNodeInput,
} from './types';

// ---------- Org profile & industry templates ----------
export function useOrgProfile() {
  return useQuery({
    queryKey: ['org-profile'],
    queryFn: async () => (await apiClient.get<OrgProfile>('/org-profile')).data,
  });
}

export function useIndustries() {
  return useQuery({
    queryKey: ['industries'],
    queryFn: async () => (await apiClient.get<IndustryOption[]>('/industries')).data,
  });
}

export function useSetIndustry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (industry: OrgProfile['industry']) => {
      setActiveIndustry(industry); // send on every subsequent request (survives serverless cold starts)
      return (await apiClient.put<OrgProfile>('/org-profile', { industry })).data;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['org-profile'], profile);
      // Everything downstream of the brain is industry-scoped.
      queryClient.invalidateQueries({ queryKey: ['kpi-brain'] });
      queryClient.invalidateQueries({ queryKey: ['shadow-org'] });
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['closure-kpis'] });
    },
  });
}

// ---------- KPI brain ----------
export function useKpiBrain() {
  return useQuery({
    queryKey: ['kpi-brain'],
    queryFn: async () => (await apiClient.get<KpiBrain>('/kpi-brain')).data,
  });
}

export function useAddBrainNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomBrainNodeInput) =>
      (await apiClient.post('/kpi-brain/nodes', input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpi-brain'] }),
  });
}

export function useUpdateBrainNode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: UpdateBrainNodeInput) =>
      (await apiClient.patch<KpiBrain>(`/kpi-brain/nodes/${id}`, patch)).data,
    onSuccess: (brain) => queryClient.setQueryData(['kpi-brain'], brain),
  });
}

export function useResolveBrainProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: 'node' | 'edge'; id: string; action: 'accept' | 'decline' }) =>
      (await apiClient.post<KpiBrain>(`/kpi-brain/${input.kind === 'node' ? 'nodes' : 'edges'}/${input.id}/${input.action}`)).data,
    onSuccess: (brain) => queryClient.setQueryData(['kpi-brain'], brain),
  });
}

// ---------- Shadow org ----------
export function useShadowOrg() {
  return useQuery({
    queryKey: ['shadow-org'],
    queryFn: async () => (await apiClient.get<ShadowOrg>('/shadow-org')).data,
    refetchInterval: 30_000,
  });
}

// ---------- Findings ----------
export interface FindingFilters {
  persona?: Persona | 'all';
  stream?: string | 'all';
  status?: FindingStatus | 'all';
}

export function useFindings(filters: FindingFilters = {}) {
  return useQuery({
    queryKey: ['findings', filters],
    queryFn: async () => (await apiClient.get<Finding[]>('/findings', { params: filters })).data,
    refetchInterval: 30_000,
  });
}

export function useFinding(findingId: string | undefined) {
  return useQuery({
    queryKey: ['findings', findingId],
    queryFn: async () => (await apiClient.get<Finding>(`/findings/${findingId}`)).data,
    enabled: !!findingId,
  });
}

export function useDisposeFinding(findingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DispositionInput) =>
      (await apiClient.post<Finding>(`/findings/${findingId}/disposition`, input)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['findings', findingId], updated);
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['shadow-org'] });
      // Accept creates a closure KPI; act creates a solution design.
      queryClient.invalidateQueries({ queryKey: ['closure-kpis'] });
    },
  });
}

export function useEscalateFinding(findingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<Finding>(`/findings/${findingId}/escalate`)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['findings', findingId], updated);
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['shadow-org'] });
    },
  });
}

export function useReAlertFinding(findingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<Finding>(`/findings/${findingId}/re-alert`)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['findings', findingId], updated);
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['shadow-org'] });
    },
  });
}

// ---------- Exit conditions (closure) ----------
export function useClosureKpis() {
  return useQuery({
    queryKey: ['closure-kpis'],
    queryFn: async () => (await apiClient.get<ClosureKpi[]>('/closure-kpis')).data,
    refetchInterval: 30_000,
  });
}

export function useCloseExitCondition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<ClosureKpi>(`/closure-kpis/${id}/close`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closure-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['shadow-org'] });
    },
  });
}
