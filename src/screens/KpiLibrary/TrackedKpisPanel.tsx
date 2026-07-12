import { Pill } from '../../components/shared/Pill';
import { Link } from 'react-router-dom';
import { useTrackedKpis, useUntrackKpi } from '../../api/kpiLibrary';
import type { TrackedKpiSource } from '../../api/types';

const sourceTone: Record<TrackedKpiSource, { tone: 'indigo' | 'teal' | 'gray'; label: string }> = {
  catalog: { tone: 'indigo', label: 'from library' },
  custom: { tone: 'gray', label: 'custom' },
  planning_import: { tone: 'teal', label: 'imported' },
};

export function TrackedKpisPanel() {
  const { data: tracked } = useTrackedKpis();
  const untrack = useUntrackKpi();

  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Your tracked KPIs</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 10 }}>
        This is what feeds Signal Studio — once the data below is connected, signals can surface against these KPIs.
      </div>
      {(tracked?.length ?? 0) === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Nothing tracked yet — import from a planning tool or pick from the library below.</div>}
      {tracked?.map((k) => (
        <div key={k.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill tone={sourceTone[k.source].tone}>{sourceTone[k.source].label}</Pill>
            <div style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{k.name}</div>
            {k.dataStatus === 'connected' ? (
              <Pill tone="green">data connected</Pill>
            ) : (
              <>
                <Pill tone="amber">needs data</Pill>
                <Link className="btn ghost sm" to="/build/connectors">Connect &rarr;</Link>
              </>
            )}
            <button className="btn ghost sm" onClick={() => untrack.mutate(k.id)}>Remove</button>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginTop: 4 }}>
            Data needed: {k.driversNeeded.map((d) => `${d.name} (${d.dataSource})`).join(', ') || 'none specified'}
          </div>
        </div>
      ))}
    </div>
  );
}
