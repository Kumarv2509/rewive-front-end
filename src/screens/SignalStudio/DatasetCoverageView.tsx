import { useState } from 'react';
import { useConnections } from '../../api/connectors';
import { useDatasetSignalCoverage, useSuggestedSignals } from '../../api/signalStudio';

export function DatasetCoverageView() {
  const { data: connections } = useConnections({ status: 'all' });
  const [connectionId, setConnectionId] = useState<string>('');
  const { data: coverage } = useDatasetSignalCoverage(connectionId || undefined);
  const { data: signals } = useSuggestedSignals();

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>What can I analyse from a dataset?</div>
      <select
        value={connectionId}
        onChange={(e) => setConnectionId(e.target.value)}
        style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 13 }}
      >
        <option value="">Select a connection…</option>
        {connections?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {coverage && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {coverage.calculableSignalIds.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No signals are currently computable from this dataset.</div>}
          {coverage.calculableSignalIds.map((id) => (
            <div key={id} style={{ fontSize: 12.5 }}>✓ {signals?.find((s) => s.id === id)?.name ?? id}</div>
          ))}
        </div>
      )}
    </div>
  );
}
