import { Link, useParams } from 'react-router-dom';
import { useClosureKpis, useFinding, useKpiBrain } from '../../api/shadowOrg';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { ImpactPath } from './ImpactPath';
import { DispositionBar } from './DispositionBar';
import { severityTone, slaTone, statusLabel, statusTone } from './meta';

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

  return (
    <section className="screen">
      <Link to="/insights/findings" className="btn ghost sm" style={{ marginBottom: 14, display: 'inline-flex' }}>&larr; Findings</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <Pill tone={severityTone[finding.severity]}>{finding.severity}</Pill>
        <h1 className="page" style={{ marginBottom: 0 }}>{finding.title}</h1>
      </div>
      <div className="sub" style={{ marginBottom: 14 }}>
        Raised by <b style={{ color: 'var(--ink)' }}>{finding.raisedByAgentName}</b>
        {stream ? <> · {stream.name} stream</> : null} · detected {new Date(finding.detectedAt).toLocaleString()}
        {finding.escalationLevel > 0 && (
          <>
            {' '}<Pill tone="red">escalated ×{finding.escalationLevel}</Pill>
          </>
        )}
        {finding.status === 'open' && (
          <>
            {' '}<Pill tone={slaTone(finding.slaHoursRemaining)}>{finding.slaHoursRemaining}h left on SLA</Pill>
          </>
        )}
        {finding.status !== 'open' && (
          <>
            {' '}<Pill tone={statusTone[finding.status]}>{statusLabel[finding.status]}</Pill>
          </>
        )}
      </div>

      {finding.status === 'open' && <DispositionBar finding={finding} />}

      {finding.status !== 'open' && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 6 }}>Disposition</div>
          <div style={{ fontSize: 13 }}>
            <b style={{ textTransform: 'capitalize' }}>{finding.disposition}</b> by {finding.dispositionBy}
            {finding.dispositionAt ? <> on {new Date(finding.dispositionAt).toLocaleString()}</> : null}
          </div>
          {finding.dispositionReason && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>Reason fed back to the agent: {finding.dispositionReason}</div>
          )}
          {finding.reAlertCondition && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>⏰ {finding.reAlertCondition}</div>
          )}
          {finding.solutionDesignId && (
            <div style={{ marginTop: 10 }}>
              <Link className="btn primary sm" to={`/build/solutions/${finding.solutionDesignId}`}>Open the solution design →</Link>
            </div>
          )}
          {finding.assessorVerdict && (
            <div style={{ marginTop: 10, border: '1px solid var(--border-green, rgba(74,222,128,.3))', borderRadius: 10, padding: '10px 14px', background: 'var(--green-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Pill tone="green">assessor · {finding.assessorVerdict.verdict.replace('_', ' ')}</Pill>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{new Date(finding.assessorVerdict.at).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{finding.assessorVerdict.note}</div>
            </div>
          )}
          {closure && (
            <div style={{ marginTop: 10, border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>Exit condition · watched by {closure.watchedByAgentName}</div>
                <Pill tone={closure.status === 'closed' ? 'green' : closure.status === 'regressed' ? 'red' : 'teal'}>{closure.status}</Pill>
              </div>
              <div style={{ fontSize: 12.5, marginBottom: 8 }}>{closure.name}</div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${closure.progressPct}%`, background: 'var(--teal)', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
                baseline {closure.baseline} · now {closure.current} · target {closure.target} · {closure.progressPct}% there
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 8 }}>What the agent found</div>
        <div style={{ fontSize: 13, marginBottom: 12 }}>{finding.summary}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink-2)' }}>Impact path — how this reaches an intent</div>
          <Link className="btn ghost sm" to={`/build/picture?focus=${finding.linkedKpiNodeId}`}>View in the Operating Picture →</Link>
        </div>
        <ImpactPath steps={finding.impactPath} />
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{finding.impactEstimate}</div>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 4 }}>Evidence</div>
        {finding.evidence.map((e, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{e.label}</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{e.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
