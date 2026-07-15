// The role hierarchy behind the persona lens. Every item in the demo belongs
// to exactly one role (no overlap); the hierarchy is how a senior role sees
// what's impacted below them ("team scope"). Mirrored in
// src/screens/CommandCenter/personas.ts — keep the two trees identical.
export const ROLE_CHILDREN = {
  coo: ['operations_head', 'sales_supervisor'],
  operations_head: ['store_manager'],
  store_manager: [],
  sales_supervisor: [],
  cfo: ['commercial_finance'],
  commercial_finance: [],
};

export function roleSubtree(role) {
  const kids = ROLE_CHILDREN[role] ?? [];
  return [role, ...kids.flatMap(roleSubtree)];
}

// Resolves a lens + scope to the set of personas in view.
// Returns null for "no filter" (no persona, or 'all').
export function personaScope(persona, scope) {
  if (!persona || persona === 'all') return null;
  return new Set(scope === 'team' ? roleSubtree(persona) : [persona]);
}
