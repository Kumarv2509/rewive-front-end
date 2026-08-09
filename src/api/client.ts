import axios from 'axios';

// The chosen operating context, kept client-side. On serverless hosting the mock
// API's in-memory org profile can reset on a cold start, so we send the industry
// as a query param on every request — the server honours ?industry= (see
// v4Industry) and returns the right context regardless of persisted state.
const INDUSTRY_KEY = 'rewive.industry';
// The session token (auth seam, ARCH-GTM-001 P1.1): minted by POST /auth/login,
// carried as a Bearer on every request. The server treats its claims as more
// authoritative than ?industry=. Absent token = legacy demo mode.
const TOKEN_KEY = 'rewive.token';

export function setAuthToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}
export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function clearAuthToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

// The token's claims (P1.2 — claims-driven tenancy): the client derives who is
// signed in from the token itself, not from separately-stored state. Decoding
// here is display/derivation only — the signature is the server's to verify;
// a tampered claim buys nothing because every API response is claims-scoped
// server-side.
export interface AuthClaims {
  sub: string;      // email
  tid: string;      // tenant id
  industry: string;
  seat: string;     // persona role picked at sign-in
  exp: number;
}

/** Claims of the held session token, or null. An expired or malformed token is
 * cleared on read so every consumer sees the same answer — the same fallback
 * the 401 interceptor provides, without waiting for a request to fail. */
export function getAuthClaims(): AuthClaims | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as AuthClaims;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) {
      clearAuthToken();
      return null;
    }
    return claims;
  } catch {
    clearAuthToken();
    return null;
  }
}

export function setActiveIndustry(industry: string) {
  try { localStorage.setItem(INDUSTRY_KEY, industry); } catch { /* ignore */ }
}
export function getActiveIndustry(): string | null {
  try { return localStorage.getItem(INDUSTRY_KEY); } catch { return null; }
}
export function clearActiveIndustry() {
  try { localStorage.removeItem(INDUSTRY_KEY); } catch { /* ignore */ }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const industry = getActiveIndustry();
  if (industry) {
    config.params = { industry, ...(config.params ?? {}) };
  }
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired/invalid token must not wedge the app: drop it and let the request
// layer fall back to legacy demo mode on the next call. RequireTenant still
// gates the routes; the user just signs in again.
apiClient.interceptors.response.use(undefined, (error) => {
  if (error?.response?.status === 401 && getAuthToken()) clearAuthToken();
  return Promise.reject(error);
});
