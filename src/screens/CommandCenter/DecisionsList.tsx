import { Link } from 'react-router-dom';
import { useApproveDecision } from '../../api/decisions';
import { useToast } from '../../components/shared/Toast';
import type { AgentActionItem, DashboardResponse } from '../../api/types';

const actionTypeMeta: Record<AgentActionItem['action_type'], { icon: string; iconBg: string; verb: string; toastLabel: string }> = {
  inquiry: { icon: '❓', iconBg: 'var(--amber-soft)', verb: 'Reply', toastLabel: 'replied' },
  transaction: { icon: '💰', iconBg: 'var(--teal-soft)', verb: 'Approve', toastLabel: 'approved' },
  request: { icon: '📋', iconBg: 'var(--accent-soft)', verb: 'Review', toastLabel: 'reviewed' },
};

function truncate(str: string | null, max: number) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function DecisionsList({ dashboard }: { dashboard?: DashboardResponse }) {
  const data = dashboard?.analytics_agent_approvals?.rows;
  const approve = useApproveDecision();
  const { showToast } = useToast();

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="sec-head">
        <h3>Needs your decision</h3>
        <Link className="all" to="/operate/decisions">Open ledger →</Link>
      </div>
      <div className="dec-scroll">
      {(!data || data.length === 0) && <div className="state-msg">All caught up — nothing pending.</div>}
      {data?.map((d) => {
        const meta = actionTypeMeta[d.action_type];
        return (
          <div className="dec-item" key={d.id}>
            <div className="dec-ico" style={{ background: meta.iconBg }}>{meta.icon}</div>
            <div>
              <div className="t1">{d.action_title || `${d.action_type} action`}</div>
              <div className="t2">{truncate(d.action_summary, 120)}</div>
            </div>
            <div className="acts">
              <button className="btn ghost sm">Review</button>
              <button
                className="btn primary sm"
                disabled={approve.isPending}
                onClick={() =>
                  approve.mutate(d.id, {
                    onSuccess: () => showToast(`${d.action_title || 'Action'} — ${meta.toastLabel}`),
                  })
                }
              >
                {meta.verb}
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
