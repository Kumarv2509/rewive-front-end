import type { IndustryKey } from './api/types';
import { getActiveIndustry, clearActiveIndustry } from './api/client';

// SaaS tenancy, demo-grade: each organization (tenant) is a workspace that maps
// onto one industry pack. Signing in as an org sets the industry context and
// brands the chrome; teams inside the org are the existing persona roles.
export interface Tenant {
  id: string;
  name: string;
  /** Short mark for the logo square. */
  mark: string;
  industry: IndustryKey;
  industryLabel: string;
  /** Flat brand color (paper-ledger theme: no gradients). */
  accent: string;
  /** Demo email domain, used to prefill the sign-in form. */
  domain: string;
  tagline: string;
  /** Brand-panel proof lines shown on the login screen. */
  proofPoints: string[];
}

export const TENANTS: Tenant[] = [
  {
    id: 'americana',
    name: 'Americana Foods',
    mark: 'AF',
    industry: 'fmcg',
    industryLabel: 'FMCG / food & beverage',
    accent: '#8A3B12',
    domain: 'americanafoods.com',
    tagline: 'Manufacturing, distribution and trade across modern and traditional channels.',
    proofPoints: [
      '26 mandates held twice across 4 divisions',
      'Protein, G&I, Fruits & Vegetables, Ambient Foods',
      'Currency AED · Group CEO to store manager',
    ],
  },
  {
    id: 'medcare-uae',
    name: 'Medcare UAE (demo)',
    mark: 'MC',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    accent: '#0E7C6B',
    domain: 'medcare.ae',
    tagline: 'Clinical operations, revenue cycle, patient experience, pharmacy, finance and people across Dubai, Sharjah and Abu Dhabi.',
    proofPoints: [
      '22 mandates held twice across 6 streams',
      'Al Safa · Sharjah medical centres · JLT day surgery',
      'Currency AED · CFO to clinic manager',
    ],
  },
  {
    id: 'gulf-precision',
    name: 'Gulf Precision Industries',
    mark: 'GP',
    industry: 'manufacturing',
    industryLabel: 'Manufacturing',
    accent: '#1B4B72',
    domain: 'gulfprecision.com',
    tagline: 'Discrete manufacturing: production, maintenance, supplier network, quality and safety across two plants.',
    proofPoints: [
      '17 mandates held twice across 6 streams',
      'Plant 1 — Jebel Ali · Plant 2 — Dammam',
      'Currency USD · COO to quality manager',
    ],
  },
];

const TENANT_KEY = 'rewive.tenant';

export function tenantById(id: string | null | undefined): Tenant | null {
  return TENANTS.find((t) => t.id === id) ?? null;
}

export function tenantForIndustry(industry: string | null): Tenant | null {
  return TENANTS.find((t) => t.industry === industry) ?? null;
}

export function setActiveTenantId(id: string) {
  try { localStorage.setItem(TENANT_KEY, id); } catch { /* ignore */ }
}

export function clearActiveTenant() {
  try { localStorage.removeItem(TENANT_KEY); } catch { /* ignore */ }
  // Also drop the industry, or getActiveTenant() re-derives the tenant from the
  // surviving industry key and silently re-signs the user in — making "Switch
  // organization" (and the RequireTenant gate) a no-op after the first session.
  clearActiveIndustry();
}

/**
 * The signed-in organization. The industry choice stays authoritative: if the
 * industry was switched in-app (Foundation → Operating Picture) or the session
 * predates tenancy, adopt the tenant that owns the active industry so the
 * chrome never claims one org while showing another's data.
 */
export function getActiveTenant(): Tenant | null {
  let stored: string | null = null;
  try { stored = localStorage.getItem(TENANT_KEY); } catch { /* ignore */ }
  const tenant = tenantById(stored);
  const industryTenant = tenantForIndustry(getActiveIndustry());
  if (industryTenant && industryTenant.id !== tenant?.id) {
    setActiveTenantId(industryTenant.id);
    return industryTenant;
  }
  return tenant ?? industryTenant;
}
