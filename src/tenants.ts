import type { IndustryKey } from './api/types';
import { getActiveIndustry } from './api/client';

// SaaS tenancy, demo-grade: each organization (tenant) is a workspace that maps
// onto one industry pack. Signing in as an org sets the industry context and
// brands the chrome; teams inside the org are the existing persona roles.
// Manufacturing stays hidden until its pack is as deep as the other two.
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
    id: 'metro-health',
    name: 'Metro Health Network',
    mark: 'MH',
    industry: 'healthcare',
    industryLabel: 'Healthcare',
    accent: '#0D6E66',
    domain: 'metrohealth.org',
    tagline: 'Clinical operations, revenue cycle, patient experience, pharmacy, finance and people.',
    proofPoints: [
      '22 mandates held twice across 6 streams',
      'Metro General · Northside Clinics · Lakeside Surgical',
      'Currency USD · COO to sales supervisor',
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
