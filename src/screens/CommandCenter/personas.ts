import type { Persona } from '../../api/types';
import { getActiveIndustry } from '../../api/client';

// Personas double as routing roles: every finding is addressed to the role
// whose call it is (see the Persona type for the routing rules).
export const PERSONA_LABEL: Record<Persona, string> = {
  // Group
  group_ceo: 'Group CEO',
  cfo: 'CFO',
  fpa: 'FP&A',
  commercial_finance: 'Commercial finance',
  // Division COOs ('coo' is the Protein division's COO in the FMCG context)
  coo: 'COO',
  coo_gi: 'COO — G&I',
  coo_fnv: 'COO — Fruits & Vegetables',
  coo_ambient: 'COO — Ambient Foods',
  // Protein division
  protein_supply_chain: 'Supply chain — Protein',
  protein_production: 'Production — Protein',
  protein_commercial_finance: 'Commercial finance — Protein',
  protein_analysts: 'Analysts — Protein',
  operations_head: 'Operations head',
  store_manager: 'Store manager',
  sales_supervisor: 'Sales supervisor',
  // G&I division
  gi_supply_chain: 'Supply chain — G&I',
  gi_production: 'Production — G&I',
  gi_commercial_finance: 'Commercial finance — G&I',
  gi_analysts: 'Analysts — G&I',
  // Fruits & Vegetables division
  fnv_supply_chain: 'Supply chain — F&V',
  fnv_production: 'Production — F&V',
  fnv_commercial_finance: 'Commercial finance — F&V',
  fnv_analysts: 'Analysts — F&V',
  // Ambient Foods division
  ambient_supply_chain: 'Supply chain — Ambient',
  ambient_production: 'Production — Ambient',
  ambient_commercial_finance: 'Commercial finance — Ambient',
  ambient_analysts: 'Analysts — Ambient',
  // Extended functions (horizontal — serve every division)
  shared_services: 'Shared services',
  procurement: 'Procurement',
  hr_services: 'HR services',
  audit: 'Audit',
};

// In the FMCG context the legacy 'coo' role is the Protein division's COO;
// other industries keep the generic label.
const FMCG_LABEL_OVERRIDES: Partial<Record<Persona, string>> = {
  coo: 'COO — Protein',
};

// Healthcare and Manufacturing packs only seed the original six roles; the
// full org tree is an FMCG-context feature. Mirrored in mock-server/roles.js
// (LEGACY_PERSONAS) — keep the two in sync.
export const LEGACY_PERSONAS: Persona[] = [
  'coo',
  'operations_head',
  'store_manager',
  'sales_supervisor',
  'cfo',
  'commercial_finance',
];

function isLegacyIndustry(industry: string | null = getActiveIndustry()): boolean {
  return industry === 'healthcare' || industry === 'manufacturing';
}

export function personaLabel(p: Persona, industry?: string): string {
  if (!isLegacyIndustry(industry ?? getActiveIndustry())) return FMCG_LABEL_OVERRIDES[p] ?? PERSONA_LABEL[p];
  return PERSONA_LABEL[p];
}

// The lens dropdown's grouping — one group per branch of the org.
export const PERSONA_GROUPS: { label: string; roles: Persona[] }[] = [
  { label: 'Group', roles: ['group_ceo', 'cfo', 'fpa', 'commercial_finance'] },
  { label: 'Protein', roles: ['coo', 'protein_supply_chain', 'protein_production', 'protein_commercial_finance', 'protein_analysts', 'operations_head', 'store_manager', 'sales_supervisor'] },
  { label: 'G&I', roles: ['coo_gi', 'gi_supply_chain', 'gi_production', 'gi_commercial_finance', 'gi_analysts'] },
  { label: 'Fruits & Vegetables', roles: ['coo_fnv', 'fnv_supply_chain', 'fnv_production', 'fnv_commercial_finance', 'fnv_analysts'] },
  { label: 'Ambient Foods', roles: ['coo_ambient', 'ambient_supply_chain', 'ambient_production', 'ambient_commercial_finance', 'ambient_analysts'] },
  { label: 'Extended functions', roles: ['shared_services', 'procurement', 'hr_services', 'audit'] },
];

// Every role that exists in the data — the source of truth for labels, lens
// validation, and roll-up drill-downs. Stays complete even when the picker is
// narrowed: a Group CEO still rolls up G&I/F&V/Ambient and can drill into
// them, they just can't *become* those roles.
export const PERSONAS: Persona[] = PERSONA_GROUPS.flatMap((g) => g.roles);

// What the lens picker (and the login "Sign in as") actually offers. Trimmed
// to Group + Protein to keep the demo workable; widen by adding groups back.
const PICKER_GROUP_LABELS = ['Group', 'Protein'];

/** The lens roles offered for an industry (grouped for FMCG, flat legacy list otherwise). Defaults to the active industry. */
export function personaGroupsForIndustry(industry?: string): { label: string; roles: Persona[] }[] {
  if (isLegacyIndustry(industry ?? getActiveIndustry())) return [{ label: 'Roles', roles: LEGACY_PERSONAS }];
  return PERSONA_GROUPS.filter((g) => PICKER_GROUP_LABELS.includes(g.label));
}

/** Whether a lens value is selectable in the given industry's picker — a lens
 *  carried over from another industry (e.g. an FMCG division role) is not. */
export function lensOfferedForIndustry(lens: Persona | 'all', industry?: string): boolean {
  if (lens === 'all') return true;
  return personaGroupsForIndustry(industry).some((g) => g.roles.includes(lens));
}

// The role hierarchy: every role owns a disjoint slice of the product's data;
// hierarchy ("team") scope lets a senior role see what's impacted below them.
// Mirrored in mock-server/roles.js — keep the two trees identical.
export const ROLE_CHILDREN: Record<Persona, Persona[]> = {
  group_ceo: ['cfo', 'coo', 'coo_gi', 'coo_fnv', 'coo_ambient', 'shared_services', 'procurement', 'hr_services', 'audit'],
  cfo: ['fpa', 'commercial_finance'],
  fpa: [],
  commercial_finance: [],
  coo: ['protein_supply_chain', 'protein_production', 'protein_commercial_finance', 'protein_analysts', 'operations_head', 'sales_supervisor'],
  operations_head: ['store_manager'],
  store_manager: [],
  sales_supervisor: [],
  protein_supply_chain: [],
  protein_production: [],
  protein_commercial_finance: [],
  protein_analysts: [],
  coo_gi: ['gi_supply_chain', 'gi_production', 'gi_commercial_finance', 'gi_analysts'],
  gi_supply_chain: [],
  gi_production: [],
  gi_commercial_finance: [],
  gi_analysts: [],
  coo_fnv: ['fnv_supply_chain', 'fnv_production', 'fnv_commercial_finance', 'fnv_analysts'],
  fnv_supply_chain: [],
  fnv_production: [],
  fnv_commercial_finance: [],
  fnv_analysts: [],
  coo_ambient: ['ambient_supply_chain', 'ambient_production', 'ambient_commercial_finance', 'ambient_analysts'],
  ambient_supply_chain: [],
  ambient_production: [],
  ambient_commercial_finance: [],
  ambient_analysts: [],
  shared_services: [],
  procurement: [],
  hr_services: [],
  audit: [],
};

export function roleSubtree(role: Persona): Persona[] {
  return [role, ...ROLE_CHILDREN[role].flatMap(roleSubtree)];
}

// The matrix: division commercial finance reports solid-line to its division
// COO (ownership; escalation moves findings up that line) and dotted-line to
// the CFO (functional visibility; escalations are flagged to the CFO too).
// Mirrored in mock-server/roles.js — keep the two maps identical.
export const DOTTED_PARENT: Partial<Record<Persona, Persona>> = {
  protein_commercial_finance: 'cfo',
  gi_commercial_finance: 'cfo',
  fnv_commercial_finance: 'cfo',
  ambient_commercial_finance: 'cfo',
};

/** Roles that report into this one on the dotted (functional) line. */
export function dottedReports(role: Persona): Persona[] {
  return (Object.keys(DOTTED_PARENT) as Persona[]).filter((child) => DOTTED_PARENT[child] === role);
}
