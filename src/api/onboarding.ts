import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { OnboardingCommitInput, OnboardingCommitResult, OnboardingDraft, OnboardingDraftInput } from './types';

export function useOnboardingDraft() {
  return useMutation({
    mutationFn: async (input: OnboardingDraftInput) => {
      const { data } = await apiClient.post<OnboardingDraft>('/onboarding/draft', input);
      return data;
    },
  });
}

export function useOnboardingCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OnboardingCommitInput) => {
      const { data } = await apiClient.post<OnboardingCommitResult>('/onboarding/commit', input);
      return data;
    },
    // A whole organization just came into being — nothing cached survives it.
    onSuccess: () => queryClient.clear(),
  });
}
