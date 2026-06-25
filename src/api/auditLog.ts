import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { AuditEntityType, AuditLogEntry } from './types';

export function useAuditLog(entityType?: AuditEntityType, entityId?: string) {
  return useQuery({
    queryKey: ['audit-log', entityType, entityId],
    queryFn: async () =>
      (await apiClient.get<AuditLogEntry[]>('/audit-log', { params: { entityType, entityId } })).data,
    enabled: !!entityType && !!entityId,
  });
}
