import type { Persona } from '../../api/types';

export const PERSONA_LABEL: Record<Persona, string> = {
  store_manager: 'Store manager',
  cfo: 'CFO',
  operations_head: 'Operations head',
};

export const PERSONAS: Persona[] = ['store_manager', 'cfo', 'operations_head'];
