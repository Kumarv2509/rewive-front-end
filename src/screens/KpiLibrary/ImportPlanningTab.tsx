import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { useConnections } from '../../api/connectors';
import { useImportPlanningData } from '../../api/kpiLibrary';
import { useToast } from '../../components/shared/Toast';
import type { PlanningImportResult } from '../../api/types';

const planningTypes = ['anaplan', 'adaptive_planning'];

export function ImportPlanningTab() {
  const { data: connections } = useConnections();
  const importData = useImportPlanningData();
  const { showToast } = useToast();
  const [results, setResults] = useState<Record<string, PlanningImportResult>>({});

  const planningConnections = connections?.filter((c) => planningTypes.includes(c.connectorTypeId)) ?? [];

  return (
    <div>
      <div className="concept-note">
        Connect Anaplan, Workday Adaptive Planning, or a similar planning tool once — this pulls in the drivers and budget lines you already maintain there, instead of redefining them here.
      </div>

      {planningConnections.length === 0 && (
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 10 }}>No planning tool connected yet.</div>
          <Link className="btn primary sm" to="/build/connectors">Add a connector &rarr;</Link>
        </div>
      )}

      {planningConnections.map((conn) => {
        const result = results[conn.id];
        return (
          <div key={conn.id} className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{conn.name}</div>
              <Pill tone={conn.status === 'active' || conn.status === 'approved' ? 'green' : 'gray'}>{conn.status}</Pill>
              <button
                className="btn primary sm"
                disabled={importData.isPending || (conn.status !== 'active' && conn.status !== 'approved')}
                onClick={() =>
                  importData.mutate(conn.id, {
                    onSuccess: (res) => { setResults((r) => ({ ...r, [conn.id]: res })); showToast('Imported drivers and budget'); },
                  })
                }
              >
                Import drivers &amp; budget
              </button>
            </div>
            {conn.status !== 'active' && conn.status !== 'approved' && (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Needs to be approved in Data Connectors before you can import from it.</div>
            )}
            {result && (
              <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 4 }}>Drivers imported</div>
                {result.driversImported.map((d, i) => <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)' }}>{d.name}: {d.value}</div>)}
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-2)', margin: '8px 0 4px' }}>Budget lines imported</div>
                {result.budgetLinesImported.map((b, i) => <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)' }}>{b.name}: {b.amount}</div>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
