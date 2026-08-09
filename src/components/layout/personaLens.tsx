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
  /** Hierarchy mode resolved against the picked lens — what the toggle shows. */
  hierarchy: boolean;
  /** The user's explicit choice, or null when they have never touched it (in
   *  which case the role's default applies). */
  hierarchyChoice: boolean | null;
  /** Pass null to clear the choice and fall back to the role's default. */
  setHierarchy: (on: boolean | null) => void;
}

/** A role with reports manages a team, and for them the team view IS the job —
 *  role-only is the unusual case. So hierarchy defaults on for those roles and
 *  off for leaf roles, until the user says otherwise. */
// eslint-disable-next-line react-refresh/only-export-components -- co-located with its provider intentionally
export function defaultHierarchyFor(lens: PersonaLens): boolean {
  return lens !== 'all' && (ROLE_CHILDREN[lens]?.length ?? 0) > 0;
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

// null = never chosen, so the role's default applies. Distinguishing "off"
// from "unset" is the whole point — an older build wrote '' for off, and that
// must keep meaning off rather than silently flipping on.
function readStoredHierarchy(): boolean | null {
  try {
    const v = localStorage.getItem(HIERARCHY_KEY);
    if (v === null) return null;
    return v === '1';
  } catch { return null; }
}

export function PersonaLensProvider({ children }: { children: ReactNode }) {
  const [lens, setLensState] = useState<PersonaLens>(readStoredLens);
  const [hierarchyChoice, setHierarchyState] = useState<boolean | null>(readStoredHierarchy);
  const setLens = useCallback((l: PersonaLens) => {
    setLensState(l);
    try { localStorage.setItem(LENS_KEY, l); } catch { /* ignore */ }
  }, []);
  const setHierarchy = useCallback((on: boolean | null) => {
    setHierarchyState(on);
    try {
      if (on === null) localStorage.removeItem(HIERARCHY_KEY);
      else localStorage.setItem(HIERARCHY_KEY, on ? '1' : '0');
    } catch { /* ignore */ }
  }, []);
  const hierarchy = hierarchyChoice ?? defaultHierarchyFor(lens);
  return (
    <LensContext.Provider value={{ lens, setLens, hierarchy, hierarchyChoice, setHierarchy }}>
      {children}
    </LensContext.Provider>
  );
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
  /** Hierarchy resolved against the *effective* persona — which differs from
      the picked lens for non-admins, who are locked to their own role. */
  hierarchy: boolean;
  /** Roles in view (null when the lens is 'all'). */
  rolesInScope: Persona[] | null;
  /** Roles below the lens role that hierarchy mode pulls in. */
  reports: Persona[];
  /** Roles reporting into the lens role on the dotted (functional) line. */
  dotted: Persona[];
} {
  const { lens, hierarchyChoice } = usePersonaLens();
  const { data: currentUser } = useCurrentUser();
  const persona = currentUser && !currentUser.isAdmin ? currentUser.defaultPersona : lens;
  const hierarchy = hierarchyChoice ?? defaultHierarchyFor(persona);
  const scope: RoleScope = hierarchy ? 'team' : 'role';
  const reports = persona === 'all' ? [] : ROLE_CHILDREN[persona].flatMap(roleSubtree);
  const dotted = persona === 'all' ? [] : dottedReports(persona);
  const rolesInScope = persona === 'all' ? null : hierarchy ? [persona, ...reports, ...dotted] : [persona];
  return { persona, scope, hierarchy, rolesInScope, reports, dotted };
}
