import { Link } from 'react-router-dom';
import { useCloseExitCondition, useReAlertFinding } from '../../api/shadowOrg';
import { Pill } from '../../components/shared/Pill';
import { useToast } from '../../components/shared/Toast';
import type { ClosureKpi, Finding } from '../../api/types';

const closureTone = { tracking: 'teal', closed: 'green', regressed: 'red' } as const;

// A finding the owner Accepted lives on as an exit condition — the Watching
// stage of its lifecycle, not a separate screen.
export function ExitConditionCard({ c }: { c: ClosureKpi }) {
  const close = useCloseExitCondition();
  const { showToast } = useToast();
  const done = c.status === 'closed';

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <Pill tone={closureTone[c.status]}>{c.status}</Pill>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {c.entity ? `${c.entity}${c.region ? ` (${c.region})` : ''} · ` : ''}watched by {c.watchedByAgentName}
        </span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{c.name}</div>
      <Link to={`/operate/findings/${c.findingId}`} style={{ fontSize: 11.5, color: 'var(--accent-deep)', textDecoration: 'none' }}>
        from finding: {c.findingTitle} →
      </Link>

      <div style={{ height: 8, borderRadius: 99, background: 'var(--glass-hover)', overflow: 'hidden', margin: '12px 0 8px' }}>
        <div style={{ height: '100%', width: `${c.progressPct}%`, borderRadius: 99, background: done ? 'var(--green)' : 'var(--accent-grad)', transition: 'width .4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
          baseline {c.baseline} · now {c.current} · target {c.target} · {c.progressPct}%
        </span>
        {!done && (
          <button
            className="btn primary sm"
            disabled={close.isPending}
            onClick={() => close.mutate(c.id, { onSuccess: () => showToast('Loop closed — the finding is resolved') })}
          >
            Mark met · close loop
          </button>
        )}
      </div>
    </div>
  );
}

// Acknowledged findings sit on a trip-wire until the line they were parked
// behind is crossed.
export function TripWireRow({ finding }: { finding: Finding }) {
  const reAlert = useReAlertFinding(finding.id);
  const { showToast } = useToast();
  return (
    <div className="dec-item">
      <div className="dec-ico" style={{ background: 'var(--amber-soft)' }}>⏰</div>
      <div style={{ minWidth: 0 }}>
        <div className="t1"><Link to={`/operate/findings/${finding.id}`}>{finding.title}</Link></div>
        <div className="t2">Trip-wire · {finding.reAlertCondition ?? 'watching for change'}</div>
      </div>
      <div className="acts">
        <button
          className="btn ghost sm"
          disabled={reAlert.isPending}
          onClick={() => reAlert.mutate(undefined, { onSuccess: () => showToast('Trip-wire fired — the finding is back, louder') })}
        >
          Trip the wire · re-alert
        </button>
      </div>
    </div>
  );
}
