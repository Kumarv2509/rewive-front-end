import { Link, useSearchParams } from 'react-router-dom';
import { useClosureKpis, useFindings, useKpiBrain, useShadowOrg } from '../../api/shadowOrg';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Intro } from '../../components/shared/Intro';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { PERSONAS, personaLabel, roleSubtree } from '../CommandCenter/personas';
import { ExitConditionCard, TripWireRow } from './Lifecycle';
import { severityTone, slaTone, statusLabel, statusTone } from './meta';
import { AgentView } from './AgentView';
import { OrgRollup } from './OrgRollup';
import { detectThemes, rollupByReport, splitByOwnership } from './rollup';
import type { Finding, Persona } from '../../api/types';

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
          {finding.escalationLevel > 0 && (
            <> <Pill tone="red">{finding.escalatedFrom ? `escalated from ${personaLabel(finding.escalatedFrom)}` : 'escalated'}</Pill></>
          )}
          {' '}<Pill tone="gray">→ {personaLabel(finding.persona)}</Pill>
          {finding.origin === 'sweep' && <> <Pill tone="green">live data</Pill></>}
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
  const { persona, scope, rolesInScope } = useEffectiveLens();
  const tab = (TABS.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'open') as TabKey;
  const stream = searchParams.get('stream') ?? 'all';
  const region = searchParams.get('region') ?? 'all';
  // Drill-down from a rollup row: narrow the open tab to one report's branch.
  // Validated — a hand-edited URL must not reach roleSubtree with a junk role.
  const ownerParam = searchParams.get('owner');
  const owner = ownerParam && PERSONAS.includes(ownerParam as Persona) ? (ownerParam as Persona) : null;
  // Grouping by the counterpart that raised each finding is the default view —
  // "who found this, and have they been right before". Lifecycle (Open /
  // Watching / Closed) is the opt-in, so it takes the explicit param.
  // An explicit ?tab= (guide deep links, "All findings →") means the caller
  // wants the lifecycle view, so it wins when no view is named.
  const viewParam = searchParams.get('view');
  const byAgent = viewParam ? viewParam !== 'lifecycle' : !searchParams.get('tab');

  // The global lens routes here too: a sales supervisor sees sales findings,
  // Commercial finance sees returns / discounts / trade spend, the COO sees
  // the cross-functional ones — plus their whole team in hierarchy mode.
  const { data: findings, isLoading, isError } = useFindings({ stream, persona, scope });
  const { data: closures } = useClosureKpis();
  const { data: brain } = useKpiBrain();
  const { data: org } = useShadowOrg(persona, scope);

  const setParam = (key: 'tab' | 'stream' | 'region' | 'owner' | 'view', value: string) => {
    const next = new URLSearchParams(searchParams);
    if ((key === 'tab' && value === 'open') || (key !== 'tab' && value === 'all')) next.delete(key);
    else next.set(key, value);
    // Switching tabs or filters drops a drill-down — it only scopes the open tab.
    if (key !== 'owner') next.delete('owner');
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

  // A senior lens does not inherit its team's queue — it inherits its team's
  // exceptions. With "+ their team" on, the open tab splits in two: the
  // findings this role must answer itself, and a roll-up (one row per direct
  // report, plus cross-division patterns) of what the organisation is
  // carrying. Without hierarchy mode nothing below applies — the role's own
  // list is the whole list.
  const lensRole = persona === 'all' ? null : persona;
  const hierarchyOn = lensRole !== null && (rolesInScope?.length ?? 1) > 1;
  const split = lensRole ? splitByOwnership(scoped ?? [], lensRole) : null;
  const allMyOpen = split ? split.mine.filter((f) => f.status === 'open') : [];
  // Escalations are the one thing that reaches a senior role on its own: the
  // level below let a clock lapse, so ownership moved up. They lead the page.
  const escalatedToMe = allMyOpen.filter((f) => f.escalationLevel > 0 && f.escalatedFrom);
  const myOpen = allMyOpen.filter((f) => !escalatedToMe.includes(f));
  const dottedOpen = split ? split.dotted.filter((f) => f.status === 'open') : [];
  const delegated = split?.delegated ?? [];
  const rollupRows = hierarchyOn && lensRole ? rollupByReport(delegated, lensRole) : [];
  const themes = hierarchyOn && lensRole ? detectThemes(delegated, lensRole) : [];
  const drillRoles = owner ? roleSubtree(owner) : null;
  const drilled = drillRoles ? open.filter((f) => drillRoles.includes(f.persona)) : [];

  const tabCount: Record<TabKey, number> = {
    // In hierarchy mode the tab counts what this role must answer, not what
    // the whole subtree is holding — the rest is a roll-up, not a queue.
    open: hierarchyOn ? allMyOpen.length : open.length,
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
        // The instructions change with the lens, because the job does: an
        // operator works a queue, a leader works exceptions and patterns.
        doThis={
          hierarchyOn
            ? [
                <><b>Escalated to you</b> first — an SLA lapsed below and ownership moved up. Nothing else in your organisation reaches you automatically.</>,
                <>Disposition anything under <b>Your call</b>. Silence escalates it further up, same as it did to get here.</>,
                <>Read <b>Patterns</b> as one decision, not many — the same mandate drifting under several divisions is the call that is actually yours.</>,
                <>The roll-up is visibility, not a queue. Open a report's row to push on a finding — Ask, Reassign, Raise priority, or Take it — without taking the decision off them.</>,
              ]
            : [
                <>You land on <b>By counterpart</b> — who raised what, and whether their past calls landed or were dismissed as noise. Switch to <b>Lifecycle</b> for the Open / Watching / Closed queue.</>,
                <>Work <b>Open</b> from the top — the tightest SLA sorts first, and an unanswered finding escalates to your manager.</>,
                <>Open a finding, read the evidence and impact path, then give it one of four answers: Accept, Act, Acknowledge, or Abandon.</>,
                <>Check <b>Watching</b> — an accepted finding is not done until its exit condition is met and the number is back.</>,
              ]
        }
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {byAgent ? (
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
            Every finding in your scope, grouped by the counterpart that raised it.
          </div>
        ) : (
          <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', flex: 1 }}>
            {TABS.map((t) => (
              <button key={t.key} className={`tab${tab === t.key ? ' active' : ''}`} onClick={() => setParam('tab', t.key)}>
                {t.label} <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{tabCount[t.key]}</span>
              </button>
            ))}
          </div>
        )}
        <div className="seg">
          <button className={byAgent ? 'on' : ''} onClick={() => setParam('view', 'all')}>By counterpart</button>
          <button className={byAgent ? '' : 'on'} onClick={() => setParam('view', 'lifecycle')}>Lifecycle</button>
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

      {byAgent && scoped && <AgentView findings={scoped} agents={org?.agents ?? []} />}

      {!byAgent && tab === 'open' && scoped && !hierarchyOn && (
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

      {/* Drilled into one report's branch from a roll-up row. */}
      {!byAgent && tab === 'open' && scoped && hierarchyOn && owner && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button
              className="btn sm"
              onClick={() => setParam('owner', 'all')}
            >
              ← All reports
            </button>
          </div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="sec-head">
              <h3>{personaLabel(owner)} — open in this branch</h3>
              <Pill tone={drilled.length ? 'red' : 'green'}>{drilled.length}</Pill>
            </div>
            {drilled.length === 0 && <div className="state-msg">Nothing open in this branch right now.</div>}
            {drilled.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
          </div>
        </>
      )}

      {!byAgent && tab === 'open' && scoped && hierarchyOn && !owner && (
        <>
          {escalatedToMe.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>Escalated to you</h3>
                <Pill tone="red">{escalatedToMe.length}</Pill>
              </div>
              <div className="t2" style={{ margin: '-6px 0 12px', color: 'var(--ink-3)' }}>
                An SLA lapsed below you, so ownership moved up. These are yours now — nothing else in your organisation
                reaches you automatically.
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                {escalatedToMe.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
              </div>
            </>
          )}

          <div className="card" style={{ marginBottom: 24 }} data-tour="findings-open">
            <div className="sec-head">
              <h3>Your call</h3>
              <Pill tone={myOpen.length ? 'red' : 'green'}>{myOpen.length}</Pill>
            </div>
            {myOpen.length === 0 && (
              <div className="state-msg">
                {escalatedToMe.length > 0
                  ? 'Nothing raised directly to you — only the escalations above. What your organisation is carrying is rolled up below.'
                  : 'Nothing is waiting on your disposition. What your organisation is carrying is rolled up below.'}
              </div>
            )}
            {myOpen.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
          </div>

          {dottedOpen.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>Functional line — visibility, not your call</h3>
                <Pill tone="amber">{dottedOpen.length}</Pill>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                {dottedOpen.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
              </div>
            </>
          )}

          <OrgRollup
            rows={rollupRows}
            themes={themes}
            delegatedCount={delegated.filter((f) => f.status === 'open').length}
            onDrill={(role) => setParam('owner', role)}
          />
        </>
      )}

      {!byAgent && tab === 'watching' && (
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

      {!byAgent && tab === 'closed' && (
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
