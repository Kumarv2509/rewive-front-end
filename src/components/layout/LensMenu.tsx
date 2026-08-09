import { useEffect, useRef, useState } from 'react';
import { usePersonaLens, useEffectiveLens, type PersonaLens } from './personaLens';
import { useCurrentUser } from '../../api/dashboard';
import { personaLabel, personaGroupsForIndustry, ROLE_CHILDREN } from '../../screens/CommandCenter/personas';

// Hierarchy mode: only offered when the lens role actually has reports.
// Resolved against the effective persona, so a locked non-admin sees the
// box match what their screens are actually doing.
function HierarchyToggle({ inMenu }: { inMenu?: boolean }) {
  const { setHierarchy } = usePersonaLens();
  const { persona, reports, hierarchy } = useEffectiveLens();
  if (persona === 'all' || ROLE_CHILDREN[persona].length === 0) return null;

  return (
    <label
      className={inMenu ? 'menu-item' : 'lens-picker'}
      title={`Also show everything owned by ${reports.map((r) => personaLabel(r)).join(', ')} — the roles that report into ${personaLabel(persona)}`}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <input
        type="checkbox"
        checked={hierarchy}
        onChange={(e) => setHierarchy(e.target.checked)}
        style={{ accentColor: 'var(--accent)' }}
      />
      <span className={inMenu ? undefined : 'lens-label'}>+ their team</span>
    </label>
  );
}

// The persona lens lives in global chrome so the same choice follows the user
// across screens. Non-admins are locked to their role's persona; admins pick
// from a popover grouped by org branch.
export function LensMenu() {
  const { lens, setLens } = usePersonaLens();
  const { data: currentUser } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!currentUser) return null;
  if (!currentUser.isAdmin) {
    return (
      <>
        <span className="lens-locked">{personaLabel(currentUser.defaultPersona)} view</span>
        <HierarchyToggle />
      </>
    );
  }

  const groups = personaGroupsForIndustry();
  // A lens held from before the picker was narrowed still filters the data,
  // so show it rather than misreport what is on screen.
  const heldOutside = lens !== 'all' && !groups.some((g) => g.roles.includes(lens));
  const current = lens === 'all' ? 'All lenses' : personaLabel(lens);

  const pick = (next: PersonaLens) => {
    setLens(next);
    setOpen(false);
  };

  return (
    <div className="lens-menu" ref={wrapRef}>
      <button type="button" className="lens-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="lens-label">Lens</span>
        {current}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="menu scroll" role="menu">
          <button type="button" className={`menu-item${lens === 'all' ? ' on' : ''}`} onClick={() => pick('all')}>
            All lenses
          </button>
          {heldOutside && (
            <button type="button" className="menu-item on" onClick={() => setOpen(false)}>
              {personaLabel(lens)} (current)
            </button>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <div className="menu-label">{group.label}</div>
              {group.roles.map((p) => (
                <button key={p} type="button" className={`menu-item${lens === p ? ' on' : ''}`} onClick={() => pick(p)}>
                  {personaLabel(p)}
                </button>
              ))}
            </div>
          ))}
          <div className="menu-sep" />
          <HierarchyToggle inMenu />
        </div>
      )}
    </div>
  );
}
