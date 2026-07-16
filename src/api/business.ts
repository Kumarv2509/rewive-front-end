import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { BusinessContext } from './types';

// The base data the mandates stand on: what the company is, what it sells,
// to whom, and the P&L view lives next door (Decisions · FP&A). Context is
// company-wide — the lens does not partition it.
export function useBusinessContext() {
  return useQuery({
    queryKey: ['business-context'],
    queryFn: async () => (await apiClient.get<BusinessContext>('/business-context')).data,
  });
}
