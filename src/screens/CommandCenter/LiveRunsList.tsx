import { Link } from 'react-router-dom';
import { useLiveRuns } from '../../api/dashboard';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';

export function LiveRunsList() {
  const { persona, scope } = useEffectiveLens();
  const { data, isLoading, isError } = useLiveRuns(persona, scope);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="sec-head">
        <h3>Live runs</h3>
        <Link className="all" to="/operate/runs">All runs →</Link>
      </div>
      {isLoading && <Loading />}
      {isError && <ErrorMessage />}
      {data?.length === 0 && <div className="state-msg">No runs in progress.</div>}
      {data?.map((r) => (
        <div className="run-item" key={r.id}>
          <div className="r1">
            <span className="nm">{r.name}</span>
            <span className="eta">{r.eta}</span>
          </div>
          <div className="bar">
            <span style={{ width: `${r.percent}%`, background: r.barColor }}></span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 6 }}>{r.stepDescription}</div>
        </div>
      ))}
    </div>
  );
}
