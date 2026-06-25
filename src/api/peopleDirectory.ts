import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PersonDirectoryEntry } from './types';

export function usePeopleDirectory() {
  return useQuery({
    queryKey: ['people', 'directory'],
    queryFn: async () => (await apiClient.get<PersonDirectoryEntry[]>('/people/directory')).data,
  });
}
