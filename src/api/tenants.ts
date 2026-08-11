import { apiClient } from './client';
import type { CustomTenantSession } from '../tenants';

// Server-side organization resolution for the front door. The four seeded
// tenants are a front-end asset (findTenants in src/tenants.ts); an *onboarded*
// org exists only in the browser that created it, so every other browser needs
// the server to answer for it — otherwise /login resolves the nearest seeded
// name and signs the user into the wrong company.
//
// Plain async, not a hook: step 1 of /login is a form submit, not a render.
export async function resolveTenants(query: string): Promise<CustomTenantSession[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const { data } = await apiClient.get<{ tenants: CustomTenantSession[] }>('/tenants/resolve', {
      params: { q },
    });
    return (data?.tenants ?? []).filter((t) => t && t.id && t.name);
  } catch {
    // The front door must still work against a server that doesn't know this
    // route (or is down) — fall back to whatever the client can resolve alone.
    return [];
  }
}
