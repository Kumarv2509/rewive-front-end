import { Link, useSearchParams } from 'react-router-dom';
import { useClosureKpis, useFindings, useKpiBrain } from '../../api/shadowOrg';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Intro } from '../../components/shared/Intro';
import { ScopeBanner } from '../../components/shared/ScopeBanner';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { personaLabel } from '../CommandCenter/personas';
import { ExitConditionCard, TripWireRow } from './Lifecycle';
import { severityTone, slaTone, statusLabel, statusTone } from './meta';
import type { Finding } from '../../api/types';

// One finding, one lifecycle: Open (waiting on a disposition) → Watching
// (exit conditions, solutions in motion, trip-wires) → Closed. The old
// Closure screen is the Watching/Closed tabs now.
const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'watching', label: 'Watching' },
  { key: 'closed', label: 'Closed' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function FindingRow({ finding, streamName }: { finding: Finding; streamName?: string }) {
  return (
    <div className="dec-item">
      <div className="dec-ico" style={{ background: 'var(--accent-soft)' }}>🕵️</div>
      <div style={{ minWidth: 0 }}>
        <div className="t1">
          <Link to={`/operate/findings/${finding.id}`}>{finding.title}</Link>{' '}
          <Pill tone={severityTone[finding.severity]}>{finding.severity}</Pill>
          {finding.escalationLevel > 0 && <> <Pill tone="red">escalated</Pill></>}
          {' '}<Pill tone="gray">→ {personaLabel(finding.persona)}</Pill>
          {finding.dottedPersona && <> <Pill tone="amber">⋯ {personaLabel(finding.dottedPersona)} · functional line</Pill></>}
        </div>
        <div className="t2">
          {finding.raisedByAgentName}
          {streamName ? <> · {streamName}</> : null}
          {finding.entity ? <> · {finding.entity}{finding.region ? ` (${finding.region})` : ''}</> : null} · {finding.impactEstimate}
        </div>
      </div>
      <div className="acts" style={{ alignItems: 'center' }}>
        {finding.status === 'open' ? (
          <>
            <Pill tone={slaTone(finding.slaHoursRemaining)}>{finding.slaHoursRemaining}h SLA</Pill>
            <Link className="btn primary sm" to={`/operate/findings/${finding.id}`}>Disposition</Link>
          </>
        ) : (
          <Pill tone={statusTone[finding.status]}>{statusLabel[finding.status]}</Pill>
        )}
      </div>
    </div>
  );
}

export function FindingsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { persona, scope } = useEffectiveLens();
  const tab = (TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'open') as TabKey;
  const stream = searchParams.get('stream') ?? 'all';
  const region = searchParams.get('region') ?? 'all';

  // The global lens routes here too: a sales supervisor sees sales findings,
  // Commercial finance sees returns / discounts / trade spend, the COO sees
  // the cross-functional ones — plus their whole team in hierarchy mode.
  const { data: findings, isLoading, isError } = useFindings({ stream, persona, scope });
  const { data: closures } = useClosureKpis();
  const { data: brain } = useKpiBrain();

  const setParam = (key: 'tab' | 'stream' | 'region', value: string) => {
    const next = new URLSearchParams(searchParams);
    if ((key === 'tab' && value === 'open') || ((key === 'stream' || key === 'region') && value === 'all')) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const streamName = (key: string) => brain?.streams.find((s) => s.key === key)?.name;

  // Entity/region is a client-side lens over the role-scoped data — options
  // come from the unfiltered set so the picker never loses entries.
  const regions = [...new Set((findings ?? []).map((f) => f.region).filter(Boolean))] as string[];
  const scoped = findings?.filter((f) => region === 'all' || f.region === region);
  const scopedClosures = closures?.filter((c) => region === 'all' || c.region === region);

  const open = scoped?.filter((f) => f.status === 'open') ?? [];
  const acting = scoped?.filter((f) => f.status === 'acting') ?? [];
  const acknowledged = scoped?.filter((f) => f.status === 'acknowledged') ?? [];
  const abandoned = scoped?.filter((f) => f.status === 'abandoned') ?? [];
  const inFlight = scopedClosures?.filter((c) => c.status !== 'closed') ?? [];
  const closedLoops = scopedClosures?.filter((c) => c.status === 'closed') ?? [];

  const tabCount: Record<TabKey, number> = {
    open: open.length,
    watching: inFlight.length + acting.length + acknowledged.length,
    closed: closedLoops.length + abandoned.length,
  };

  return (
    <section className="screen" style={{ maxWidth: 1280 }}>
      <h1 className="page">Findings</h1>
      <Intro
        line="Raised by your counterparts when a number drifts — every finding demands an answer, then stays watched until the number is back."
        more={
          <>
            A finding moves through one lifecycle. <b>Open</b>: waiting on one of four dispositions — Accept (set a
            measurable exit condition), Act (open a solution with tasks), Acknowledge (park it on a trip-wire), or
            Abandon (dismiss with a reason that tunes the counterpart). Unanswered findings escalate on their SLA.
            <b> Watching</b>: accepted findings live here as exit conditions with progress toward target; acknowledged
            ones sit on a trip-wire. <b>Closed</b>: the number came back — or the finding was dismissed — and the
            decision is in the ledger.
          </>
        }
      />
      <ScopeBanner />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', flex: 1 }}>
          {TABS.map((t) => (
            <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setParam('tab', t.key)}>
              {t.label} <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{tabCount[t.key]}</span>
            </button>
          ))}
        </div>
        <select
          value={stream}
          onChange={(e) => setParam('stream', e.target.value)}
          style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit' }}
        >
          <option value="all">All streams</option>
          {brain?.streams.map((s) => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>
        <select
          value={region}
          onChange={(e) => setParam('region', e.target.value)}
          style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit' }}
        >
          <option value="all">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {isLoading && <Loading />}
      {isError && <ErrorMessage />}

      {tab === 'open' && scoped && (
        <>
          {open.length > 0 ? (
            <div className="card" style={{ marginBottom: 16 }} data-tour="findings-open">
              <div className="sec-head">
                <h3>Waiting on a disposition</h3>
                <Pill tone="red">{open.length}</Pill>
              </div>
              {open.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
            </div>
          ) : (
            <div className="card" data-tour="findings-open">
              <div className="state-msg">Nothing open — the counterparts are quiet here. Accepted and acknowledged findings live under Watching.</div>
            </div>
          )}
        </>
      )}

      {tab === 'watching' && (
        <>
          <div className="sec-head" style={{ padding: '0 0 12px' }}>
            <h3>Exit conditions in flight</h3>
            <Pill tone="teal">{inFlight.length}</Pill>
          </div>
          {inFlight.length === 0 && <div className="card" style={{ marginBottom: 24 }}><div className="state-msg">No open exit conditions — Accept a finding and it appears here, watched until the number is back.</div></div>}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }} data-tour="closure-exit">
            {inFlight.map((c) => <ExitConditionCard key={c.id} c={c} />)}
          </div>

          {acting.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>Solutions in motion</h3>
                <Pill tone="indigo">{acting.length}</Pill>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                {acting.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
              </div>
            </>
          )}

          {acknowledged.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>On a trip-wire</h3>
                <Pill tone="amber">{acknowledged.length}</Pill>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                {acknowledged.map((f) => <TripWireRow key={f.id} finding={f} />)}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'closed' && (
        <>
          <div className="sec-head" style={{ padding: '0 0 12px' }}>
            <h3>Closed loops — the number came back</h3>
            <Pill tone="green">{closedLoops.length}</Pill>
          </div>
          {closedLoops.length === 0 && <div className="card" style={{ marginBottom: 24 }}><div className="state-msg">No closed loops yet — when an exit condition is met, the finding retires itself here.</div></div>}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
            {closedLoops.map((c) => <ExitConditionCard key={c.id} c={c} />)}
          </div>

          {abandoned.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>Dismissed — the reason tuned the counterpart</h3>
                <Pill tone="gray">{abandoned.length}</Pill>
              </div>
              <div className="card">
                {abandoned.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
