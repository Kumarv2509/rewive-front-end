import { Link } from 'react-router-dom';
import { useKpiBrain, useShadowOrg, useFindings } from '../../api/shadowOrg';
import { useAgentCatalog } from '../../api/agentSpace';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Intro } from '../../components/shared/Intro';
import { Pill } from '../../components/shared/Pill';
import { SectionTabs, AGENTS_TABS } from '../../components/shared/SectionTabs';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import type { AgentCatalogEntry, BrainNode, ShadowAgent, ShadowAgentHealth } from '../../api/types';

const healthTone: Record<ShadowAgentHealth, 'green' | 'amber' | 'red'> = {
  healthy: 'green',
  attention: 'amber',
  critical: 'red',
};
const healthLabel: Record<ShadowAgentHealth, string> = {
  healthy: 'healthy',
  attention: 'attention',
  critical: 'needs you',
};

// Per-function colour + icon, so each team reads at a glance. Hues are the
// paper-ledger palette (accent + the semantic tokens) held muted — no
// gradients, no glow. Keyed off the agent's streamKey (its function).
type FnStyle = { icon: string; c: string };
const FN_STYLE: Record<string, FnStyle> = {
  commercial: { icon: '📈', c: '#0D7E74' },
  planning: { icon: '📦', c: '#3B3BC4' },
  manufacturing: { icon: '🏭', c: '#9A6700' },
  logistics: { icon: '🚚', c: '#2563A8' },
  quality: { icon: '🔬', c: '#1B7F4D' },
  finance: { icon: '💳', c: '#7A4FB0' },
  marketing: { icon: '📣', c: '#A8447A' },
  people: { icon: '👥', c: '#5A5D72' },
};
const CHIEF_STYLE: FnStyle = { icon: '★', c: '#3B3BC4' };
const DEFAULT_STYLE: FnStyle = { icon: '●', c: '#5A5D72' };
const styleFor = (streamKey: string | null): FnStyle =>
  streamKey === null ? CHIEF_STYLE : FN_STYLE[streamKey] ?? DEFAULT_STYLE;

function FnBadge({ style, size = 34 }: { style: FnStyle; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.5), background: style.c + '1A',
        border: `1px solid ${style.c}33`,
      }}
    >
      {style.icon}
    </div>
  );
}

function MandateChip({ node, accent }: { node: BrainNode; accent?: string }) {
  return (
    <Link
      to={`/build/picture?focus=${node.id}`}
      title={`${node.definition} — view on the Operating Picture`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
        color: accent ?? 'var(--ink-2)', textDecoration: 'none',
        border: `1px solid ${accent ? accent + '55' : 'var(--border)'}`, borderRadius: 99,
        padding: '3px 9px', background: accent ? accent + '12' : 'var(--surface)',
      }}
    >
      {node.name}
    </Link>
  );
}

// One worker built to execute on a mandate the agent holds. The shared mandate
// chip is the join made visible — the thread from "the agent watches this" to
// "this worker works it".
function WorkerRow({ worker, sharedMandates, accent, reportsTo }: { worker: AgentCatalogEntry; sharedMandates: BrainNode[]; accent: string; reportsTo?: string }) {
  return (
    <Link
      to={`/insights/agents/${worker.agentId}`}
      className="dec-item"
      style={{ textDecoration: 'none', color: 'inherit', alignItems: 'center' }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{worker.name}</span>
          <Pill tone={worker.state === 'live' ? 'green' : 'gray'}>{worker.state}</Pill>
        </div>
        {reportsTo && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>
            reports to <b style={{ color: accent, fontWeight: 700 }}>{reportsTo}</b>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {sharedMandates.map((m) => <MandateChip key={m.id} node={m} accent={accent} />)}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0, textAlign: 'right' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-.3px' }}>{worker.roiToDate.value}</div>
          <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--ink-3)' }}>{worker.roiToDate.label}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-.3px' }}>{worker.runsCount}</div>
          <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--ink-3)' }}>runs · {worker.lastRunAt ?? 'never'}</div>
        </div>
      </div>
    </Link>
  );
}

function TeamBlock({ agent, mandates, workers, openFindings, nodeById }: {
  agent: ShadowAgent;
  mandates: BrainNode[];
  workers: AgentCatalogEntry[];
  openFindings: number;
  nodeById: Map<string, BrainNode>;
}) {
  const o = agent.humanOwner;
  const style = styleFor(agent.streamKey);
  const totalRuns = workers.reduce((s, w) => s + (w.runsCount ?? 0), 0);
  const sharedFor = (w: AgentCatalogEntry): BrainNode[] =>
    (w.mandateIds ?? [])
      .filter((id) => agent.watchesNodeIds.includes(id))
      .map((id) => nodeById.get(id))
      .filter((n): n is BrainNode => !!n);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16, borderLeft: `4px solid ${style.c}` }}>
      {/* The holder agent — the top of this team */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <FnBadge style={style} size={40} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{agent.name}</span>
            <Pill tone={healthTone[agent.health]}>{healthLabel[agent.health]}</Pill>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            agent to <b style={{ color: 'var(--ink)' }}>{o.name}</b> · {o.role}
          </div>
          {mandates.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {mandates.map((m) => <MandateChip key={m.id} node={m} accent={style.c} />)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <Stat value={openFindings} label="open findings" tone={openFindings ? 'amber' : undefined} />
          <Stat value={workers.length} label="workers" />
          <Stat value={totalRuns} label="runs" />
        </div>
      </div>

      {/* The workforce it commands — executing on the mandates above */}
      {workers.length > 0 ? (
        <>
          <div style={{ padding: '8px 20px 2px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink-3)' }}>
            ↳ workforce executing on these mandates
          </div>
          {workers.map((w) => <WorkerRow key={w.agentId} worker={w} sharedMandates={sharedFor(w)} accent={style.c} reportsTo={agent.name} />)}
        </>
      ) : (
        <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--ink-3)' }}>
          No workers built yet — <Link to="/operate/findings?tab=open" className="link">Act on one of this agent’s findings</Link> to spawn one.
        </div>
      )}
    </div>
  );
}

// Agents that hold mandates but have no workforce yet — kept as a compact strip
// rather than 10 empty team blocks, so the teams that DO exist read clearly.
function WatchingCard({ agent, openFindings }: { agent: ShadowAgent; openFindings: number }) {
  const style = styleFor(agent.streamKey);
  return (
    <Link
      to="/operate/findings?tab=open"
      className="card"
      style={{
        textDecoration: 'none', color: 'inherit', padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 11, borderLeft: `3px solid ${style.c}`,
      }}
    >
      <FnBadge style={style} size={30} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
          {agent.watchesNodeIds.length} mandate{agent.watchesNodeIds.length === 1 ? '' : 's'} · no workforce yet
        </div>
      </div>
      {openFindings > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', flexShrink: 0 }}>{openFindings} open</span>
      )}
    </Link>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: 'amber' | 'red' }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'var(--ink)';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-.5px' }}>{value}</div>
      <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--ink-3)' }}>{label}</div>
    </div>
  );
}

export function AgentTeamsScreen() {
  const { persona, scope } = useEffectiveLens();
  const { data: org, isLoading, isError } = useShadowOrg(persona, scope);
  const { data: workers } = useAgentCatalog({ persona, scope });
  const { data: brain } = useKpiBrain();
  const { data: findings } = useFindings({ persona, scope });

  if (isLoading) return <section className="screen"><Loading label="Assembling the teams…" /></section>;
  if (isError || !org) return <section className="screen"><ErrorMessage message="Couldn't load the teams." /></section>;

  const nodeById = new Map<string, BrainNode>((brain?.nodes ?? []).map((n) => [n.id, n]));
  const allWorkers = workers ?? [];
  const allFindings = findings ?? [];

  const chief = org.agents.find((a) => a.reportsToAgentId === null);
  const fnAgents = org.agents.filter((a) => a.reportsToAgentId !== null);

  const mandatesOf = (a: ShadowAgent): BrainNode[] =>
    a.watchesNodeIds
      .map((id) => nodeById.get(id))
      .filter((n): n is BrainNode => !!n && (n.kind === 'stream_kpi' || n.kind === 'target'));

  // Findings belong to ONE agent — matched on streamKey AND persona, which is
  // unique across the org (6 agents share the streamKey "finance", so streamKey
  // alone showed the same finding under all six).
  const openFindingsOf = (a: ShadowAgent): number =>
    allFindings.filter((f) => f.status === 'open' && f.streamKey === a.streamKey && f.persona === a.persona).length;

  // A worker belongs to exactly ONE agent. Several agents can watch a shared
  // mandate, so we pick the true owner: prefer the agent whose persona matches
  // the worker's, then the greatest mandate overlap, then the most specific
  // agent (fewest mandates watched). Deterministic — no worker is double-listed.
  const overlapCount = (w: AgentCatalogEntry, a: ShadowAgent): number =>
    (w.mandateIds ?? []).filter((id) => a.watchesNodeIds.includes(id)).length;

  const fnAgentIds = new Set(fnAgents.map((a) => a.id));

  const ownerIdFor = (w: AgentCatalogEntry): string | null => {
    // The explicit link wins — set at build time in Agent Studio. Fall back to
    // inference (shared mandate) only for workers built before the link existed.
    if (w.reportsToAgentId && fnAgentIds.has(w.reportsToAgentId)) return w.reportsToAgentId;
    const claimants = fnAgents.filter((a) => overlapCount(w, a) > 0);
    if (!claimants.length) return null;
    const exact = claimants.filter((a) => a.persona === w.persona);
    const pool = exact.length ? exact : claimants;
    pool.sort((x, y) => {
      const ov = overlapCount(w, y) - overlapCount(w, x);
      if (ov) return ov;
      const spec = x.watchesNodeIds.length - y.watchesNodeIds.length;
      if (spec) return spec;
      return x.id < y.id ? -1 : 1;
    });
    return pool[0].id;
  };

  const workersByOwner = new Map<string, AgentCatalogEntry[]>();
  const unassigned: AgentCatalogEntry[] = [];
  for (const w of allWorkers) {
    const owner = ownerIdFor(w);
    if (!owner) { unassigned.push(w); continue; }
    const list = workersByOwner.get(owner) ?? [];
    list.push(w);
    workersByOwner.set(owner, list);
  }

  // Teams that actually have a workforce lead, sorted by size; the rest fold
  // into the watching strip below.
  const teamed = fnAgents
    .filter((a) => (workersByOwner.get(a.id)?.length ?? 0) > 0)
    .sort((x, y) => (workersByOwner.get(y.id)?.length ?? 0) - (workersByOwner.get(x.id)?.length ?? 0));
  const watching = fnAgents.filter((a) => (workersByOwner.get(a.id)?.length ?? 0) === 0);

  const totalWorkers = allWorkers.length - unassigned.length;
  const totalRuns = allWorkers.reduce((s, w) => s + (w.runsCount ?? 0), 0);

  return (
    <section className="screen" style={{ maxWidth: 1080 }}>
      <h1 className="page">Agents</h1>
      <Intro
        line="Each agent commands a workforce — the mandate it holds is the thread that connects the two."
        more={
          <>
            A holder <b>agent</b> watches its function’s mandates and raises findings when they drift. When you
            <b> Act</b> on a finding, you spawn a <b>worker</b> to fix it — and that worker executes runs against the
            same mandate. This view stacks that top to bottom: the org’s agents, and under each, the workforce
            running on its mandates. Every worker belongs to exactly one team — the agent that holds the mandate it
            works. Agents still building a workforce sit in the strip at the bottom.
          </>
        }
      />
      <SectionTabs tabs={AGENTS_TABS} />

      {chief && (
        <div className="card" style={{ padding: '16px 22px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, borderColor: 'var(--accent)' }}>
          <FnBadge style={CHIEF_STYLE} size={40} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--accent-deep)', marginBottom: 4 }}>Org level · commands every team</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{chief.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>agent to {chief.humanOwner.name} · {chief.humanOwner.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 26 }}>
            <Stat value={teamed.length} label="teams" />
            <Stat value={totalWorkers} label="workers" />
            <Stat value={totalRuns} label="runs" />
          </div>
        </div>
      )}

      {teamed.map((a) => (
        <TeamBlock
          key={a.id}
          agent={a}
          mandates={mandatesOf(a)}
          workers={workersByOwner.get(a.id) ?? []}
          openFindings={openFindingsOf(a)}
          nodeById={nodeById}
        />
      ))}

      {watching.length > 0 && (
        <>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--ink-3)', margin: '22px 0 10px' }}>
            Watching · no workforce yet
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {watching.map((a) => <WatchingCard key={a.id} agent={a} openFindings={openFindingsOf(a)} />)}
          </div>
        </>
      )}

      {unassigned.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', margin: '16px 0' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
            Unaffiliated workers
            <span style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 8 }}>
              no mandate they work is watched by an agent in this lens
            </span>
          </div>
          {unassigned.map((w) => (
            <WorkerRow
              key={w.agentId}
              worker={w}
              accent={DEFAULT_STYLE.c}
              sharedMandates={(w.mandateIds ?? []).map((id) => nodeById.get(id)).filter((n): n is BrainNode => !!n)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
