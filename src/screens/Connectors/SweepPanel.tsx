import { useRunSweepNow, useSweepRuns } from '../../api/tracking';
import { useToast } from '../../components/shared/Toast';

export function SweepPanel() {
  const { data: runs } = useSweepRuns();
  const runSweep = useRunSweepNow();
  const { showToast } = useToast();

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>Agent sweeps</div>
        <button
          className="btn primary sm"
          disabled={runSweep.isPending}
          onClick={() =>
            runSweep.mutate(undefined, {
              onSuccess: (run) =>
                showToast(
                  run.findingsRaised
                    ? `Sweep complete — ${run.findingsRaised} finding(s) raised`
                    : `Sweep complete — ${run.nodesEvaluated} mandate(s) evaluated, nothing drifting`
                ),
            })
          }
        >
          {runSweep.isPending ? 'Sweeping…' : 'Run sweep now'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>
        The counterparts re-check every live-tracked mandate on a schedule; drift becomes a finding that must be answered.
      </div>
      {(runs ?? []).length > 0 ? (
        <table className="table" style={{ fontSize: 12.5 }}>
          <thead>
            <tr><th>When</th><th>Trigger</th><th>Evaluated</th><th>Raised</th><th>Re-alerts</th><th>Closures</th></tr>
          </thead>
          <tbody>
            {runs!.slice(0, 8).map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td>{r.trigger}</td>
                <td>{r.nodesEvaluated}</td>
                <td style={{ fontWeight: r.findingsRaised ? 700 : 400 }}>{r.findingsRaised}</td>
                <td>{r.reAlertsFired}</td>
                <td>{r.closuresProgressed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No sweeps yet.</div>
      )}
    </div>
  );
}
