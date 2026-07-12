import { Pill } from '../../components/shared/Pill';
import { useRunExceptions, useResolveException } from '../../api/runs';
import { useToast } from '../../components/shared/Toast';
import type { ExceptionSeverity } from '../../api/types';

const severityTone: Record<ExceptionSeverity, 'red' | 'amber' | 'gray'> = {
  error: 'red',
  warning: 'amber',
  info: 'gray',
};

export function ExceptionLog() {
  const { data: exceptions } = useRunExceptions();
  const resolve = useResolveException();
  const { showToast } = useToast();

  const open = exceptions?.filter((e) => e.status === 'open') ?? [];
  const resolved = exceptions?.filter((e) => e.status === 'resolved') ?? [];

  return (
    <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Exception log</div>
      {exceptions?.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No exceptions.</div>}
      {[...open, ...resolved].map((e) => (
        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid var(--border)' }}>
          <Pill tone={severityTone[e.severity]}>{e.severity}</Pill>
          <div style={{ flex: 1, fontSize: 12.5 }}>
            <b>{e.runName}</b>
            <div style={{ color: 'var(--ink-2)' }}>{e.message}</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.createdAt}</span>
          {e.status === 'open' ? (
            <button className="btn primary sm" disabled={resolve.isPending} onClick={() => resolve.mutate(e.id, { onSuccess: () => showToast('Exception resolved') })}>
              Resolve
            </button>
          ) : (
            <Pill tone="green">resolved</Pill>
          )}
        </div>
      ))}
    </div>
  );
}
