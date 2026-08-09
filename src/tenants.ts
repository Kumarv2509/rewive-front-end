import type { IndustryKey } from './api/types';
import { getActiveIndustry, clearActiveIndustry, clearAuthToken } from './api/client';

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
      '26 numbers watched by paired agents across 4 divisions',
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
      '22 numbers watched by paired agents across 6 streams',
      'Al Safa · Sharjah medical centres · JLT day surgery',
      'Currency AED · CFO to clinic manager',
    ],
  },
  {
    id: 'gulfmart',
    name: 'GulfMart Hypermarkets (demo)',
    mark: 'GM',
    industry: 'hypermarket',
    industryLabel: 'Hypermarket retail',
    accent: '#1D6F42',
    domain: 'gulfmart.ae',
    tagline: 'Store operations, merchandising, supply chain, e-commerce and customer across a multi-site UAE network.',
    proofPoints: [
      '21 numbers watched by paired agents across 6 streams',
      'Ibn Battuta · Al Wahda — Sharjah · Yas Mall — Abu Dhabi · GulfMart Online',
      'Currency AED · COO to store manager',
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
      '17 numbers watched by paired agents across 6 streams',
      'Plant 1 — Jebel Ali · Plant 2 — Dammam',
      'Currency USD · COO to quality manager',
    ],
  },
];

const TENANT_KEY = 'rewive.tenant';
const CUSTOM_TENANT_KEY = 'rewive.customTenant';

// The onboarding factory's runtime-created organization. Stored client-side so
// tenant resolution stays synchronous (RequireTenant has no loading state);
// the server holds the matching world model under the 'custom' industry key.
export interface CustomTenantSession extends Tenant {
  /** Per-role label overrides chosen at onboarding (People step). */
  labelOverrides?: Partial<Record<string, string>>;
}

export function getCustomTenant(): CustomTenantSession | null {
  try {
    const raw = localStorage.getItem(CUSTOM_TENANT_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as CustomTenantSession;
    return t && t.id && t.name ? t : null;
  } catch { return null; }
}

export function setCustomTenant(tenant: CustomTenantSession) {
  try { localStorage.setItem(CUSTOM_TENANT_KEY, JSON.stringify(tenant)); } catch { /* ignore */ }
}

/** Static tenants plus the onboarded one, for pickers. */
export function allTenants(): Tenant[] {
  const custom = getCustomTenant();
  return custom ? [...TENANTS, custom] : TENANTS;
}

export function tenantById(id: string | null | undefined): Tenant | null {
  return allTenants().find((t) => t.id === id) ?? null;
}

/**
 * Resolve organizations from what a signing-in user knows — the org's name, its
 * workspace id, or their work email. The front door never lists tenants (a
 * multi-tenant product doesn't show one customer the others), so this lookup is
 * how the right org is found. Returns all matches so the caller can tell
 * "found", "ambiguous" and "unknown" apart.
 */
export function findTenants(query: string): Tenant[] {
  // Normalize both sides the same way, or the name the product itself displays
  // ("Medcare UAE (demo)") fails to match its own tenant.
  const norm = (s: string) => s.toLowerCase().replace(/\(demo\)/g, '').trim();
  const q = norm(query);
  if (!q) return [];
  const tenants = allTenants();
  if (q.includes('@')) {
    const domain = q.split('@').pop()!.trim();
    const byDomain = tenants.filter((t) => {
      const d = t.domain.toLowerCase();
      return d === domain || domain.endsWith(`.${d}`);
    });
    if (byDomain.length) return byDomain;
    // No tenant owns that domain — e.g. an onboarded org whose stored domain is
    // the derived "<slug>.example" placeholder. Fall back to matching the
    // domain's stem against org names so "you@acmefoods.com" finds "Acme Foods"
    // instead of dead-ending at "set up a new one" (which would overwrite it).
    const squash = (s: string) => s.replace(/[^a-z0-9]/g, '');
    const stem = squash(domain.split('.')[0] ?? '');
    return stem ? tenants.filter((t) => squash(norm(t.name)).includes(stem)) : [];
  }
  const exact = tenants.filter((t) => t.id === q || norm(t.name) === q || t.domain.toLowerCase() === q);
  if (exact.length) return exact;
  return tenants.filter((t) => norm(t.name).includes(q) || t.domain.toLowerCase().includes(q));
}

export function tenantForIndustry(industry: string | null): Tenant | null {
  return allTenants().find((t) => t.industry === industry) ?? null;
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
  // Switching organization is a sign-out: the old org's token must not keep
  // outranking the next org's ?industry= on the API.
  clearAuthToken();
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
