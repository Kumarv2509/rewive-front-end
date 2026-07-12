import type { SimulationResult } from '../../api/types';

export function SimulationPanel({ result, onClose }: { result: SimulationResult; onClose: () => void }) {
  return (
    <div className="simulation-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>Simulation result</div>
        <button className="btn ghost sm" onClick={onClose}>Close</button>
      </div>
      {result.budgetWarning && (
        <div style={{ color: 'var(--amber)', fontSize: 12, marginBottom: 8 }}>⚠ {result.budgetWarning}</div>
      )}
      {result.nodeResults.map((r) => (
        <div className="sim-node-result" key={r.nodeId}>{r.summary}</div>
      ))}
      <div className="sim-final">{result.finalOutputPreview}</div>
    </div>
  );
}
