import { Link } from 'react-router-dom';
import { useClosureKpis, useCloseExitCondition, useFindings, useReAlertFinding } from '../../api/shadowOrg';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useToast } from '../../components/shared/Toast';
import type { ClosureKpi, Finding } from '../../api/types';

const closureTone = { tracking: 'teal', closed: 'green', regressed: 'red' } as const;

function ExitConditionCard({ c }: { c: ClosureKpi }) {
  const close = useCloseExitCondition();
  const { showToast } = useToast();
  const done = c.status === 'closed';

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <Pill tone={closureTone[c.status]}>{c.status}</Pill>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>watched by {c.watchedByAgentName}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{c.name}</div>
      <Link to={`/operate/findings/${c.findingId}`} style={{ fontSize: 11.5, color: 'var(--accent-deep)', textDecoration: 'none' }}>
        from finding: {c.findingTitle} →
      </Link>

      <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,.09)', overflow: 'hidden', margin: '12px 0 8px' }}>
        <div style={{ height: '100%', width: `${c.progressPct}%`, borderRadius: 99, background: done ? 'var(--green)' : 'var(--accent-grad)', boxShadow: done ? 'none' : '0 0 10px rgba(124,99,255,.5)', transition: 'width .4s' }} />
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

function WatchingRow({ finding }: { finding: Finding }) {
  const reAlert = useReAlertFinding(finding.id);
  const { showToast } = useToast();
  return (
    <div className="dec-item">
      <div className="dec-ico" style={{ background: 'var(--amber-soft)' }}>⏰</div>
      <div style={{ minWidth: 0 }}>
        <div className="t1"><Link to={`/operate/findings/${finding.id}`}>{finding.title}</Link></div>
        <div className="t2">{finding.reAlertCondition ?? 'Watching for change'}</div>
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

export function ClosureScreen() {
  const { data: closures, isLoading, isError } = useClosureKpis();
  const { data: findings } = useFindings({ status: 'acknowledged' });

  if (isLoading) return <section className="screen"><Loading /></section>;
  if (isError || !closures) return <section className="screen"><ErrorMessage message="Couldn't load closure." /></section>;

  const inFlight = closures.filter((c) => c.status !== 'closed');
  const closed = closures.filter((c) => c.status === 'closed');
  const watching = findings ?? [];

  return (
    <section className="screen" style={{ maxWidth: 1140 }}>
      <h1 className="page">Closure</h1>
      <div className="sub">
        Where the loop closes. Accepted findings become exit conditions the counterpart watches until they're truly met;
        acknowledged findings sit on a trip-wire that fires when things worsen. Nothing is "done" until the number is back.
      </div>

      <div className="sec-head" style={{ padding: '0 0 12px' }}>
        <h3>Exit conditions in flight</h3>
        <Pill tone="teal">{inFlight.length}</Pill>
      </div>
      {inFlight.length === 0 && <div className="card"><div className="state-msg">No open exit conditions — accept a finding and one appears here.</div></div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
        {inFlight.map((c) => <ExitConditionCard key={c.id} c={c} />)}
      </div>

      {watching.length > 0 && (
        <>
          <div className="sec-head" style={{ padding: '0 0 12px' }}>
            <h3>Watching · on a trip-wire</h3>
            <Pill tone="amber">{watching.length}</Pill>
          </div>
          <div className="card" style={{ marginBottom: 24 }}>
            {watching.map((f) => <WatchingRow key={f.id} finding={f} />)}
          </div>
        </>
      )}

      {closed.length > 0 && (
        <>
          <div className="sec-head" style={{ padding: '0 0 12px' }}>
            <h3>Closed loops</h3>
            <Pill tone="green">{closed.length}</Pill>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {closed.map((c) => <ExitConditionCard key={c.id} c={c} />)}
          </div>
        </>
      )}
    </section>
  );
}
