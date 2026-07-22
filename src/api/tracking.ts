import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  CreatedIngestKey,
  IngestKey,
  MandateTrackingConfig,
  MetricImportResult,
  MetricPoint,
  SweepProgress,
  SweepRun,
} from './types';

// ---------- Tracking configs (which mandates are live-tracked) ----------
export function useTrackingConfigs() {
  return useQuery({
    queryKey: ['tracking-configs'],
    queryFn: async () => (await apiClient.get<MandateTrackingConfig[]>('/tracking-configs')).data,
  });
}

export type UpsertTrackingConfigInput = Partial<MandateTrackingConfig> & {
  nodeId: string;
  targetNumeric: number;
};

export function useUpsertTrackingConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ nodeId, ...body }: UpsertTrackingConfigInput) =>
      (await apiClient.put<MandateTrackingConfig>(`/tracking-configs/${nodeId}`, body)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-configs'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-brain'] });
    },
  });
}

// ---------- Metric points ----------
export function useNodeMetrics(nodeId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ['metrics', nodeId, limit],
    queryFn: async () => (await apiClient.get<MetricPoint[]>(`/metrics/${nodeId}`, { params: { limit } })).data,
    enabled: !!nodeId,
  });
}

export interface MetricImportInput {
  filename: string;
  rows: { nodeId: string; ts: string; value: number }[];
}

/** Posts pre-parsed spreadsheet rows in chunks (the browser does the CSV/XLSX parse). */
export function useImportMetricRows() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ filename, rows }: MetricImportInput) => {
      const CHUNK = 1000;
      const total: MetricImportResult = { accepted: 0, rejected: [] };
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { data } = await apiClient.post<MetricImportResult>('/metrics/import', {
          filename,
          rows: rows.slice(i, i + CHUNK),
        });
        total.accepted += data.accepted;
        total.rejected.push(...data.rejected.map((r) => ({ ...r, index: r.index + i })));
      }
      return total;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-brain'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-configs'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

// ---------- Ingest keys ----------
export function useIngestKeys() {
  return useQuery({
    queryKey: ['ingest-keys'],
    queryFn: async () => (await apiClient.get<IngestKey[]>('/ingest-keys')).data,
  });
}

export function useCreateIngestKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label: string) => (await apiClient.post<CreatedIngestKey>('/ingest-keys', { label })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingest-keys'] }),
  });
}

export function useRevokeIngestKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete(`/ingest-keys/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ingest-keys'] }),
  });
}

// ---------- Agent sweep ----------
export function useSweepRuns() {
  return useQuery({
    queryKey: ['sweep-runs'],
    queryFn: async () => (await apiClient.get<SweepRun[]>('/sweep-runs')).data,
    refetchInterval: 30_000,
  });
}

/**
 * The live analysis trail. Polls fast while a sweep is in flight and backs off
 * to a slow heartbeat once it finishes — same shape as the live-run poll in
 * `runs.ts`, so an idle Findings screen costs one request a minute.
 */
/**
 * Pass `sweeping` while a trigger mutation is in flight. Polling on the data
 * alone is a chicken-and-egg: POST /agent-sweep is synchronous and holds the
 * request for the entire run (~13s), so until it resolves the cache still holds
 * the PREVIOUS, finished run — which reads as idle and sits on the 20s poll.
 * That is longer than the sweep itself, so the strip would miss the whole run
 * and only learn about it after the fact, never rendering a live state.
 */
export function useSweepProgress(sweeping = false) {
  return useQuery({
    queryKey: ['sweep-progress'],
    queryFn: async () => (await apiClient.get<SweepProgress | null>('/sweep-progress')).data,
    refetchInterval: (query) =>
      (sweeping || (query.state.data && !query.state.data.finishedAt) ? 1_200 : 20_000),
  });
}

export function useRunSweepNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiClient.post<SweepRun>('/agent-sweep')).data,
    onSuccess: () => {
      // Includes sweep-progress so the strip lands on the finished run at once
      // rather than waiting out its poll interval.
      queryClient.invalidateQueries({ queryKey: ['sweep-progress'] });
      queryClient.invalidateQueries({ queryKey: ['sweep-runs'] });
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['shadow-org'] });
      queryClient.invalidateQueries({ queryKey: ['closure-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-brain'] });
    },
  });
}
