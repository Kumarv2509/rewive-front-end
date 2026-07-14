import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFindings, useKpiBrain } from '../../api/shadowOrg';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { severityTone, slaTone, statusLabel, statusTone } from './meta';
import type { Finding } from '../../api/types';

const STATUS_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Awaiting disposition' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'acting', label: 'Acting' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'abandoned', label: 'Abandoned' },
] as const;

type StatusFilter = (typeof STATUS_CHIPS)[number]['key'];

function FindingRow({ finding, streamName }: { finding: Finding; streamName?: string }) {
  return (
    <div className="dec-item">
      <div className="dec-ico" style={{ background: 'var(--accent-soft)' }}>🕵️</div>
      <div style={{ minWidth: 0 }}>
        <div className="t1">
          <Link to={`/operate/findings/${finding.id}`}>{finding.title}</Link>{' '}
          <Pill tone={severityTone[finding.severity]}>{finding.severity}</Pill>
          {finding.escalationLevel > 0 && <> <Pill tone="red">escalated</Pill></>}
        </div>
        <div className="t2">
          {finding.raisedByAgentName}
          {streamName ? <> · {streamName}</> : null} · {finding.impactEstimate}
        </div>
      </div>
      <div className="acts" style={{ alignItems: 'center' }}>
        {finding.status === 'open' ? (
          <>
            <Pill tone={slaTone(finding.slaHoursRemaining)}>{finding.slaHoursRemaining}h SLA</Pill>
            <Link className="btn primary sm" to={`/operate/findings/${finding.id}`}>Disposition</Link>
          </>
        ) : (
          <Pill tone={statusTone[finding.status]}>{statusLabel[finding.status]}</Pill>
        )}
      </div>
    </div>
  );
}

export function FindingsScreen() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [stream, setStream] = useState<string>('all');
  const { data: findings, isLoading, isError } = useFindings({ status: status === 'all' ? 'all' : status, stream });
  const { data: brain } = useKpiBrain();

  const streamName = (key: string) => brain?.streams.find((s) => s.key === key)?.name;
  const open = findings?.filter((f) => f.status === 'open') ?? [];
  const rest = findings?.filter((f) => f.status !== 'open') ?? [];

  return (
    <section className="screen" style={{ maxWidth: 1280 }}>
      <h1 className="page">Findings</h1>
      <div className="sub">
        Raised by your counterparts, ranked by impact on intents. Every finding demands one of four dispositions —
        accept, act, acknowledge, or abandon — and unanswered findings escalate on their SLA.
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.key}
            className={`btn sm ${status === chip.key ? 'primary' : 'ghost'}`}
            onClick={() => setStatus(chip.key)}
          >
            {chip.label}
          </button>
        ))}
        <select
          value={stream}
          onChange={(e) => setStream(e.target.value)}
          style={{ marginLeft: 'auto', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, fontFamily: 'inherit' }}
        >
          <option value="all">All streams</option>
          {brain?.streams.map((s) => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>
      </div>

      {isLoading && <Loading />}
      {isError && <ErrorMessage />}

      {findings && open.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }} data-tour="findings-open">
          <div className="sec-head">
            <h3>Waiting on a disposition</h3>
            <Pill tone="red">{open.length}</Pill>
          </div>
          {open.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
        </div>
      )}

      {findings && rest.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="sec-head"><h3>Dispositioned</h3></div>
          {rest.map((f) => <FindingRow key={f.id} finding={f} streamName={streamName(f.streamKey)} />)}
        </div>
      )}

      {findings && findings.length === 0 && (
        <div className="card"><div className="state-msg">No findings match this filter — the counterparts are quiet here.</div></div>
      )}
    </section>
  );
}
