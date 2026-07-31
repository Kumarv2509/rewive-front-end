import { useState } from 'react';
import { Pill } from '../../components/shared/Pill';
import { useToast } from '../../components/shared/Toast';
import { useAddFindingAction, useFindingActions, useUpdateFindingAction } from '../../api/shadowOrg';
import type { FindingActionStatus } from '../../api/types';

const STATUS_LABEL: Record<FindingActionStatus, string> = {
  open: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

const STATUS_TONE: Record<FindingActionStatus, 'indigo' | 'teal' | 'red' | 'green'> = {
  open: 'indigo',
  in_progress: 'teal',
  blocked: 'red',
  done: 'green',
};

const STATUSES: FindingActionStatus[] = ['open', 'in_progress', 'blocked', 'done'];

// The tracker on a finding's thread: the fix in motion between Decide and
// Close. Deliberately a child of the finding, not a ticket system — completing
// every action never closes the finding; the recovery target does.
export function ActionsBlock({ findingId, findingOpen, dismissed }: {
  findingId: string;
  findingOpen: boolean;
  dismissed: boolean;
}) {
  const { data: actions } = useFindingActions(findingId);
  const addAction = useAddFindingAction(findingId);
  const updateAction = useUpdateFindingAction(findingId);
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  // Captured once on mount: the react-compiler rule bars impure calls in
  // render, and "overdue" does not need to tick live.
  const [now] = useState(() => Date.now());
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [dueAt, setDueAt] = useState('');

  const rows = actions ?? [];
  // Before a decision there is nothing to track yet; after a dismissal there
  // is nothing left to do. Show the block only when it has a story to tell.
  if (rows.length === 0 && (findingOpen || dismissed)) return null;

  const doneCount = rows.filter((a) => a.status === 'done').length;
  const canEdit = !dismissed;

  const submit = () => {
    if (!title.trim()) return;
    addAction.mutate(
      { title: title.trim(), owner: owner.trim() || 'Unassigned', dueAt: dueAt ? new Date(dueAt).toISOString() : null },
      {
        onSuccess: () => {
          setTitle(''); setOwner(''); setDueAt(''); setAdding(false);
          showToast('Action added to this finding');
        },
      },
    );
  };

  return (
    <div style={{ margin: '0 0 14px 34px', borderLeft: '2px solid var(--border-strong)', paddingLeft: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 0 6px' }}>
        <span className="eyebrow">Actions — the fix in motion</span>
        {rows.length > 0 && (
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{doneCount} of {rows.length} done</span>
        )}
      </div>

      {rows.map((a) => {
        const overdue = a.dueAt && a.status !== 'done' && new Date(a.dueAt).getTime() < now;
        return (
          <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderTop: '1px solid var(--border)' }}>
            {canEdit ? (
              <select
                value={a.status}
                onChange={(e) => updateAction.mutate({ actionId: a.id, status: e.target.value as FindingActionStatus })}
                style={{ fontSize: 11, padding: '3px 4px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--ink-2)', flexShrink: 0 }}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            ) : (
              <Pill tone={STATUS_TONE[a.status]} style={{ flexShrink: 0 }}>{STATUS_LABEL[a.status]}</Pill>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, textDecoration: a.status === 'done' ? 'line-through' : 'none', color: a.status === 'done' ? 'var(--ink-3)' : 'var(--ink)' }}>
                {a.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
                {a.owner}
                {a.source === 'worker' && <> · <span style={{ color: 'var(--accent-deep)' }}>proposed by a worker</span></>}
                {a.dueAt && (
                  <> · due <span style={{ color: overdue ? 'var(--red)' : 'var(--ink-3)', fontWeight: overdue ? 600 : 400 }}>
                    {new Date(a.dueAt).toLocaleDateString()}{overdue ? ' — overdue' : ''}
                  </span></>
                )}
              </div>
              {a.note && <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 2 }}>“{a.note}”</div>}
            </div>
          </div>
        );
      })}

      {canEdit && (adding ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '8px 0', borderTop: rows.length ? '1px solid var(--border)' : 'none' }}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="What needs to happen?"
            style={{ flex: '2 1 220px', fontSize: 12.5, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          />
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Owner"
            style={{ flex: '1 1 120px', fontSize: 12.5, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
          />
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            style={{ flex: '0 1 140px', fontSize: 12.5, padding: '5px 9px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--ink-2)' }}
          />
          <button className="btn primary sm" onClick={submit} disabled={!title.trim() || addAction.isPending}>Add</button>
          <button className="btn ghost sm" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <div style={{ padding: '6px 0', borderTop: rows.length ? '1px solid var(--border)' : 'none' }}>
          <button className="btn ghost sm" onClick={() => setAdding(true)}>+ Add an action</button>
        </div>
      ))}

      {rows.length > 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)', paddingTop: 6 }}>
          Done here ≠ closed — the finding closes when the number is back.
        </div>
      )}
    </div>
  );
}
