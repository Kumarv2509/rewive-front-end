import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useToast } from '../../components/shared/Toast';
import { usePendingDecisions } from '../../api/dashboard';
import { useApproveDecision } from '../../api/decisions';
import { useFindings } from '../../api/shadowOrg';
import { severityTone, slaTone } from '../Findings/meta';
import { personaLabel } from './personas';
import type { Finding, PendingDecision, Persona, RoleScope } from '../../api/types';

const actionLabelDefaults: Record<PendingDecision['actionVerb'], string> = {
  approve: 'Approve',
  act: 'Act',
  clear: 'Clear',
  release: 'Release',
};

// A section per mandate: the finding's impactPath names the mandate it drifted
// from (first stream_kpi step) and, via the DuPont tier, the P&L line it feeds.
interface MandateSection {
  key: string;
  name: string;
  plLine: string | null;
  items: Finding[];
}

function mandateSections(findings: Finding[]): MandateSection[] {
  const byMandate = new Map<string, MandateSection>();
  for (const f of findings) {
    const mandate = f.impactPath.find((s) => s.kind === 'stream_kpi') ?? f.impactPath[0];
    const key = mandate?.nodeId ?? 'general';
    let section = byMandate.get(key);
    if (!section) {
      section = { key, name: mandate?.nodeName ?? 'General', plLine: null, items: [] };
      byMandate.set(key, section);
    }
    section.plLine = section.plLine ?? f.impactPath.find((s) => s.kind === 'pl_line')?.nodeName ?? null;
    section.items.push(f);
  }
  // Most urgent mandate first; rows inside already arrive SLA-sorted.
  return [...byMandate.values()].sort(
    (a, b) =>
      Math.min(...a.items.map((f) => f.slaHoursRemaining)) - Math.min(...b.items.map((f) => f.slaHoursRemaining)),
  );
}

function SectionHead({ label, hint, count }: { label: string; hint?: string | null; count: number }) {
  return (
    <div className="eyebrow" style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '14px 20px 6px' }}>
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      {count > 1 && <span>× {count}</span>}
      {hint && <span style={{ marginLeft: 'auto', fontWeight: 500 }}>→ {hint}</span>}
    </div>
  );
}

// THE queue. Findings waiting on a disposition and decisions waiting on an
// approval, in one ranked list with one count — the only "waiting on you"
// number anywhere in the product. Findings first (they carry an SLA clock),
// sectioned by the mandate that drifted, most urgent mandate on top.
//
// Always role-scoped, even when the lens is widened to "+ their team" — this
// queue means "your call", and a subordinate's finding is not. What the team
// is carrying is rolled up on Findings instead (see OrgRollup).
export function UnifiedQueue({ persona, scope }: { persona: Persona | 'all'; scope?: RoleScope }) {
  const teamScope = scope === 'team' && persona !== 'all';
  const findingsQ = useFindings({ persona, scope: 'role', status: 'open' });
  const decisionsQ = usePendingDecisions(persona, 'role');
  const approve = useApproveDecision();
  const { showToast } = useToast();

  const isLoading = findingsQ.isLoading || decisionsQ.isLoading;
  const isError = findingsQ.isError || decisionsQ.isError;
  const findings = [...(findingsQ.data ?? [])].sort((a, b) => a.slaHoursRemaining - b.slaHoursRemaining);
  const decisions = decisionsQ.data ?? [];
  const total = findings.length + decisions.length;
  const sections = mandateSections(findings);

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
        <div className="state-msg">
          {teamScope
            ? 'Nothing waiting on your disposition. What your organisation is carrying is rolled up on Findings.'
            : 'Nothing waiting on you — your agents are watching, and the queue is clear.'}
        </div>
      )}

      {sections.map((s) => (
        <div key={s.key}>
          <SectionHead label={s.name} hint={s.plLine} count={s.items.length} />
          {s.items.map((f) => (
            <div className="dec-item" key={f.id}>
              <div className="dec-ico" style={{ background: 'var(--accent-soft)' }}>🕵️</div>
              <div style={{ minWidth: 0 }}>
                <div className="t1">
                  <Link to={`/operate/findings/${f.id}`}>{f.title}</Link>{' '}
                  <Pill tone={severityTone[f.severity]}>{f.severity}</Pill>
                  {' '}<Pill tone="gray">→ {personaLabel(f.persona)}</Pill>
                  {f.dottedPersona && <> <Pill tone="amber">⋯ {personaLabel(f.dottedPersona)} · functional line</Pill></>}
                </div>
                <div className="t2">Finding · {f.raisedByAgentName} · {f.impactEstimate}</div>
              </div>
              <div className="acts" style={{ alignItems: 'center' }}>
                <Pill tone={slaTone(f.slaHoursRemaining)}>{f.slaHoursRemaining}h</Pill>
                <Link className="btn primary sm" to={`/operate/findings/${f.id}`}>Disposition</Link>
              </div>
            </div>
          ))}
        </div>
      ))}

      {decisions.length > 0 && <SectionHead label="Approvals" count={decisions.length} />}
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

      {teamScope && (
        <div className="state-msg" style={{ borderTop: '1px solid var(--border)', textAlign: 'left' }}>
          Your team's open work isn't in this queue — it's rolled up by report on{' '}
          <Link className="link" to="/operate/findings">Findings</Link>.
        </div>
      )}
    </div>
  );
}
