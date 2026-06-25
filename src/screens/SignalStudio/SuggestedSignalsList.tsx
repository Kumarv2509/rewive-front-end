import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useSuggestedSignals, useSubmitSignalForReview } from '../../api/signalStudio';
import { useConnections } from '../../api/connectors';
import { useToast } from '../../components/shared/Toast';
import type { SignalCategory } from '../../api/types';

const categoryTone: Record<SignalCategory, 'red' | 'amber' | 'indigo' | 'teal' | 'gray'> = {
  derailer: 'red',
  laggard: 'amber',
  cost_drainer: 'indigo',
  revenue_leakage: 'teal',
  other: 'gray',
};

export function SuggestedSignalsList() {
  const { data, isLoading, isError } = useSuggestedSignals();
  const { data: connections } = useConnections();
  const submit = useSubmitSignalForReview();
  const { showToast } = useToast();

  if (isLoading) return <Loading />;
  if (isError) return <ErrorMessage />;

  const suggested = data?.filter((s) => s.approvalStatus === 'suggested') ?? [];

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="t">
        <thead>
          <tr><th>Signal</th><th>Category</th><th>Source</th><th>Computable now</th><th></th></tr>
        </thead>
        <tbody>
          {suggested.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--ink-3)' }}>No new suggested signals.</td></tr>}
          {suggested.map((s) => (
            <tr className="row-h" key={s.id}>
              <td><b>{s.name}</b><div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{s.description}</div></td>
              <td><Pill tone={categoryTone[s.category]}>{s.category.replace('_', ' ')}</Pill></td>
              <td>{s.sourceConnectionIds.map((id) => connections?.find((c) => c.id === id)?.name ?? id).join(', ')}</td>
              <td>{s.computableNow ? <Pill tone="green">Yes</Pill> : <Pill tone="gray">No</Pill>}</td>
              <td>
                <button
                  className="btn primary sm"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate(s.id, { onSuccess: () => showToast(`${s.name} submitted for review`) })}
                >
                  Submit for review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
