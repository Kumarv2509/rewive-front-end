import { Link, useParams } from 'react-router-dom';
import { useClosureKpis, useFinding, useKpiBrain } from '../../api/shadowOrg';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { LoopStrip, type LoopStage } from '../../components/shared/LoopStrip';
import { ImpactPath } from './ImpactPath';
import { ActionsBlock } from './ActionsBlock';
import { DispositionBar } from './DispositionBar';
import { LeadershipBar } from './LeadershipBar';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { personaLabel, roleSubtree } from '../CommandCenter/personas';
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
// Detected → Decided → Watching → Closed. Every list links here; this page is
// where the loop is *seen* rather than explained, so the LoopStrip on top and
// the step titles use the same five words as everywhere else.
export function FindingDetailScreen() {
  const { findingId } = useParams();
  const { data: finding, isLoading, isError } = useFinding(findingId);
  const { data: brain } = useKpiBrain();
  const { data: closures } = useClosureKpis();
  const { persona: lensRole } = useEffectiveLens();

  if (isLoading) return <section className="screen"><Loading /></section>;
  if (isError || !finding) {
    return <section className="screen"><ErrorMessage message="This finding does not exist (it may belong to another industry template)." /></section>;
  }

  const stream = brain?.streams.find((s) => s.key === finding.streamKey);
  const closure = finding.closureKpiId ? closures?.find((c) => c.id === finding.closureKpiId) : undefined;

  // The agent connects the drift back to a signal: when the impact path leads
  // with one (kind 'driver'), surface it as the suspected cause. The fuller
  // "why" comes from the upstream-signal evidence row the sweep writes.
  const causeStep = finding.impactPath[0]?.kind === 'driver' ? finding.impactPath[0] : null;
  const causeWhy = finding.evidence.find((e) => e.label.toLowerCase().startsWith('upstream signal'))?.value;

  const isOpen = finding.status === 'open';
  // Whose call is this from where the viewer is standing? The owner gets the
  // four A's; a role above the owner gets leadership actions instead.
  const isOwner = lensRole !== 'all' && finding.persona === lensRole;
  const leadsOwner =
    lensRole !== 'all' && !isOwner && roleSubtree(lensRole).includes(finding.persona);
  const isAbandoned = finding.status === 'abandoned';
  const isClosed = !!finding.assessorVerdict || isAbandoned || closure?.status === 'closed';
  const watchState: StepState = isOpen ? 'todo' : isAbandoned ? 'done' : closure?.status === 'closed' ? 'done' : 'now';
  const closedState: StepState = isClosed ? 'done' : 'todo';
  const loopStage: LoopStage = isOpen ? 'Decide' : isClosed ? 'Close' : 'Act';

  return (
    <section className="screen" style={{ maxWidth: 940 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <Link to="/operate/findings" className="btn ghost sm" style={{ display: 'inline-flex' }}>&larr; Findings</Link>
        <LoopStrip stage={loopStage} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <Pill tone={severityTone[finding.severity]}>{finding.severity}</Pill>
        <h1 className="page" style={{ marginBottom: 0 }}>{finding.title}</h1>
      </div>
      <div className="sub" style={{ marginBottom: 20 }}>
        {finding.entity && <>{finding.entity}{finding.region ? ` (${finding.region})` : ''} · </>}
        {finding.impactEstimate}
        {finding.escalationLevel > 0 && <> · <span style={{ color: 'var(--red)' }}>escalated ×{finding.escalationLevel}</span></>}
        {finding.awaitingResponseTo && <> · status asked by {personaLabel(finding.awaitingResponseTo)}</>}
        {finding.dottedPersona && <> · visible to {personaLabel(finding.dottedPersona)}</>}
        {isOpen
          ? <> {' '}<Pill tone={slaTone(finding.slaHoursRemaining)}>{finding.slaHoursRemaining}h left</Pill></>
          : <> {' '}<Pill tone={statusTone[finding.status]}>{statusLabel[finding.status]}</Pill></>}
      </div>

      <div className="card" style={{ padding: '22px 24px' }}>
        <div className="thread">
          {/* 1 — DETECTED */}
          <ThreadStep n={1} state="done" title={`Detected · ${finding.raisedByAgentName}`} when={new Date(finding.detectedAt).toLocaleString()}>
            {finding.origin === 'sweep' && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 8 }}>
                Raised by the live sweep · {finding.rule?.replace(/_/g, ' ') ?? 'drift rule'} on real data
              </div>
            )}
            <div style={{ fontSize: 13, marginBottom: 12 }}>{finding.summary}</div>
            {causeStep && (
              <div style={{ marginBottom: 14, padding: '11px 14px', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--radius)', background: 'var(--accent-soft)' }}>
                <div style={{ fontWeight: 600, fontSize: 10.5, color: 'var(--accent-deep)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                  Suspected cause · what the agent looked at first
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{causeStep.nodeName}</div>
                {causeWhy && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>{causeWhy}</div>}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink-2)' }}>
                Impact path{stream ? <> · {stream.name}</> : null} — how this reaches an intent
              </div>
              <Link className="btn ghost sm" to={`/build/picture?focus=${finding.linkedKpiNodeId}`}>View in the Operating Picture →</Link>
            </div>
            <ImpactPath steps={finding.impactPath} />
            <div style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>Evidence</div>
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
              {finding.escalatedFrom && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 10 }}>
                  ↑ This became {personaLabel(finding.persona)}'s call because {personaLabel(finding.escalatedFrom)} let
                  the clock run out
                  {finding.escalationTrail && finding.escalationTrail.length > 1
                    ? ` (${finding.escalationTrail.length} levels so far)`
                    : ''}
                  .
                </div>
              )}
              {leadsOwner ? (
                <LeadershipBar finding={finding} lensRole={lensRole} />
              ) : (
                <DispositionBar finding={finding} />
              )}
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

          {/* Pressure from above — kept on the spine so the thread records who
              leaned on this finding, not just who decided it. */}
          {finding.leadershipLog && finding.leadershipLog.length > 0 && (
            <div style={{ margin: '0 0 14px 34px', borderLeft: '2px solid var(--border-strong)', paddingLeft: 14 }}>
              <div className="eyebrow" style={{ padding: '0 0 6px' }}>From above</div>
              {finding.leadershipLog.map((e, i) => (
                <div key={i} style={{ fontSize: 12.5, color: 'var(--ink-2)', padding: '3px 0' }}>
                  {e.summary}
                  <span style={{ color: 'var(--ink-3)' }}> · {new Date(e.at).toLocaleString()}</span>
                  {e.note && <div style={{ color: 'var(--ink-3)', fontSize: 12 }}>“{e.note}”</div>}
                </div>
              ))}
            </div>
          )}

          {/* The tracker: the fix in motion between Decide and Close. A child
              of the finding — completing every action never closes it. */}
          <ActionsBlock findingId={finding.id} findingOpen={isOpen} dismissed={isAbandoned} />

          {/* 3 — WATCHING */}
          <ThreadStep
            n={3}
            state={watchState}
            title={
              isAbandoned ? 'Watching — not needed, dismissed with a reason'
                : closure ? `Watching — recovery target, held by ${closure.watchedByAgentName}`
                  : finding.status === 'acting' ? 'Acting — fix in motion'
                    : finding.status === 'acknowledged' ? 'Watching — parked, will re-alert'
                      : 'Watching — set by your decision'
          }
          >
            {closure && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
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
                Accept sets a recovery target here; Park sets a re-alert rule; Act opens a fix.
              </div>
            )}
          </ThreadStep>

          {/* 4 — CLOSED + VERDICT */}
          <ThreadStep
            n={4}
            state={closedState}
            title={finding.assessorVerdict ? `Closed — verdict: ${finding.assessorVerdict.verdict.replace('_', ' ')}` : isAbandoned ? 'Closed — dismissed, agent tuned' : 'Close + verdict'}
            when={finding.assessorVerdict ? new Date(finding.assessorVerdict.at).toLocaleString() : undefined}
          >
            {finding.assessorVerdict ? (
              <div style={{ border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)', borderRadius: 'var(--radius)', padding: '10px 14px', background: 'var(--green-soft)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                {finding.assessorVerdict.note}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
                {isAbandoned
                  ? 'The dismissal reason was fed back to the agent so it learns what not to raise.'
                  : 'Nothing is "done" until the number is back — when the recovery target holds, the finding retires itself and the assessor agent returns a verdict: worked, didn\'t, or too early.'}
              </div>
            )}
          </ThreadStep>
        </div>
      </div>
    </section>
  );
}
