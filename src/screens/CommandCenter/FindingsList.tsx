import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useFindings } from '../../api/shadowOrg';
import { severityTone, slaTone } from '../Findings/meta';
import type { Persona } from '../../api/types';

// The disposition inbox: open findings addressed to this persona, most urgent first.
export function FindingsList({ persona }: { persona: Persona | 'all' }) {
  const { data, isLoading, isError } = useFindings({ persona, status: 'open' });

  return (
    <div className="card" style={{ marginBottom: 16 }} data-tour="cc-findings">
      <div className="sec-head">
        <h3>Findings waiting on your disposition</h3>
        <Link className="all" to="/operate/findings">All findings →</Link>
      </div>
      {isLoading && <Loading />}
      {isError && <ErrorMessage />}
      {data?.length === 0 && <div className="state-msg">Nothing waiting on you — your counterparts have no open findings for this lens.</div>}
      {data?.slice(0, 3).map((f) => (
        <div className="dec-item" key={f.id}>
          <div className="dec-ico" style={{ background: 'var(--accent-soft)' }}>🕵️</div>
          <div style={{ minWidth: 0 }}>
            <div className="t1">
              <Link to={`/operate/findings/${f.id}`}>{f.title}</Link>{' '}
              <Pill tone={severityTone[f.severity]}>{f.severity}</Pill>
            </div>
            <div className="t2">{f.raisedByAgentName} · {f.impactEstimate}</div>
          </div>
          <div className="acts" style={{ alignItems: 'center' }}>
            <Pill tone={slaTone(f.slaHoursRemaining)}>{f.slaHoursRemaining}h</Pill>
            <Link className="btn primary sm" to={`/operate/findings/${f.id}`}>Disposition</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
