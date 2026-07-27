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

function MandateChip({ node, muted }: { node: BrainNode; muted?: boolean }) {
  return (
    <Link
      to={`/build/picture?focus=${node.id}`}
      title={`${node.definition} — view on the Operating Picture`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
        color: muted ? 'var(--ink-3)' : 'var(--ink-2)', textDecoration: 'none',
        border: '1px solid var(--border)', borderRadius: 99, padding: '3px 9px', background: 'var(--surface)',
      }}
    >
      {node.name}
    </Link>
  );
}

// One worker built to execute on a mandate the agent holds. The shared mandate
// chip is the join — the thread from "the agent watches this" to "this worker
// works it" made visible.
function WorkerRow({ worker, sharedMandates }: { worker: AgentCatalogEntry; sharedMandates: BrainNode[] }) {
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {sharedMandates.map((m) => <MandateChip key={m.id} node={m} />)}
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
  const totalRuns = workers.reduce((s, w) => s + (w.runsCount ?? 0), 0);
  const sharedFor = (w: AgentCatalogEntry): BrainNode[] =>
    (w.mandateIds ?? [])
      .filter((id) => agent.watchesNodeIds.includes(id))
      .map((id) => nodeById.get(id))
      .filter((n): n is BrainNode => !!n);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      {/* The holder agent — the top of this team */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{agent.name}</span>
            <Pill tone={healthTone[agent.health]}>{healthLabel[agent.health]}</Pill>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            agent to <b style={{ color: 'var(--ink)' }}>{o.name}</b> · {o.role}
          </div>
          {mandates.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {mandates.map((m) => <MandateChip key={m.id} node={m} muted />)}
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
          {workers.map((w) => <WorkerRow key={w.agentId} worker={w} sharedMandates={sharedFor(w)} />)}
        </>
      ) : (
        <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--ink-3)' }}>
          No workers built yet — <Link to="/operate/findings?tab=open" className="link">Act on one of this agent’s findings</Link> to spawn one.
        </div>
      )}
    </div>
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

  // The join: a worker belongs to the agent whose watched mandates it works.
  const workersOf = (a: ShadowAgent): AgentCatalogEntry[] =>
    allWorkers.filter((w) => (w.mandateIds ?? []).some((id) => a.watchesNodeIds.includes(id)));

  const openFindingsOf = (a: ShadowAgent): number =>
    allFindings.filter((f) => f.streamKey === a.streamKey && f.status === 'open').length;

  const assigned = new Set(fnAgents.flatMap((a) => workersOf(a).map((w) => w.agentId)));
  const unassigned = allWorkers.filter((w) => !assigned.has(w.agentId));

  const totalWorkers = assigned.size;
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
            running on its mandates. The link is the shared mandate, not a label.
          </>
        }
      />
      <SectionTabs tabs={AGENTS_TABS} />

      {chief && (
        <div className="card" style={{ padding: '16px 22px', marginBottom: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20, borderColor: 'var(--accent)' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--accent-deep)', marginBottom: 4 }}>Org level · commands every team</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{chief.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>agent to {chief.humanOwner.name} · {chief.humanOwner.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 26 }}>
            <Stat value={fnAgents.length} label="agents" />
            <Stat value={totalWorkers} label="workers" />
            <Stat value={totalRuns} label="runs" />
          </div>
        </div>
      )}

      {fnAgents.map((a) => (
        <TeamBlock
          key={a.id}
          agent={a}
          mandates={mandatesOf(a)}
          workers={workersOf(a)}
          openFindings={openFindingsOf(a)}
          nodeById={nodeById}
        />
      ))}

      {unassigned.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>
            Unaffiliated workers
            <span style={{ fontWeight: 400, fontSize: 11.5, color: 'var(--ink-3)', marginLeft: 8 }}>
              no mandate they work is watched by an agent in this lens
            </span>
          </div>
          {unassigned.map((w) => <WorkerRow key={w.agentId} worker={w} sharedMandates={(w.mandateIds ?? []).map((id) => nodeById.get(id)).filter((n): n is BrainNode => !!n)} />)}
        </div>
      )}
    </section>
  );
}
