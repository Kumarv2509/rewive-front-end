import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useToast } from '../../components/shared/Toast';
import { usePendingDecisions } from '../../api/dashboard';
import { useApproveDecision } from '../../api/decisions';
import { useFindings } from '../../api/shadowOrg';
import { severityTone, slaTone } from '../Findings/meta';
import { PERSONA_LABEL } from './personas';
import type { PendingDecision, Persona, RoleScope } from '../../api/types';

const actionLabelDefaults: Record<PendingDecision['actionVerb'], string> = {
  approve: 'Approve',
  act: 'Act',
  clear: 'Clear',
  release: 'Release',
};

// THE queue. Findings waiting on a disposition and decisions waiting on an
// approval, in one ranked list with one count — the only "waiting on you"
// number anywhere in the product. Findings first (they carry an SLA clock),
// most urgent on top.
export function UnifiedQueue({ persona, scope }: { persona: Persona | 'all'; scope?: RoleScope }) {
  const findingsQ = useFindings({ persona, scope, status: 'open' });
  const decisionsQ = usePendingDecisions(persona, scope);
  const approve = useApproveDecision();
  const { showToast } = useToast();

  const isLoading = findingsQ.isLoading || decisionsQ.isLoading;
  const isError = findingsQ.isError || decisionsQ.isError;
  const findings = [...(findingsQ.data ?? [])].sort((a, b) => a.slaHoursRemaining - b.slaHoursRemaining);
  const decisions = decisionsQ.data ?? [];
  const total = findings.length + decisions.length;

  return (
    <div className="card" style={{ marginBottom: 16 }} data-tour="cc-findings">
      <div className="sec-head">
        <h3>Waiting on you</h3>
        <Pill tone={total > 0 ? 'red' : 'green'}>{total}</Pill>
        <span style={{ flex: 1 }} />
        <Link className="all" to="/operate/findings">All findings →</Link>
      </div>
      {isLoading && <Loading />}
      {isError && <ErrorMessage />}
      {!isLoading && !isError && total === 0 && (
        <div className="state-msg">Nothing waiting on you — your counterparts are watching, and the queue is clear.</div>
      )}

      {findings.map((f) => (
        <div className="dec-item" key={f.id}>
          <div className="dec-ico" style={{ background: 'var(--accent-soft)' }}>🕵️</div>
          <div style={{ minWidth: 0 }}>
            <div className="t1">
              <Link to={`/operate/findings/${f.id}`}>{f.title}</Link>{' '}
              <Pill tone={severityTone[f.severity]}>{f.severity}</Pill>
              {' '}<Pill tone="gray">→ {PERSONA_LABEL[f.persona]}</Pill>
            </div>
            <div className="t2">Finding · {f.raisedByAgentName} · {f.impactEstimate}</div>
          </div>
          <div className="acts" style={{ alignItems: 'center' }}>
            <Pill tone={slaTone(f.slaHoursRemaining)}>{f.slaHoursRemaining}h</Pill>
            <Link className="btn primary sm" to={`/operate/findings/${f.id}`}>Disposition</Link>
          </div>
        </div>
      ))}

      {decisions.map((d) => (
        <div className="dec-item" key={d.id}>
          <div className="dec-ico" style={{ background: d.iconBg }}>{d.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div className="t1">{d.title}</div>
            <div className="t2">Approval · {d.subtitle}</div>
          </div>
          <div className="acts">
            <button
              className="btn primary sm"
              disabled={approve.isPending}
              onClick={() =>
                approve.mutate(d.id, {
                  onSuccess: () => showToast(`${d.title.split(' · ')[0]} — ${actionLabelDefaults[d.actionVerb]?.toLowerCase()}d`),
                })
              }
            >
              {d.actionLabel || actionLabelDefaults[d.actionVerb]}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
