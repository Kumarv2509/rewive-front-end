import { useQuery } from '@tanstack/react-query';
import { builderClient } from './client';
import type { DashboardResponse } from './types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await builderClient.post<DashboardResponse>('/dashboard/v1/execute', { name: 'Operations Dashboard' })).data,
  });
}
