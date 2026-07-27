import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import { SectionTabs, FOUNDATION_TABS } from '../../components/shared/SectionTabs';
import { ConnectorTypeGrid } from './ConnectorTypeGrid';
import { NewConnectionForm } from './NewConnectionForm';
import { NewConnectorTypeForm } from './NewConnectorTypeForm';
import { ConnectionsTable } from './ConnectionsTable';
import { IngestKeysPanel } from './IngestKeysPanel';
import { MetricUploadPanel } from './MetricUploadPanel';
import { TrackingConfigPanel } from './TrackingConfigPanel';
import { SweepPanel } from './SweepPanel';
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

// Two sections instead of one long stack: Live tracking (the one real
// pipeline — metrics → drift → findings) and Connections (the catalog).
// Deep links that target a connection (?forKpi, ?status) land on Connections.
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

  const [section, setSection] = useState<'tracking' | 'connections'>(
    forKpiId || isStatusFilter(initialStatus) ? 'connections' : 'tracking',
  );

  return (
    <section className="screen">
      <PageHeader
        title="Data Connectors"
        subtitle="Connect real data to the mandates — push metrics with an ingest key or upload history, set targets, and the agents watch the numbers from there."
        actions={
          <div className="seg">
            <button className={section === 'tracking' ? 'on' : ''} onClick={() => setSection('tracking')}>Live tracking</button>
            <button className={section === 'connections' ? 'on' : ''} onClick={() => setSection('connections')}>Connections</button>
          </div>
        }
        tabs={<SectionTabs tabs={FOUNDATION_TABS} />}
      />

      {section === 'tracking' && (
        <>
          {/* Live mandate tracking: the real pipeline (metrics → drift → findings). */}
          <TrackingConfigPanel />
          <IngestKeysPanel />
          <MetricUploadPanel />
          <SweepPanel />
        </>
      )}

      {section === 'connections' && (
        <>
          {forKpi && (
            <div className="card" style={{ padding: '14px 20px', marginBottom: 20, borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>Connecting data for “{forKpi.name}”</div>
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
        </>
      )}
    </section>
  );
}
