import { useState } from 'react';
import { Avatar } from '../../components/shared/Avatar';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useSuggestedSignals, useReviewCommittee, useApproveSignal, useRejectSignal } from '../../api/signalStudio';
import { useToast } from '../../components/shared/Toast';

export function ReviewQueue() {
  const { data, isLoading, isError } = useSuggestedSignals();
  const { data: committee } = useReviewCommittee();
  const approve = useApproveSignal();
  const reject = useRejectSignal();
  const { showToast } = useToast();
  const [approverByRow, setApproverByRow] = useState<Record<string, string>>({});

  if (isLoading) return <Loading />;
  if (isError) return <ErrorMessage />;

  const pending = data?.filter((s) => s.approvalStatus === 'pending_review') ?? [];

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="t">
        <thead>
          <tr><th>Signal</th><th>Approver</th><th></th></tr>
        </thead>
        <tbody>
          {pending.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--ink-3)' }}>Nothing waiting on committee review.</td></tr>}
          {pending.map((s) => (
            <tr className="row-h" key={s.id}>
              <td><b>{s.name}</b><div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{s.description}</div></td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  {committee?.map((m) => (
                    <span
                      key={m.userId}
                      title={`${m.name} — ${m.title}`}
                      onClick={() => setApproverByRow((p) => ({ ...p, [s.id]: m.userId }))}
                      style={{ cursor: 'pointer', opacity: approverByRow[s.id] === m.userId ? 1 : 0.4 }}
                    >
                      <Avatar initials={m.initials} background={m.avatarBg} size={24} fontSize={10} />
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <button
                  className="btn primary sm"
                  disabled={!approverByRow[s.id] || approve.isPending}
                  onClick={() => approve.mutate({ id: s.id, approverUserId: approverByRow[s.id] }, { onSuccess: () => showToast(`${s.name} approved — KPI ticket created`) })}
                >
                  Approve
                </button>
                <button
                  className="btn ghost sm"
                  style={{ marginLeft: 6 }}
                  disabled={reject.isPending}
                  onClick={() => reject.mutate(s.id, { onSuccess: () => showToast(`${s.name} rejected`) })}
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
