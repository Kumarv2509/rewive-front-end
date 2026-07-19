import axios from 'axios';

// The chosen operating context, kept client-side. On serverless hosting the mock
// API's in-memory org profile can reset on a cold start, so we send the industry
// as a query param on every request — the server honours ?industry= (see
// v4Industry) and returns the right context regardless of persisted state.
const INDUSTRY_KEY = 'rewive.industry';

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
  return config;
});
