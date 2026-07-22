import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { Sparkline } from '../../components/shared/Sparkline';
import { personaLabel } from '../CommandCenter/personas';
import { slaTone, statusLabel, statusTone } from './meta';
import type { Finding, ShadowAgent } from '../../api/types';

// The same findings, asked a different question: not "what must I answer" but
// "who raised this, and have they been right before". Agents owns
// "meet the agents"; this view stays about the findings — an agent appears
// only because it raised something in your scope.

const DAYS = 14;

interface AgentGroup {
  agentId: string;
  name: string;
  agent: ShadowAgent | undefined;
  findings: Finding[];
  open: number;
  breached: number;
  /** Dispositioned findings that turned out real vs dismissed as noise. */
  landed: number;
  dismissed: number;
  /** Findings raised per day over the trailing window. */
  cadence: number[];
}

function initials(name: string): string {
  return name
    .replace(/[^A-Za-z ]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '··';
}

function relative(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function groupByAgent(findings: Finding[], agents: ShadowAgent[]): AgentGroup[] {
  const byId = new Map<string, ShadowAgent>(agents.map((a) => [a.id, a]));
  const groups = new Map<string, AgentGroup>();
  const dayMs = 86_400_000;
  const today = Math.floor(Date.now() / dayMs);

  for (const f of findings) {
    let g = groups.get(f.raisedByAgentId);
    if (!g) {
      g = {
        agentId: f.raisedByAgentId,
        name: f.raisedByAgentName,
        agent: byId.get(f.raisedByAgentId),
        findings: [],
        open: 0,
        breached: 0,
        landed: 0,
        dismissed: 0,
        cadence: Array(DAYS).fill(0),
      };
      groups.set(f.raisedByAgentId, g);
    }
    g.findings.push(f);
    if (f.status === 'open') {
      g.open += 1;
      if (f.slaHoursRemaining <= 0) g.breached += 1;
    }
    // "Landed" = someone acted on it as real. Abandon is the agent
    // being wrong — that is the honest denominator for trust.
    if (f.status === 'abandoned') g.dismissed += 1;
    else if (f.status !== 'open') g.landed += 1;

    const bucket = DAYS - 1 - (today - Math.floor(new Date(f.detectedAt).getTime() / dayMs));
    if (bucket >= 0 && bucket < DAYS) g.cadence[bucket] += 1;
  }

  for (const g of groups.values()) {
    g.findings.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (b.status === 'open' && a.status !== 'open') return 1;
      return a.slaHoursRemaining - b.slaHoursRemaining;
    });
  }

  // Loudest-with-consequences first: breaches, then open volume, then total.
  return [...groups.values()].sort(
    (a, b) => b.breached - a.breached || b.open - a.open || b.findings.length - a.findings.length,
  );
}

function TrackRecord({ landed, dismissed }: { landed: number; dismissed: number }) {
  const judged = landed + dismissed;
  if (judged === 0) {
    return <div className="ag-trust-none">No verdicts yet — nothing it raised has been dispositioned.</div>;
  }
  const pct = Math.round((landed / judged) * 100);
  return (
    <>
      <div className="ag-meter" title={`${landed} of ${judged} dispositioned findings were treated as real`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="ag-trust-label">
        <b>{landed} of {judged}</b> calls landed · {dismissed} dismissed as noise
      </div>
    </>
  );
}

function AgentCard({ group }: { group: AgentGroup }) {
  const { agent } = group;
  const swept = relative(agent?.lastSenseSweepAt ?? agent?.lastFindingAt);
  const raisedTotal = group.findings.length;
  const recent = group.cadence.reduce((a, b) => a + b, 0);

  return (
    <div className="card ag-card">
      <div className="ag-head">
        <div className={`ag-sigil${agent ? ` h-${agent.health}` : ''}`}>{initials(group.name)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="ag-name">{group.name}</div>
          <div className="ag-sub">
            {agent
              ? <>agent to {agent.humanOwner.name} · {personaLabel(agent.persona)}</>
              : <>raised findings in your scope</>}
          </div>
        </div>
        <div className="ag-cadence">
          {/* Only claim the window when something actually landed in it — most
              seeded findings predate it, and a flat line implying "silent for
              14 days" next to "5 raised" would be a lie. */}
          {recent > 0 && (
            <span title={`${recent} raised in the last ${DAYS} days`}>
              <Sparkline points={group.cadence} color="var(--accent)" width={72} height={22} />
            </span>
          )}
          <div className="ag-cadence-label">
            {raisedTotal} raised{recent > 0 ? ` · ${recent} in ${DAYS}d` : ' · none recent'}
          </div>
        </div>
      </div>

      <div className="ag-stats">
        <div><span className="ag-fig">{group.open}</span><span className="ag-fig-l">open</span></div>
        <div><span className={`ag-fig${group.breached ? ' bad' : ''}`}>{group.breached}</span><span className="ag-fig-l">breached</span></div>
        {agent && (
          <div>
            <span className="ag-fig">{agent.temperament}</span>
            <span className="ag-fig-l" title="0 quiet … 100 hair-trigger">temperament</span>
          </div>
        )}
        {swept && <div><span className="ag-fig sm">{swept}</span><span className="ag-fig-l">last sensed</span></div>}
      </div>

      <TrackRecord landed={group.landed} dismissed={group.dismissed} />

      <div className="ag-findings">
        {group.findings.map((f) => (
          <Link key={f.id} to={`/operate/findings/${f.id}`} className="ag-row">
            <span className={`ag-dot sev-${f.severity}`} aria-hidden />
            <span className="ag-row-title">{f.title}</span>
            {f.status === 'open'
              ? <Pill tone={slaTone(f.slaHoursRemaining)}>{Math.max(0, Math.round(f.slaHoursRemaining))}h</Pill>
              : <Pill tone={statusTone[f.status]}>{statusLabel[f.status].split(' · ')[0]}</Pill>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AgentView({ findings, agents }: { findings: Finding[]; agents: ShadowAgent[] }) {
  const groups = groupByAgent(findings, agents);
  if (groups.length === 0) {
    return <div className="card"><div className="state-msg">No findings in view — nothing for your agents to show here.</div></div>;
  }
  const loudest = groups[0];
  return (
    <>
      <div className="ag-lede">
        {groups.length} agent{groups.length === 1 ? '' : 's'} raised the {findings.length} findings in your view.
        {loudest.breached > 0
          ? <> <b>{loudest.name}</b> needs you most — {loudest.breached} of its findings are past SLA.</>
          : <> Most active: <b>{loudest.name}</b>, {loudest.findings.length} raised.</>}
      </div>
      <div className="ag-grid">
        {groups.map((g) => <AgentCard key={g.agentId} group={g} />)}
      </div>
    </>
  );
}
