import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFindings, useKpiBrain, useShadowOrg } from '../../api/shadowOrg';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { PageHeader } from '../../components/shared/PageHeader';
import { Pill } from '../../components/shared/Pill';
import { SectionTabs, AGENTS_TABS } from '../../components/shared/SectionTabs';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { severityTone, slaTone } from '../Findings/meta';
import type { BrainHealth, BrainNode, Finding, ShadowAgent, ShadowAgentHealth } from '../../api/types';

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

function relTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const brainHealthColor: Record<BrainHealth, string> = {
  on_track: 'var(--green)',
  at_risk: 'var(--amber)',
  off_track: 'var(--red)',
};

// The mandates an agent holds, each deep-linking to its node on the
// Operating Picture — the visible half of "every number has two owners".
function MandateChips({ mandates }: { mandates: BrainNode[] }) {
  if (mandates.length === 0) return null;
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>watches</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {mandates.map((m) => (
          <Link
            key={m.id}
            to={`/build/picture?focus=${m.id}`}
            title={`${m.definition} — view on the Operating Picture`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: 'var(--ink-2)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 99, padding: '3px 10px', background: 'var(--surface)' }}
          >
            <i style={{ width: 6, height: 6, borderRadius: '50%', background: m.health ? brainHealthColor[m.health] : 'var(--ink-3)', flexShrink: 0 }} />
            {m.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// One agent, calm: who it is, whose number it co-holds, what it watches, and
// what it has raised. (The old temperament dial and per-card stat grid moved
// out — health + the findings footer carry the same signal with less ink.)
function AgentCard({ agent, mandates, findings }: { agent: ShadowAgent; mandates: BrainNode[]; findings: Finding[] }) {
  const [open, setOpen] = useState(false);
  const openFindings = findings.filter((f) => f.streamKey === agent.streamKey && f.status === 'open');
  const o = agent.humanOwner;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{agent.name}</div>
          <Pill tone={healthTone[agent.health]}>{healthLabel[agent.health]}</Pill>
        </div>

        {/* two owners — the agent and its human */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="avatar" style={{ background: o.avatarBg }}>{o.initials}</div>
          <div style={{ minWidth: 0, fontSize: 12.5 }}>
            <span style={{ fontWeight: 600 }}>agent to {o.name}</span>
            <span style={{ color: 'var(--ink-3)' }}> · {o.role}</span>
          </div>
        </div>

        <MandateChips mandates={mandates} />
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {agent.lastSenseSweepAt && <>swept {relTime(agent.lastSenseSweepAt)} · </>}
          last raised {relTime(agent.lastFindingAt)}
        </span>
        {openFindings.length > 0 ? (
          <button className="btn ghost sm" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide' : `What it's flagging (${openFindings.length})`}
          </button>
        ) : (
          <Link to={`/operate/findings?stream=${agent.streamKey}`} style={{ fontSize: 11.5, color: 'var(--accent-deep)', textDecoration: 'none' }}>
            Its findings →
          </Link>
        )}
      </div>

      {open && (
        <div style={{ padding: '6px 18px 2px', textAlign: 'right' }}>
          <Link to={`/operate/findings?stream=${agent.streamKey}`} style={{ fontSize: 11.5, color: 'var(--accent-deep)', textDecoration: 'none' }}>
            View all in Findings →
          </Link>
        </div>
      )}
      {open && openFindings.map((f) => (
        <Link key={f.id} to={`/operate/findings/${f.id}`} className="dec-item" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{f.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{f.impactEstimate}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <Pill tone={severityTone[f.severity]}>{f.severity}</Pill>
            <Pill tone={slaTone(f.slaHoursRemaining)}>{f.slaHoursRemaining}h</Pill>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'amber' | 'red' }) {
  const color = tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'var(--ink)';
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
      <div style={{ fontSize: 19, fontWeight: 600, color, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div className="eyebrow" style={{ fontSize: 10 }}>{label}</div>
    </div>
  );
}

export function ShadowOrgScreen() {
  const { persona, scope } = useEffectiveLens();
  const { data: org, isLoading, isError } = useShadowOrg(persona, scope);
  const { data: findings } = useFindings({ persona, scope });
  const { data: brain } = useKpiBrain();

  if (isLoading) return <section className="screen"><Loading label="Assembling the agents…" /></section>;
  if (isError || !org) return <section className="screen"><ErrorMessage message="Couldn't load the agents." /></section>;

  const allFindings = findings ?? [];
  const chief = org.agents.find((a) => a.reportsToAgentId === null);
  const streamAgents = org.agents.filter((a) => a.reportsToAgentId !== null);
  const mandatesOf = (a: ShadowAgent): BrainNode[] =>
    a.watchesNodeIds
      .map((id) => brain?.nodes.find((n) => n.id === id && (n.kind === 'stream_kpi' || n.kind === 'target')))
      .filter((n): n is BrainNode => !!n);

  const totalOpen = streamAgents.reduce((s, a) => s + a.openFindings, 0);
  const totalBreaches = streamAgents.reduce((s, a) => s + a.slaBreaches, 0);
  const escalated = allFindings.filter((f) => chief && f.escalatedToAgentId === chief.id && f.status === 'open');

  return (
    <section className="screen" style={{ maxWidth: 1280 }}>
      <PageHeader
        title="Agents"
        subtitle="A tireless agent for every function — every number has two owners: a person, and an agent that never looks away."
        tabs={<SectionTabs tabs={AGENTS_TABS} />}
      />

      {chief && (
        <div className="card" style={{ padding: '18px 22px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="eyebrow" style={{ color: 'var(--accent-deep)', marginBottom: 4 }}>Org level · reports to no one</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{chief.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>agent to {chief.humanOwner.name} · {chief.humanOwner.role} · watches the intents</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Stat label="open across org" value={totalOpen} tone={totalOpen ? 'amber' : undefined} />
            <Stat label="SLA breaches" value={totalBreaches} tone={totalBreaches ? 'red' : undefined} />
            <Stat label="escalated to chief" value={escalated.length} tone={escalated.length ? 'red' : undefined} />
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} data-tour="agent-grid">
        {streamAgents.map((a) => (
          <AgentCard key={a.id} agent={a} mandates={mandatesOf(a)} findings={allFindings} />
        ))}
      </div>
    </section>
  );
}
