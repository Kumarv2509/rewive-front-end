import { useState } from 'react';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useKpiCatalog, useTrackedKpis, useTrackKpi, useAddCustomKpi } from '../../api/kpiLibrary';
import { useToast } from '../../components/shared/Toast';
import type { KpiCategory, KpiDriver, KpiSegment } from '../../api/types';

const segments: { key: KpiSegment; label: string }[] = [
  { key: 'hospital', label: 'Hospital' },
  { key: 'clinic', label: 'Clinic' },
  { key: 'pharmacy', label: 'Pharmacy chain' },
];

const categoryTone: Record<KpiCategory, 'indigo' | 'teal' | 'red' | 'amber'> = {
  financial: 'indigo',
  operational: 'teal',
  clinical: 'red',
  patient_experience: 'amber',
};

function CustomKpiForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [drivers, setDrivers] = useState<KpiDriver[]>([{ name: '', dataSource: '' }]);
  const addCustom = useAddCustomKpi();
  const { showToast } = useToast();

  if (!open) return <button className="btn ghost sm" onClick={() => setOpen(true)}>+ Add a custom KPI by drivers</button>;

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Add a custom KPI by drivers</div>
      <input
        placeholder="KPI name, e.g. Net Promoter Score"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}
      />
      {drivers.map((d, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="Driver name"
            value={d.name}
            onChange={(e) => setDrivers(drivers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
          />
          <input
            placeholder="Data source, e.g. Snowflake — Finance DW"
            value={d.dataSource}
            onChange={(e) => setDrivers(drivers.map((x, j) => (j === i ? { ...x, dataSource: e.target.value } : x)))}
            style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="btn ghost sm" onClick={() => setDrivers([...drivers, { name: '', dataSource: '' }])}>+ Add driver</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn primary sm"
          disabled={!name || addCustom.isPending}
          onClick={() =>
            addCustom.mutate(
              { name, drivers: drivers.filter((d) => d.name) },
              { onSuccess: () => { showToast(`Now tracking "${name}"`); setOpen(false); setName(''); setDrivers([{ name: '', dataSource: '' }]); } }
            )
          }
        >
          Track this KPI
        </button>
        <button className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

export function SelectKpisTab() {
  const [segment, setSegment] = useState<KpiSegment>('hospital');
  const { data: catalog, isLoading, isError } = useKpiCatalog(segment);
  const { data: tracked } = useTrackedKpis();
  const trackKpi = useTrackKpi();
  const { showToast } = useToast();

  const trackedIds = new Set(tracked?.map((t) => t.id));

  return (
    <div>
      <div className="filters" style={{ marginBottom: 16 }}>
        {segments.map((s) => (
          <button key={s.key} className={`fchip${segment === s.key ? ' on' : ''}`} onClick={() => setSegment(s.key)}>{s.label}</button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}><CustomKpiForm /></div>

      {isLoading && <Loading />}
      {isError && <ErrorMessage />}

      {catalog?.map((k) => {
        const isTracked = trackedIds.has(k.id);
        return (
          <div key={k.id} className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Pill tone={categoryTone[k.category]}>{k.category.replace('_', ' ')}</Pill>
              <div style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{k.name}</div>
              <button
                className={isTracked ? 'btn ghost sm' : 'btn primary sm'}
                disabled={isTracked || trackKpi.isPending}
                onClick={() => trackKpi.mutate(k.id, { onSuccess: () => showToast(`Now tracking "${k.name}"`) })}
              >
                {isTracked ? 'Tracking ✓' : 'Track this KPI'}
              </button>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 4 }}>{k.definition}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 6 }}>Formula: {k.formula}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
              Data needed: {k.driversNeeded.map((d) => `${d.name} (${d.dataSource})`).join(', ')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
