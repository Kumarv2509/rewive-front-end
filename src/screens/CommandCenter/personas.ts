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
  'sales_supervisor',
  'coo',
  'commercial_finance',
  'store_manager',
  'cfo',
  'operations_head',
];
