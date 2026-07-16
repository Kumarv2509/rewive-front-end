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
