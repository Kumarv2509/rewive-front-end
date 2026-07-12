import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { useCreateQuickSolution, useQuickSolution, useConfirmQuickSolution } from '../../api/solutionDesign';
import { useToast } from '../../components/shared/Toast';

export function QuickSolutionPanel({ signalId }: { signalId: string }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [quickId, setQuickId] = useState<string | null>(null);
  const { showToast } = useToast();
  const createQuick = useCreateQuickSolution();
  const { data: quick } = useQuickSolution(quickId ?? undefined);
  const confirm = useConfirmQuickSolution(quickId ?? '');

  if (!open) {
    return <button className="btn" onClick={() => setOpen(true)}>I already have a solution</button>;
  }

  if (!quick) {
    return (
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Describe the fix</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's the fix, in plain language?"
          style={{ width: '100%', minHeight: 70, border: '1px solid var(--border-strong)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 13, resize: 'vertical', marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn primary sm"
            disabled={!description || createQuick.isPending}
            onClick={() => createQuick.mutate({ signalId, description }, { onSuccess: (q) => setQuickId(q.id) })}
          >
            Break into tasks
          </button>
          <button className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, flex: 1 }}>Solution in hand</div>
        <Pill tone={quick.status === 'confirmed' ? 'green' : 'amber'}>{quick.status.replace('_', ' ')}</Pill>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 10 }}>{quick.description}</div>
      {quick.tasks.map((t) => (
        <div key={t.id} style={{ fontSize: 12.5, padding: '6px 0', borderTop: '1px solid var(--border)' }}>{t.title} <span style={{ color: 'var(--ink-3)' }}>· {t.owner}</span></div>
      ))}
      {quick.status === 'pending_confirmation' && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 8 }}>Nothing is assigned or sent until you confirm this matches your intent.</div>
          <button className="btn primary sm" disabled={confirm.isPending} onClick={() => confirm.mutate(undefined, { onSuccess: () => showToast('Confirmed — tasks assigned and notified') })}>
            Confirm and assign
          </button>
        </div>
      )}
      {quick.status === 'confirmed' && (
        <div style={{ marginTop: 10, fontSize: 12.5 }}>
          <Link to="/operate/tasks">View in Tasks &rarr;</Link>
        </div>
      )}
    </div>
  );
}
