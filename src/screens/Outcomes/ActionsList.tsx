import { useAssignAction, useScheduleAction } from '../../api/outcomes';
import { useToast } from '../../components/shared/Toast';
import type { RecommendedAction } from '../../api/types';

export function ActionsList({ runId, actions }: { runId: string; actions: RecommendedAction[] }) {
  const assign = useAssignAction(runId);
  const schedule = useScheduleAction(runId);
  const { showToast } = useToast();

  return (
    <div className="card">
      <div className="sec-head">
        <h3>Recommended actions</h3>
        <span className="all">{actions.length} of {actions.length}</span>
      </div>
      {actions.map((a) => (
        <div className="act-row" key={a.id}>
          <div>
            <div className="t1">{a.title}</div>
            <div className="t2">{a.subtitle}</div>
          </div>
          {a.assigned ? (
            <span className="pill green" style={{ marginLeft: 'auto' }}>✓ Assigned</span>
          ) : a.actionType === 'assign' ? (
            <button
              className="btn primary sm"
              style={{ marginLeft: 'auto' }}
              disabled={assign.isPending}
              onClick={() =>
                assign.mutate(a.id, { onSuccess: () => showToast(`Action assigned${a.assignedTo ? ` to ${a.assignedTo}` : ''} — tracked in ledger`) })
              }
            >
              Assign
            </button>
          ) : a.scheduled ? (
            <span className="pill green" style={{ marginLeft: 'auto' }}>✓ Scheduled</span>
          ) : (
            <button
              className="btn ghost sm"
              style={{ marginLeft: 'auto' }}
              disabled={schedule.isPending}
              onClick={() =>
                schedule.mutate(a.id, { onSuccess: () => showToast('Scheduled — tracked in ledger') })
              }
            >
              Schedule
            </button>
          )}
        </div>
      ))}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Assigned actions appear in Runs &amp; Actions with owners and deadlines. When their KPIs move, the Decision Ledger records whether they worked. The loop closes itself.
        </div>
      </div>
    </div>
  );
}
