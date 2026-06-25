import { Link } from 'react-router-dom';
import { usePendingDecisions } from '../../api/dashboard';
import { useApproveDecision } from '../../api/decisions';
import { useToast } from '../../components/shared/Toast';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import type { PendingDecision } from '../../api/types';

const actionLabelDefaults: Record<PendingDecision['actionVerb'], string> = {
  approve: 'Approve',
  act: 'Act',
  clear: 'Clear',
  release: 'Release',
};

export function DecisionsList() {
  const { data, isLoading, isError } = usePendingDecisions();
  const approve = useApproveDecision();
  const { showToast } = useToast();

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="sec-head">
        <h3>Needs your decision</h3>
        <Link className="all" to="/operate/decisions">Open ledger →</Link>
      </div>
      {isLoading && <Loading />}
      {isError && <ErrorMessage />}
      {data?.length === 0 && <div className="state-msg">All caught up — nothing pending.</div>}
      {data?.map((d) => (
        <div className="dec-item" key={d.id}>
          <div className="dec-ico" style={{ background: d.iconBg }}>{d.icon}</div>
          <div>
            <div className="t1">{d.title}</div>
            <div className="t2">{d.subtitle}</div>
          </div>
          <div className="acts">
            <button className="btn ghost sm">Review</button>
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
