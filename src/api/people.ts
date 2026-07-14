import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { LeaderboardHighlight, LeaderboardRow, LoopSpeedRow } from './types';

export function useLeaderboardHighlights() {
  return useQuery({
    queryKey: ['leaderboard', 'highlights'],
    queryFn: async () => (await apiClient.get<LeaderboardHighlight[]>('/leaderboard/highlights')).data,
  });
}

export function useLoopSpeed() {
  return useQuery({
    queryKey: ['leaderboard', 'loop-speed'],
    queryFn: async () => (await apiClient.get<LoopSpeedRow[]>('/leaderboard/loop-speed')).data,
  });
}

export function useLeaderboard(type: 'all' | 'human' | 'agent' = 'all') {
  return useQuery({
    queryKey: ['leaderboard', 'rows', type],
    queryFn: async () => (await apiClient.get<LeaderboardRow[]>('/leaderboard', { params: { type } })).data,
  });
}
