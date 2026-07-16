import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Intro } from '../../components/shared/Intro';
import { ConnectorTypeGrid } from './ConnectorTypeGrid';
import { NewConnectionForm } from './NewConnectionForm';
import { NewConnectorTypeForm } from './NewConnectorTypeForm';
import { ConnectionsTable } from './ConnectionsTable';
import { useTrackedKpis } from '../../api/kpiLibrary';
import type { ConnectionStatus, ConnectorType } from '../../api/types';

const filters: { key: ConnectionStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'error', label: 'Error' },
];

const isStatusFilter = (v: string | null): v is ConnectionStatus | 'all' =>
  !!v && filters.some((f) => f.key === v);

export function ConnectorsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');
  const [status, setStatus] = useState<ConnectionStatus | 'all'>(isStatusFilter(initialStatus) ? initialStatus : 'all');
  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  const forKpiId = searchParams.get('forKpi');
  const { data: trackedKpis } = useTrackedKpis();
  const forKpi = forKpiId ? trackedKpis?.find((k) => k.id === forKpiId) : undefined;
  const clearForKpi = () => setSearchParams((p) => { p.delete('forKpi'); return p; }, { replace: true });

  return (
    <section className="screen">
      <h1 className="page">Data Connectors</h1>
      <Intro line="Connect new data sources yourself — every connection goes through a quick approval before it's usable in Agent Studio or Signal Studio." />

      {forKpi && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>Connecting data for “{forKpi.name}”</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
            Data needed: {forKpi.driversNeeded.map((d) => `${d.name} (${d.dataSource})`).join(', ') || 'none specified'}.
            Pick a connector below — once the connection is approved, this KPI shows as connected.
          </div>
        </div>
      )}

      <ConnectorTypeGrid
        selectedTypeId={selectedType?.id}
        onSelect={(t) => { setSelectedType(t); setShowCustomForm(false); }}
        onAddCustom={() => { setShowCustomForm(true); setSelectedType(null); }}
      />

      {selectedType && (
        <NewConnectionForm
          connectorType={selectedType}
          forKpi={forKpi}
          onCreated={clearForKpi}
          onClose={() => setSelectedType(null)}
        />
      )}
      {showCustomForm && <NewConnectorTypeForm onClose={() => setShowCustomForm(false)} />}

      <div className="filters">
        {filters.map((f) => (
          <button key={f.key} className={`fchip${status === f.key ? ' on' : ''}`} onClick={() => setStatus(f.key)}>{f.label}</button>
        ))}
      </div>

      <ConnectionsTable status={status} />
    </section>
  );
}
