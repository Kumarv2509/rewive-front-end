import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Persona } from '../../api/types';

// The persona lens is global chrome: pick it once in the top bar and every
// screen that filters by persona sees the same choice. Persisted so the lens
// survives reloads, like the industry choice.
const LENS_KEY = 'rewive.personaLens';

export type PersonaLens = Persona | 'all';

interface LensContextValue {
  lens: PersonaLens;
  setLens: (l: PersonaLens) => void;
}

const LensContext = createContext<LensContextValue | null>(null);

const VALID_LENSES: PersonaLens[] = [
  'all', 'store_manager', 'cfo', 'operations_head', 'sales_supervisor', 'coo', 'commercial_finance',
];

function readStoredLens(): PersonaLens {
  try {
    const v = localStorage.getItem(LENS_KEY) as PersonaLens | null;
    if (v && VALID_LENSES.includes(v)) return v;
  } catch { /* ignore */ }
  return 'all';
}

export function PersonaLensProvider({ children }: { children: ReactNode }) {
  const [lens, setLensState] = useState<PersonaLens>(readStoredLens);
  const setLens = useCallback((l: PersonaLens) => {
    setLensState(l);
    try { localStorage.setItem(LENS_KEY, l); } catch { /* ignore */ }
  }, []);
  return <LensContext.Provider value={{ lens, setLens }}>{children}</LensContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- co-located with its provider intentionally
export function usePersonaLens() {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error('usePersonaLens must be used within PersonaLensProvider');
  return ctx;
}
