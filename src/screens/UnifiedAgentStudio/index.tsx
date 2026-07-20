import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useAgentSpec,
  useUpdateBusinessAltitude,
  useUpdateDeveloperAltitude,
  useEscalateAgentSpec,
  useTestRunAgentSpec,
  useHandbackAgentSpec,
  usePublishAgentSpec,
} from '../../api/agentSpec';
import { Intro } from '../../components/shared/Intro';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { HandoffCard } from '../../components/shared/HandoffCard';
import { useToast } from '../../components/shared/Toast';
import { DelegateIdentityPanel } from './DelegateIdentityPanel';
import type { AgentAltitude, AgentSpec, AgentSpecStatus } from '../../api/types';

const statusTone: Record<AgentSpecStatus, 'gray' | 'amber' | 'teal' | 'green'> = {
  drafting: 'gray',
  escalated: 'amber',
  ready_to_publish: 'teal',
  published: 'green',
};

export function UnifiedAgentStudioScreen() {
  const { agentSpecId } = useParams();
  const { data: spec, isLoading, isError } = useAgentSpec(agentSpecId);

  if (isLoading) return <section className="screen"><Loading /></section>;
  if (isError || !spec) return <section className="screen"><ErrorMessage message="Couldn't load this worker." /></section>;

  // key={spec.id} resets the draft fields below whenever the underlying worker changes.
  return <AgentStudioBody key={spec.id} spec={spec} />;
}

function AgentStudioBody({ spec }: { spec: AgentSpec }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [altitude, setAltitude] = useState<AgentAltitude>('business');
  const [intent, setIntent] = useState(spec.intent);
  const [dataContract, setDataContract] = useState(spec.dataContract.join(', '));
  const [permissions, setPermissions] = useState(spec.permissions.join(', '));
  const [guardrails, setGuardrails] = useState(spec.guardrails);
  const [escalateNote, setEscalateNote] = useState('');

  const updateBusiness = useUpdateBusinessAltitude(spec.id);
  const updateDeveloper = useUpdateDeveloperAltitude(spec.id);
  const escalate = useEscalateAgentSpec(spec.id);
  const testRun = useTestRunAgentSpec(spec.id);
  const handback = useHandbackAgentSpec(spec.id);
  const publish = usePublishAgentSpec(spec.id);

  const canPublish = spec.status !== 'published' && (!spec.needsTechnicalWork || spec.status === 'ready_to_publish');

  return (
    <section className="screen">
      <Link to={`/build/solutions/${spec.solutionDesignId}`} className="btn ghost sm" style={{ marginBottom: 14, display: 'inline-flex' }}>&larr; Solution design</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 className="page" style={{ marginBottom: 0 }}>{spec.name}</h1>
        <Pill tone={statusTone[spec.status]}>{spec.status.replace(/_/g, ' ')}</Pill>
        <Pill tone="gray">v{spec.version}</Pill>
      </div>
      <Intro line="One spec, two altitudes — business and developer edit the same worker, not separate copies." />

      <div className="filters" style={{ marginBottom: 16 }}>
        <button className={`fchip${altitude === 'business' ? ' on' : ''}`} onClick={() => setAltitude('business')}>Business</button>
        <button className={`fchip${altitude === 'developer' ? ' on' : ''}`} onClick={() => setAltitude('developer')}>Developer</button>
      </div>

      {spec.needsTechnicalWork && spec.status === 'drafting' && (
        <div className="concept-note">The validation worker flagged this may need a new data connector &mdash; consider escalating to a developer below.</div>
      )}

      <DelegateIdentityPanel spec={spec} />

      {altitude === 'business' && (
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>What this worker does</div>
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            style={{ width: '100%', minHeight: 70, border: '1px solid var(--border-strong)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 13, resize: 'vertical', marginBottom: 8 }}
          />
          <button
            className="btn ghost sm"
            disabled={updateBusiness.isPending || intent === spec.intent}
            onClick={() => updateBusiness.mutate({ intent }, { onSuccess: () => showToast('Saved') })}
            style={{ marginBottom: 16 }}
          >
            Save
          </button>

          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Capabilities</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {spec.capabilities.map((cap) => (
              <button
                key={cap.id}
                className={`fchip${cap.selected ? ' on' : ''}`}
                onClick={() =>
                  updateBusiness.mutate({
                    capabilities: spec.capabilities.map((c) => (c.id === cap.id ? { ...c, selected: !c.selected } : c)),
                  })
                }
              >
                {cap.label}
              </button>
            ))}
          </div>

          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Plan preview</div>
          <ol style={{ paddingLeft: 18, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 16 }}>
            {spec.planPreview.map((step, i) => <li key={i} style={{ marginBottom: 4 }}>{step}</li>)}
          </ol>

          {spec.status === 'drafting' && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input
                placeholder="Note for the developer (why plain language ran out)"
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
              />
              <button
                className="btn"
                disabled={escalate.isPending}
                onClick={() => escalate.mutate({ note: escalateNote }, { onSuccess: () => showToast('Escalated to developer') })}
              >
                Escalate to developer
              </button>
            </div>
          )}
        </div>
      )}

      {altitude === 'developer' && (
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Specification</div>
          <label style={{ fontSize: 11.5, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Data contract</label>
          <input value={dataContract} onChange={(e) => setDataContract(e.target.value)} style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }} />
          <label style={{ fontSize: 11.5, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Tool and connector permissions</label>
          <input value={permissions} onChange={(e) => setPermissions(e.target.value)} style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }} />
          <label style={{ fontSize: 11.5, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>Guardrails</label>
          <textarea value={guardrails} onChange={(e) => setGuardrails(e.target.value)} style={{ width: '100%', minHeight: 60, border: '1px solid var(--border-strong)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 13, resize: 'vertical', marginBottom: 10 }} />
          <button
            className="btn ghost sm"
            disabled={updateDeveloper.isPending}
            onClick={() =>
              updateDeveloper.mutate(
                { dataContract: dataContract.split(',').map((s) => s.trim()).filter(Boolean), permissions: permissions.split(',').map((s) => s.trim()).filter(Boolean), guardrails },
                { onSuccess: () => showToast('Saved') }
              )
            }
            style={{ marginBottom: 16 }}
          >
            Save
          </button>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: spec.testRunResult ? 8 : 0 }}>
            <button className="btn" disabled={testRun.isPending} onClick={() => testRun.mutate(undefined)}>
              Test run against fixtures
            </button>
            {spec.status === 'escalated' && (
              <button className="btn primary" disabled={handback.isPending} onClick={() => handback.mutate(undefined, { onSuccess: () => showToast('Handed back to business') })}>
                Hand back to business
              </button>
            )}
          </div>
          {spec.testRunResult && <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{spec.testRunResult}</div>}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Version trail</div>
        {spec.versionTrail.map((v) => (
          <div key={v.version} style={{ fontSize: 12, color: 'var(--ink-2)', padding: '5px 0', borderTop: '1px solid var(--border)' }}>
            <b style={{ color: 'var(--ink)' }}>v{v.version}</b> {v.summary} &middot; {v.actorName} &middot; {v.altitude} altitude
          </div>
        ))}
      </div>

      {spec.escalation && <HandoffCard card={spec.escalation} />}
      {spec.handback && <HandoffCard card={spec.handback} />}

      {spec.status === 'published' ? (
        <div className="card" style={{ padding: '16px 20px', background: 'var(--green-soft)', border: 'none', color: 'var(--green)', fontWeight: 600, fontSize: 13 }}>
          Published &mdash; now live in Worker Space.
        </div>
      ) : (
        canPublish && (
          <button
            className="btn primary"
            disabled={publish.isPending}
            onClick={() => publish.mutate(undefined, { onSuccess: () => { showToast('Worker published'); navigate(`/build/solutions/${spec.solutionDesignId}`); } })}
          >
            Publish worker
          </button>
        )
      )}
    </section>
  );
}
