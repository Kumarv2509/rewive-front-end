import { useLocation } from 'react-router-dom';
import { crumbTitle } from './areas';
import { usePersonaLens, useEffectiveLens, type PersonaLens } from './personaLens';
import { useCurrentUser } from '../../api/dashboard';
import { PERSONA_LABEL, PERSONAS, ROLE_CHILDREN } from '../../screens/CommandCenter/personas';

// Hierarchy mode: only offered when the lens role actually has reports.
function HierarchyToggle() {
  const { hierarchy, setHierarchy } = usePersonaLens();
  const { persona, reports } = useEffectiveLens();
  if (persona === 'all' || ROLE_CHILDREN[persona].length === 0) return null;

  return (
    <label
      className="lens-picker"
      title={`Also show everything owned by ${reports.map((r) => PERSONA_LABEL[r]).join(', ')} — the roles that report into ${PERSONA_LABEL[persona]}`}
      style={{ cursor: 'pointer', userSelect: 'none' }}
    >
      <input
        type="checkbox"
        checked={hierarchy}
        onChange={(e) => setHierarchy(e.target.checked)}
        style={{ accentColor: 'var(--accent)' }}
      />
      <span className="lens-label">+ their team</span>
    </label>
  );
}

// The persona lens lives in global chrome so the same choice follows the user
// across screens. Non-admins are locked to their role's persona.
function LensPicker() {
  const { lens, setLens } = usePersonaLens();
  const { data: currentUser } = useCurrentUser();

  if (!currentUser) return null;
  if (!currentUser.isAdmin) {
    return (
      <>
        <span className="lens-locked">{PERSONA_LABEL[currentUser.defaultPersona]} view</span>
        <HierarchyToggle />
      </>
    );
  }

  return (
    <>
      <label className="lens-picker">
        <span className="lens-label">Lens</span>
        <select value={lens} onChange={(e) => setLens(e.target.value as PersonaLens)}>
          <option value="all">All lenses</option>
          {PERSONAS.map((p) => (
            <option key={p} value={p}>{PERSONA_LABEL[p]}</option>
          ))}
        </select>
      </label>
      <HierarchyToggle />
    </>
  );
}

export function Topbar() {
  const { pathname } = useLocation();

  return (
    <div className="topbar">
      <div className="crumb">{crumbTitle(pathname)}</div>
      <div className="cmdbar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        Ask Rewive to do something… <span className="kbd">⌘K</span>
      </div>
      <div className="top-actions">
        <LensPicker />
        <div className="bell">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 01-3.4 0" />
          </svg>
          <span className="dot"></span>
        </div>
      </div>
    </div>
  );
}
