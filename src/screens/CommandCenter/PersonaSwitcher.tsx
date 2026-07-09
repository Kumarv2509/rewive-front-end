import type { CurrentUser, Persona } from '../../api/types';
import { PERSONA_LABEL, PERSONAS } from './personas';

export function PersonaSwitcher({
  currentUser,
  persona,
  onChange,
}: {
  currentUser: CurrentUser;
  persona: Persona | 'all';
  onChange: (p: Persona | 'all') => void;
}) {
  if (!currentUser.isAdmin) {
    return (
      <span className="pill gray" style={{ marginBottom: 16, display: 'inline-flex' }}>
        {PERSONA_LABEL[currentUser.defaultPersona]} view · set by your role
      </span>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="filters" style={{ marginBottom: 4 }}>
        <button className={`fchip${persona === 'all' ? ' on' : ''}`} onClick={() => onChange('all')}>All lenses</button>
        {PERSONAS.map((p) => (
          <button key={p} className={`fchip${persona === p ? ' on' : ''}`} onClick={() => onChange(p)}>
            {PERSONA_LABEL[p]}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Admin — viewing on behalf of a persona, still logged as you</div>
    </div>
  );
}
