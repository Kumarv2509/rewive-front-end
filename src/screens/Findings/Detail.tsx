import { Link, useParams } from 'react-router-dom';
import { useClosureKpis, useFinding, useKpiBrain } from '../../api/shadowOrg';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { ImpactPath } from './ImpactPath';
import { DispositionBar } from './DispositionBar';
import { personaLabel } from '../CommandCenter/personas';
import { severityTone, slaTone, statusLabel, statusTone } from './meta';
import type { ReactNode } from 'react';

type StepState = 'done' | 'now' | 'todo';

function ThreadStep({ n, state, title, when, children }: {
  n: number;
  state: StepState;
  title: string;
  when?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`th-step ${state}`}>
      <div className="th-dot">{state === 'done' ? '✓' : n}</div>
      <div style={{ minWidth: 0 }}>
        <div className="th-head">
          <span className="th-title">{title}</span>
          {when && <span className="th-when">{when}</span>}
        </div>
        {children && <div className="th-body">{children}</div>}
      </div>
    </div>
  );
}

// The thread: one finding's whole journey on a single spine —
// raised → decided → watching → closed + verdict. Every list links here;
// this page is where the loop is *seen* rather than explained.
export function FindingDetailScreen() {
  const { findingId } = useParams();
  const { data: finding, isLoading, isError } = useFinding(findingId);
  const { data: brain } = useKpiBrain();
  const { data: closures } = useClosureKpis();

  if (isLoading) return <section className="screen"><Loading /></section>;
  if (isError || !finding) {
    return <section className="screen"><ErrorMessage message="This finding does not exist (it may belong to another industry template)." /></section>;
  }

  const stream = brain?.streams.find((s) => s.key === finding.streamKey);
  const closure = finding.closureKpiId ? closures?.find((c) => c.id === finding.closureKpiId) : undefined;

  const isOpen = finding.status === 'open';
  const isAbandoned = finding.status === 'abandoned';
  const watchState: StepState = isOpen ? 'todo' : isAbandoned ? 'done' : closure?.status === 'closed' ? 'done' : 'now';
  const closedState: StepState = finding.assessorVerdict || isAbandoned || closure?.status === 'closed' ? 'done' : 'todo';

  return (
    <section className="screen" style={{ maxWidth: 940 }}>
      <Link to="/operate/findings" className="btn ghost sm" style={{ marginBottom: 14, display: 'inline-flex' }}>&larr; Findings</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <Pill tone={severityTone[finding.severity]}>{finding.severity}</Pill>
        <h1 className="page" style={{ marginBottom: 0 }}>{finding.title}</h1>
      </div>
      <div className="sub" style={{ marginBottom: 20 }}>
        {finding.entity && <>{finding.entity}{finding.region ? ` (${finding.region})` : ''} · </>}
        {finding.impactEstimate}
        {finding.escalationLevel > 0 && <> {' '}<Pill tone="red">escalated ×{finding.escalationLevel}</Pill></>}
        {finding.dottedPersona && <> {' '}<Pill tone="amber">⋯ flagged to {personaLabel(finding.dottedPersona)} · functional line</Pill></>}
        {isOpen
          ? <> {' '}<Pill tone={slaTone(finding.slaHoursRemaining)}>{finding.slaHoursRemaining}h left on SLA</Pill></>
          : <> {' '}<Pill tone={statusTone[finding.status]}>{statusLabel[finding.status]}</Pill></>}
      </div>

      <div className="card" style={{ padding: '22px 24px' }}>
        <div className="thread">
          {/* 1 — SENSED & RAISED */}
          <ThreadStep n={1} state="done" title={`Sensed & raised · ${finding.raisedByAgentName}`} when={new Date(finding.detectedAt).toLocaleString()}>
            {finding.origin === 'sweep' && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 8 }}>
                Raised by the live sweep · {finding.rule?.replace(/_/g, ' ') ?? 'drift rule'} on real data
              </div>
            )}
            <div style={{ fontSize: 13, marginBottom: 12 }}>{finding.summary}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink-2)' }}>
                Impact path{stream ? <> · {stream.name}</> : null} — how this reaches an intent
              </div>
              <Link className="btn ghost sm" to={`/build/picture?focus=${finding.linkedKpiNodeId}`}>View in the Operating Picture →</Link>
            </div>
            <ImpactPath steps={finding.impactPath} />
            <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>Evidence</div>
              {finding.evidence.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{e.label}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{e.value}</div>
                </div>
              ))}
            </div>
          </ThreadStep>

          {/* 2 — DECIDED */}
          {isOpen ? (
            <ThreadStep n={2} state="now" title={`Decide — ${personaLabel(finding.persona)}'s call`} when={`${finding.slaHoursRemaining}h before this escalates`}>
              <DispositionBar finding={finding} />
            </ThreadStep>
          ) : (
            <ThreadStep
              n={2}
              state="done"
              title={`Decided — ${finding.disposition ?? ''} by ${finding.dispositionBy ?? '—'}`}
              when={finding.dispositionAt ? new Date(finding.dispositionAt).toLocaleString() : undefined}
            >
              {finding.dispositionReason && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Reason fed back to the agent: {finding.dispositionReason}</div>
              )}
              <div style={{ marginTop: 8 }}>
                <Link to="/operate/decisions" style={{ fontSize: 12, color: 'var(--accent-deep)', textDecoration: 'none' }}>
                  Recorded in the Decision Ledger →
                </Link>
              </div>
            </ThreadStep>
          )}

          {/* 3 — WATCHING */}
          <ThreadStep
            n={3}
            state={watchState}
            title={
              isAbandoned ? 'Watching — not needed, dismissed with a reason'
                : closure ? `Watching — exit condition, held by ${closure.watchedByAgentName}`
                  : finding.status === 'acting' ? 'Acting — solution in motion'
                    : finding.status === 'acknowledged' ? 'Watching — parked on a trip-wire'
                      : 'Watching — set by your disposition'
          }
          >
            {closure && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5 }}>{closure.name}</div>
                  <Pill tone={closure.status === 'closed' ? 'green' : closure.status === 'regressed' ? 'red' : 'teal'}>{closure.status}</Pill>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{ height: '100%', width: `${closure.progressPct}%`, background: 'var(--teal)', borderRadius: 99 }} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
                  baseline {closure.baseline} · now {closure.current} · target {closure.target} · {closure.progressPct}% there
                </div>
              </div>
            )}
            {finding.reAlertCondition && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>⏰ {finding.reAlertCondition}</div>
            )}
            {finding.solutionDesignId && (
              <div style={{ marginTop: closure || finding.reAlertCondition ? 10 : 0 }}>
                <Link className="btn primary sm" to={`/build/solutions/${finding.solutionDesignId}`}>Open the solution design →</Link>
              </div>
            )}
            {isOpen && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                Accept sets a measurable exit condition here; Acknowledge sets a trip-wire; Act opens a solution.
              </div>
            )}
          </ThreadStep>

          {/* 4 — CLOSED + VERDICT */}
          <ThreadStep
            n={4}
            state={closedState}
            title={finding.assessorVerdict ? `Closed — assessor verdict: ${finding.assessorVerdict.verdict.replace('_', ' ')}` : isAbandoned ? 'Closed — dismissed, counterpart tuned' : 'Close + verdict'}
            when={finding.assessorVerdict ? new Date(finding.assessorVerdict.at).toLocaleString() : undefined}
          >
            {finding.assessorVerdict ? (
              <div style={{ border: '1px solid rgba(74,222,128,.3)', borderRadius: 10, padding: '10px 14px', background: 'var(--green-soft)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                {finding.assessorVerdict.note}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                {isAbandoned
                  ? 'The dismissal reason was fed back to the counterpart so it learns what not to raise.'
                  : 'Nothing is "done" until the number is back — when the exit condition holds, the finding retires itself and the assessor returns a verdict: worked, didn\'t, or too early.'}
              </div>
            )}
          </ThreadStep>
        </div>
      </div>
    </section>
  );
}
