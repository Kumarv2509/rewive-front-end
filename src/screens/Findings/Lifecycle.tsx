import { Link } from 'react-router-dom';
import { useCloseExitCondition, useReAlertFinding } from '../../api/shadowOrg';
import { Pill } from '../../components/shared/Pill';
import { useToast } from '../../components/shared/Toast';
import type { ClosureKpi, Finding } from '../../api/types';

const closureTone = { tracking: 'teal', closed: 'green', regressed: 'red' } as const;

// A finding the owner Accepted lives on as a recovery target — the Watching
// stage of its lifecycle, not a separate screen. (API name: exit condition.)
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
        {/* Closure is a measured target being met, not a status someone sets:
            the close affordance appears only once the watching agent reports
            the number back (100%). Until then the card just keeps watching. */}
        {!done && c.progressPct >= 100 && (
          <button
            className="btn primary sm"
            disabled={close.isPending}
            onClick={() => close.mutate(c.id, { onSuccess: () => showToast('Loop closed — the finding is resolved') })}
          >
            Number is back · close loop
          </button>
        )}
      </div>
    </div>
  );
}

// Parked (acknowledged) findings sit on a re-alert rule until the line they
// were parked behind is crossed.
export function TripWireRow({ finding }: { finding: Finding }) {
  const reAlert = useReAlertFinding(finding.id);
  const { showToast } = useToast();
  return (
    <div className="dec-item">
      <div className="dec-ico" style={{ background: 'var(--amber-soft)' }}>⏰</div>
      <div style={{ minWidth: 0 }}>
        <div className="t1"><Link to={`/operate/findings/${finding.id}`}>{finding.title}</Link></div>
        {/* Rule text often starts with "Re-alert if …" (the server default) —
            strip it so the label doesn't read "Re-alerts when · Re-alert if". */}
        <div className="t2">Re-alerts when · {(finding.reAlertCondition ?? 'watching for change').replace(/^re-?alerts?\s+(if|when)\s+/i, '')}</div>
      </div>
      <div className="acts">
        <button
          className="btn ghost sm"
          disabled={reAlert.isPending}
          onClick={() => reAlert.mutate(undefined, { onSuccess: () => showToast('Re-alerted — the finding is back, louder') })}
        >
          Re-alert now
        </button>
      </div>
    </div>
  );
}
