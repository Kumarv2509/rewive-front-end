import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFindings, useKpiBrain, useShadowOrg } from '../../api/shadowOrg';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Intro } from '../../components/shared/Intro';
import { ScopeBanner } from '../../components/shared/ScopeBanner';
import { Pill } from '../../components/shared/Pill';
import { SectionTabs, AGENTS_TABS } from '../../components/shared/SectionTabs';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { severityTone, slaTone } from '../Findings/meta';
import type { Finding, ShadowAgent, ShadowAgentHealth } from '../../api/types';

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

// Delegate temperament as an autonomy dial: quiet ↔ hair-trigger. The hint
// line spells out the consequence of where the dial sits, so it reads as a
// setting rather than decoration.
function temperamentHint(value: number): string {
  if (value < 34) return 'raises only high-impact findings — quiet weeks are normal';
  if (value < 67) return 'balanced — flags what a diligent owner would want to see';
  return 'hair-trigger — flags early and often; expect more, smaller findings';
}

function TemperamentDial({ value }: { value: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ink-3)', marginBottom: 4, fontFamily: 'var(--font-mono, ui-monospace)' }}>
        <span>quiet</span><span>hair-trigger</span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 99, background: 'var(--glass-hover)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${value}%`, borderRadius: 99, background: 'var(--accent-grad)' }} />
        <div style={{ position: 'absolute', left: `calc(${value}% - 5px)`, top: -2, width: 10, height: 10, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 1.5px var(--accent)' }} />
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 5 }}>{temperamentHint(value)}</div>
    </div>
  );
}

function AgentCard({ agent, mandateCount, findings }: { agent: ShadowAgent; mandateCount: number; findings: Finding[] }) {
  const [open, setOpen] = useState(false);
  const openFindings = findings.filter((f) => f.streamKey === agent.streamKey && f.status === 'open');
  const o = agent.humanOwner;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{agent.name}</div>
          <Pill tone={healthTone[agent.health]}>{healthLabel[agent.health]}</Pill>
        </div>

        {/* held twice — the counterpart and its human */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'var(--glass)', border: '1px solid var(--border)', marginBottom: 14 }}>
          <div className="avatar" style={{ background: o.avatarBg }}>{o.initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink-3)' }}>counterpart to</div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{o.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{o.role}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          <Stat label="mandates" value={mandateCount} />
          <Stat label="open findings" value={agent.openFindings} tone={agent.openFindings ? 'amber' : undefined} />
          <Stat label="SLA breaches" value={agent.slaBreaches} tone={agent.slaBreaches ? 'red' : undefined} />
        </div>

        <TemperamentDial value={agent.temperament} />
      </div>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          {agent.lastSenseSweepAt && <>senses swept {relTime(agent.lastSenseSweepAt)} · </>}
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
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
      <div style={{ fontSize: 19, fontWeight: 700, color, letterSpacing: '-.5px' }}>{value}</div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--ink-3)' }}>{label}</div>
    </div>
  );
}

export function ShadowOrgScreen() {
  const { persona, scope } = useEffectiveLens();
  const { data: org, isLoading, isError } = useShadowOrg(persona, scope);
  const { data: findings } = useFindings({ persona, scope });
  const { data: brain } = useKpiBrain();

  if (isLoading) return <section className="screen"><Loading label="Assembling the counterparts…" /></section>;
  if (isError || !org) return <section className="screen"><ErrorMessage message="Couldn't load the counterparts." /></section>;

  const allFindings = findings ?? [];
  const chief = org.agents.find((a) => a.reportsToAgentId === null);
  const streamAgents = org.agents.filter((a) => a.reportsToAgentId !== null);
  const mandateCount = (a: ShadowAgent) =>
    a.watchesNodeIds.filter((id) => brain?.nodes.find((n) => n.id === id && (n.kind === 'stream_kpi' || n.kind === 'target'))).length;

  const totalOpen = streamAgents.reduce((s, a) => s + a.openFindings, 0);
  const totalBreaches = streamAgents.reduce((s, a) => s + a.slaBreaches, 0);
  const escalated = allFindings.filter((f) => chief && f.escalatedToAgentId === chief.id && f.status === 'open');

  return (
    <section className="screen" style={{ maxWidth: 1280 }}>
      <h1 className="page">Agents</h1>
      <Intro
        line="A tireless counterpart for every function — every mandate is held twice."
        more={
          <>
            Each counterpart watches its function's mandates through their data feeds, raises findings when reality
            drifts, and escalates up the chain of counterparts when no one responds. The org-level chief watches the
            intents themselves. The temperament dial sets how eagerly a counterpart raises — quiet to hair-trigger —
            and every dismissal you make tunes it further.
          </>
        }
      />
      <SectionTabs tabs={AGENTS_TABS} />
      <ScopeBanner />

      {chief && (
        <div className="card" style={{ padding: '18px 22px', marginBottom: 20, borderColor: 'rgba(59,59,196,.28)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--accent-deep)', marginBottom: 4 }}>Org level · reports to no one</div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{chief.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>counterpart to {chief.humanOwner.name} · {chief.humanOwner.role} · watches the intents</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Stat label="open across org" value={totalOpen} tone={totalOpen ? 'amber' : undefined} />
            <Stat label="SLA breaches" value={totalBreaches} tone={totalBreaches ? 'red' : undefined} />
            <Stat label="escalated to chief" value={escalated.length} tone={escalated.length ? 'red' : undefined} />
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }} data-tour="counterpart-grid">
        {streamAgents.map((a) => (
          <AgentCard key={a.id} agent={a} mandateCount={mandateCount(a)} findings={allFindings} />
        ))}
      </div>
    </section>
  );
}
