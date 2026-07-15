import type { Persona } from '../../api/types';

// Personas double as routing roles: every finding is addressed to the role
// whose call it is (see the Persona type for the routing rules).
export const PERSONA_LABEL: Record<Persona, string> = {
  store_manager: 'Store manager',
  cfo: 'CFO',
  operations_head: 'Operations head',
  sales_supervisor: 'Sales supervisor',
  coo: 'COO',
  commercial_finance: 'Commercial finance',
};

export const PERSONAS: Persona[] = [
  'coo',
  'operations_head',
  'store_manager',
  'sales_supervisor',
  'cfo',
  'commercial_finance',
];

// The role hierarchy: every role owns a disjoint slice of the product's data;
// hierarchy ("team") scope lets a senior role see what's impacted below them.
// Mirrored in mock-server/roles.js — keep the two trees identical.
export const ROLE_CHILDREN: Record<Persona, Persona[]> = {
  coo: ['operations_head', 'sales_supervisor'],
  operations_head: ['store_manager'],
  store_manager: [],
  sales_supervisor: [],
  cfo: ['commercial_finance'],
  commercial_finance: [],
};

export function roleSubtree(role: Persona): Persona[] {
  return [role, ...ROLE_CHILDREN[role].flatMap(roleSubtree)];
}
