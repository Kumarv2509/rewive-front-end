import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Persona, RoleScope } from '../../api/types';
import { useCurrentUser } from '../../api/dashboard';
import { PERSONAS, ROLE_CHILDREN, roleSubtree, dottedReports } from '../../screens/CommandCenter/personas';

// The persona lens is global chrome: pick it once in the top bar and every
// screen that filters by persona sees the same choice. Persisted so the lens
// survives reloads, like the industry choice.
const LENS_KEY = 'rewive.personaLens';
const HIERARCHY_KEY = 'rewive.personaLensHierarchy';

export type PersonaLens = Persona | 'all';

interface LensContextValue {
  lens: PersonaLens;
  setLens: (l: PersonaLens) => void;
  /** Hierarchy mode: widen the lens to the role's whole reporting subtree. */
  hierarchy: boolean;
  setHierarchy: (on: boolean) => void;
}

const LensContext = createContext<LensContextValue | null>(null);

const VALID_LENSES: PersonaLens[] = ['all', ...PERSONAS];

function readStoredLens(): PersonaLens {
  try {
    const v = localStorage.getItem(LENS_KEY) as PersonaLens | null;
    if (v && VALID_LENSES.includes(v)) return v;
  } catch { /* ignore */ }
  return 'all';
}

function readStoredHierarchy(): boolean {
  try { return localStorage.getItem(HIERARCHY_KEY) === '1'; } catch { return false; }
}

export function PersonaLensProvider({ children }: { children: ReactNode }) {
  const [lens, setLensState] = useState<PersonaLens>(readStoredLens);
  const [hierarchy, setHierarchyState] = useState<boolean>(readStoredHierarchy);
  const setLens = useCallback((l: PersonaLens) => {
    setLensState(l);
    try { localStorage.setItem(LENS_KEY, l); } catch { /* ignore */ }
  }, []);
  const setHierarchy = useCallback((on: boolean) => {
    setHierarchyState(on);
    try { localStorage.setItem(HIERARCHY_KEY, on ? '1' : ''); } catch { /* ignore */ }
  }, []);
  return <LensContext.Provider value={{ lens, setLens, hierarchy, setHierarchy }}>{children}</LensContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- co-located with its provider intentionally
export function usePersonaLens() {
  const ctx = useContext(LensContext);
  if (!ctx) throw new Error('usePersonaLens must be used within PersonaLensProvider');
  return ctx;
}

// The lens every data screen should actually filter by: non-admins are locked
// to their own role; hierarchy mode maps to scope='team' on the API. Screens
// pass { persona, scope } straight through to their query hooks.
// eslint-disable-next-line react-refresh/only-export-components -- co-located with its provider intentionally
export function useEffectiveLens(): {
  persona: PersonaLens;
  scope: RoleScope;
  /** Roles in view (null when the lens is 'all'). */
  rolesInScope: Persona[] | null;
  /** Roles below the lens role that hierarchy mode pulls in. */
  reports: Persona[];
  /** Roles reporting into the lens role on the dotted (functional) line. */
  dotted: Persona[];
} {
  const { lens, hierarchy } = usePersonaLens();
  const { data: currentUser } = useCurrentUser();
  const persona = currentUser && !currentUser.isAdmin ? currentUser.defaultPersona : lens;
  const scope: RoleScope = hierarchy ? 'team' : 'role';
  const reports = persona === 'all' ? [] : ROLE_CHILDREN[persona].flatMap(roleSubtree);
  const dotted = persona === 'all' ? [] : dottedReports(persona);
  const rolesInScope = persona === 'all' ? null : hierarchy ? [persona, ...reports, ...dotted] : [persona];
  return { persona, scope, rolesInScope, reports, dotted };
}
