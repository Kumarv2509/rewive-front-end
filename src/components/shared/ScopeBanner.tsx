import { useEffectiveLens } from '../layout/personaLens';
import { personaLabel } from '../../screens/CommandCenter/personas';

// One line under a screen's header that says whose slice of the data is in
// view. In hierarchy mode it spells out the reporting line, so a senior role
// can see exactly which roles below them the screen is rolling up.
export function ScopeBanner() {
  const { persona, rolesInScope, reports, dotted } = useEffectiveLens();
  if (persona === 'all' || !rolesInScope) return null;

  const hierarchyOn = rolesInScope.length > 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '2px 0 14px', fontSize: 12, color: 'var(--ink-3)' }}>
      <span className="pill indigo">{personaLabel(persona)}</span>
      {hierarchyOn ? (
        <>
          <span>+ their team:</span>
          {reports.map((r) => (
            <span key={r} className="pill gray">{personaLabel(r)}</span>
          ))}
          {dotted.map((r) => (
            <span key={r} className="pill amber" title="Dotted line — this role escalates to its division COO, but its work rolls up to this function too">⋯ {personaLabel(r)}</span>
          ))}
          <span>— everything owned along this reporting line{dotted.length > 0 ? ', plus the dotted-line function' : ''}.</span>
        </>
      ) : (
        <span>
          only what this role owns{reports.length > 0 ? ' — tick “+ their team” in the top bar to include the roles below' : ''}.
        </span>
      )}
    </div>
  );
}
