import { useMutation } from '@tanstack/react-query';
import { apiClient, setAuthToken } from './client';
import type { LoginInput, LoginResponse } from './types';

// Sign-in mints the session token (auth seam, ARCH-GTM-001 P1.1). The token is
// stored on success so every subsequent request carries it as a Bearer — the
// server then trusts the claims over ?industry=.
export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', input);
      setAuthToken(data.token);
      return data;
    },
  });
}
