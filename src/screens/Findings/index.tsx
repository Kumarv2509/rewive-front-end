import { Link, useSearchParams } from 'react-router-dom';
import { useClosureKpis, useFindings, useKpiBrain, useShadowOrg } from '../../api/shadowOrg';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { PageHeader } from '../../components/shared/PageHeader';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { PERSONAS, personaLabel, roleSubtree } from '../CommandCenter/personas';
import { timeAgo } from '../../components/shared/timeAgo';
import { ExitConditionCard, TripWireRow } from './Lifecycle';
import { LoopSpeedStrip } from './LoopSpeedStrip';
import { slaTone, statusLabel, statusTone } from './meta';
import { AgentView } from './AgentView';
import { LiveAnalysisStrip } from './LiveAnalysisStrip';
import { OrgRollup } from './OrgRollup';
import { detectThemes, rollupByReport, splitByOwnership } from './rollup';
import type { Finding, Persona } from '../../api/types';

// One finding, one lifecycle: Open (needs a decision) → Watching (recovery
// targets, fixes in motion, parked re-alerts) → Closed. The old Closure
// screen is the Watching/Closed tabs now.
const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'watching', label: 'Watching' },
  { key: 'closed', label: 'Closed' },
] as const;

// The time dimension of the queue: open findings grouped by how long they have
// sat. Oldest first — an aging open finding is drift unanswered, which is the
// one thing this product exists to make visible.
const AGE_BUCKETS = [
  { key: 'aging', label: 'Aging — open more than 7 days', minHours: 7 * 24 },
  { key: 'week', label: 'Raised this week', minHours: 24 },
  { key: 'day', label: 'Raised in the last 24 hours', minHours: 0 },
] as const;

function ageBuckets(findings: Finding[]) {
  const now = Date.now();
  return AGE_BUCKETS.map((b, i) => ({
    ...b,
    items: findings.filter((f) => {
      const hours = (now - new Date(f.detectedAt).getTime()) / 3_600_000;
      const cap = i === 0 ? Infinity : AGE_BUCKETS[i - 1].minHours;
      return hours >= b.minHours && hours < cap;
    }),
  })).filter((b) => b.items.length > 0);
}

type TabKey = (typeof TABS)[number]['key'];

// One row = title + a plain meta line + at most two badges (severity dot,
// SLA clock). Everything else lives in the meta line or on the thread.
function FindingRow({ finding, streamName }: { finding: Finding; streamName?: string }) {
  return (
    <div className="dec-item">
      <span className={`ag-dot sev-${finding.severity}`} title={`Severity: ${finding.severity}`} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="t1">
          <Link to={`/operate/findings/${finding.id}`}>{finding.title}</Link>
        </div>
        <div className="t2">
          <span className="mono" style={{ color: 'var(--ink-3)' }}>{timeAgo(finding.detectedAt)}</span>
          {' '}· {finding.raisedByAgentName}
          {streamName ? <> · {streamName}</> : null}
          {finding.entity ? <> · {finding.entity}{finding.region ? ` (${finding.region})` : ''}</> : null}
          {' '}· <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{finding.impactEstimate}</span>
          {finding.origin === 'sweep' && <> · live data</>}
          {finding.escalationLevel > 0 && (
            <span style={{ color: 'var(--red)' }}>
              {' '}· {finding.escalatedFrom ? `escalated from ${personaLabel(finding.escalatedFrom)}` : 'escalated'}
            </span>
          )}
          {finding.dottedPersona && <> · visible to {personaLabel(finding.dottedPersona)}</>}
        </div>
      </div>
      <div className="acts" style={{ alignItems: 'center' }}>
        {finding.status === 'open' ? (
          <>
            <Pill tone={slaTone(finding.slaHoursRemaining)}>{finding.slaHoursRemaining}h</Pill>
            <Link className="btn sm decide" to={`/operate/findings/${finding.id}`}>Decide</Link>
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
  // Lifecycle (Open / Watching / Closed) is the default view — the queue.
  // Grouping by the agent that raised each finding ("who found this, and have
  // they been right before") is the opt-in, behind ?view=agents.
  const byAgent = searchParams.get('view') === 'agents';

  // The global lens routes here too: a sales supervisor sees sales findings,
  // Commercial finance sees returns / discounts / trade spend, the COO sees
  // the cross-functional ones — plus their whole team in hierarchy mode.
  const { data: findings, isLoading, isError } = useFindings({ stream, persona, scope });
  const { data: closures } = useClosureKpis(persona, scope);
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

  const streamName = (key: string | null) => brain?.streams.find((s) => s.key === key)?.name;

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
      <PageHeader
        title="Findings"
        subtitle="Raised by an agent when a number drifts. Every finding gets a decision — Accept, Act, Park, or Dismiss — then stays watched until the number is back."
      />

      {/* The agents, mid-walk: what they are reading right now, and what
          they raised. Renders nothing until a sweep has ever run. */}
      <LiveAnalysisStrip />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {byAgent ? (
          <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
            Every finding in your scope, grouped by the agent that raised it.
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
          <button className={byAgent ? '' : 'on'} onClick={() => setParam('view', 'all')}>Lifecycle</button>
          <button className={byAgent ? 'on' : ''} onClick={() => setParam('view', 'agents')}>By agent</button>
        </div>
        <select className="select" value={stream} onChange={(e) => setParam('stream', e.target.value)}>
          <option value="all">All streams</option>
          {brain?.streams.map((s) => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>
        <select className="select" value={region} onChange={(e) => setParam('region', e.target.value)}>
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
                <h3>Needs a decision</h3>
                <Pill tone="red">{open.length}</Pill>
              </div>
              {ageBuckets(open).map((bucket) => (
                <div key={bucket.key}>
                  <div className="eyebrow" style={{ padding: '10px 20px 2px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    {bucket.label}
                    <span style={{ color: bucket.key === 'aging' ? 'var(--red)' : 'var(--ink-3)' }}>× {bucket.items.length}</span>
                  </div>
                  {bucket.items.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
                </div>
              ))}
            </div>
          ) : (
            <div className="card" data-tour="findings-open">
              <div className="state-msg">Nothing open — the agents are quiet here. Accepted and parked findings live under Watching.</div>
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
                A clock ran out below you, so ownership moved up. These are yours now — nothing else in your organisation
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
                  : 'Nothing is waiting on your decision. What your organisation is carrying is rolled up below.'}
              </div>
            )}
            {myOpen.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
          </div>

          {dottedOpen.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>Visible to you — not your call</h3>
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
            <h3>Recovery targets — watched until the number is back</h3>
            <Pill tone="teal">{inFlight.length}</Pill>
          </div>
          {inFlight.length === 0 && <div className="card" style={{ marginBottom: 24 }}><div className="state-msg">No recovery targets being watched — Accept a finding and it appears here until the number is back.</div></div>}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }} data-tour="closure-exit">
            {inFlight.map((c) => <ExitConditionCard key={c.id} c={c} />)}
          </div>

          {acting.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>Fixes in motion</h3>
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
                <h3>Parked — will re-alert if it worsens</h3>
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
          {closedLoops.length === 0 && <div className="card" style={{ marginBottom: 24 }}><div className="state-msg">No closed loops yet — when a recovery target is met, the finding retires itself here.</div></div>}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
            {closedLoops.map((c) => <ExitConditionCard key={c.id} c={c} />)}
          </div>

          {abandoned.length > 0 && (
            <>
              <div className="sec-head" style={{ padding: '0 0 12px' }}>
                <h3>Dismissed — the reason tuned the agent</h3>
                <Pill tone="gray">{abandoned.length}</Pill>
              </div>
              <div className="card" style={{ marginBottom: 24 }}>
                {abandoned.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
              </div>
            </>
          )}
        </>
      )}

      {/* The time dimension of the loop itself: one aggregated close-time
          trend at the current lens — the per-mandate table lives on
          Performance. Rendered on every tab; the loop's speed is the context
          for whichever slice of it you are looking at. */}
      {!byAgent && <LoopSpeedStrip />}
    </section>
  );
}
