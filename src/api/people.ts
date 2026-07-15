import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { LeaderboardHighlight, LeaderboardRow, LoopSpeedRow, Persona, RoleScope } from './types';

export function useLeaderboardHighlights() {
  return useQuery({
    queryKey: ['leaderboard', 'highlights'],
    queryFn: async () => (await apiClient.get<LeaderboardHighlight[]>('/leaderboard/highlights')).data,
  });
}

export function useLoopSpeed(persona?: Persona | 'all', scope?: RoleScope) {
  return useQuery({
    queryKey: ['leaderboard', 'loop-speed', persona, scope],
    queryFn: async () => (await apiClient.get<LoopSpeedRow[]>('/leaderboard/loop-speed', { params: { persona, scope } })).data,
  });
}

export function useLeaderboard(type: 'all' | 'human' | 'agent' = 'all', persona?: Persona | 'all', scope?: RoleScope) {
  return useQuery({
    queryKey: ['leaderboard', 'rows', type, persona, scope],
    queryFn: async () => (await apiClient.get<LeaderboardRow[]>('/leaderboard', { params: { type, persona, scope } })).data,
  });
}
