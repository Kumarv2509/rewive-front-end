// The role hierarchy behind the persona lens. Every item in the demo belongs
// to exactly one role (no overlap); the hierarchy is how a senior role sees
// what's impacted below them ("team scope"). Mirrored in
// src/screens/CommandCenter/personas.ts — keep the two trees identical.
export const ROLE_CHILDREN = {
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

// Inverse of ROLE_CHILDREN: escalation walks a finding up this map, one level
// per SLA breach, until it reaches the Group CEO (who has no parent).
export const ROLE_PARENT = Object.fromEntries(
  Object.entries(ROLE_CHILDREN).flatMap(([parent, kids]) => kids.map((k) => [k, parent])),
);

// The matrix: division commercial finance reports solid-line to its division
// COO (ownership; escalation moves findings up that line) and dotted-line to
// the CFO (functional visibility; escalations are flagged to the CFO too).
// Mirrored in src/screens/CommandCenter/personas.ts — keep the two identical.
export const DOTTED_PARENT = {
  protein_commercial_finance: 'cfo',
  gi_commercial_finance: 'cfo',
  fnv_commercial_finance: 'cfo',
  ambient_commercial_finance: 'cfo',
};

export function roleSubtree(role) {
  const kids = ROLE_CHILDREN[role] ?? [];
  return [role, ...kids.flatMap(roleSubtree)];
}

// Healthcare and Manufacturing seed only the original six roles; the full org
// tree (the group tier, divisions) is an FMCG-context feature. Mirrored in
// src/screens/CommandCenter/personas.ts (LEGACY_PERSONAS) — keep the two in sync.
export const LEGACY_PERSONAS = ['coo', 'operations_head', 'store_manager', 'sales_supervisor', 'cfo', 'commercial_finance'];
const LEGACY_INDUSTRIES = new Set(['healthcare', 'manufacturing']);

// The roles an industry actually offers in its lens picker. null = "all roles"
// (FMCG); a Set of the legacy six otherwise.
export function personasForIndustry(industry) {
  return LEGACY_INDUSTRIES.has(industry) ? new Set(LEGACY_PERSONAS) : null;
}

// The escalation parent within an industry: one step up the solid line, but
// never above the roles that industry offers. Legacy industries have no group
// tier, so 'coo'/'cfo' are already the top and this returns null there — an
// escalated finding must never land on a persona no lens in that org can select.
export function escalationParent(persona, industry) {
  const parent = ROLE_PARENT[persona];
  if (!parent) return null;
  const offered = personasForIndustry(industry);
  return !offered || offered.has(parent) ? parent : null;
}

// The one place the "walk a finding up the org" rule lives — shared by the
// escalate route, the SLA heartbeat, the wall-clock hydrate, the re-alert route
// and the sweep trip-wire (previously three diverging copies). Moves ownership
// up the solid line (stopping at the industry's top role), flags the dotted-line
// parent, bumps the level, resets the escalation SLA and routes to the chief
// counterpart. Callers own any status/deadline side-effects. Returns the roles
// touched so callers can log "escalated to X" vs "held at the top".
export function escalateFinding(finding, { industry, chiefId }) {
  const dottedRole = DOTTED_PARENT[finding.persona];
  if (dottedRole) finding.dottedPersona = dottedRole;
  const fromRole = finding.persona;
  const parentRole = escalationParent(finding.persona, industry);
  finding.escalationLevel += 1;
  finding.slaHoursRemaining = 12;
  if (chiefId) finding.escalatedToAgentId = chiefId;
  if (parentRole) {
    finding.persona = parentRole;
    // The trail is what makes an escalation legible to the role that receives
    // it: "this is your call because the level below let the clock lapse".
    // Without it an escalated finding is indistinguishable from a native one.
    finding.escalatedFrom = fromRole;
    finding.escalationTrail = [
      ...(finding.escalationTrail ?? []),
      { from: fromRole, to: parentRole, at: new Date().toISOString() },
    ];
  }
  return { parentRole, dottedRole };
}

// Resolves a lens + scope to the set of personas in view.
// Returns null for "no filter" (no persona, or 'all').
// Team scope includes the dotted (functional) line: the CFO's team rollup
// covers division commercial finance even though those roles escalate to
// their division COO.
export function personaScope(persona, scope) {
  if (!persona || persona === 'all') return null;
  if (scope !== 'team') return new Set([persona]);
  const dotted = Object.entries(DOTTED_PARENT)
    .filter(([, parent]) => parent === persona)
    .map(([child]) => child);
  return new Set([...roleSubtree(persona), ...dotted]);
}
