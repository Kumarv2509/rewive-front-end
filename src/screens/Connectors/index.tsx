import { useState } from 'react';
import { ConnectorTypeGrid } from './ConnectorTypeGrid';
import { NewConnectionForm } from './NewConnectionForm';
import { NewConnectorTypeForm } from './NewConnectorTypeForm';
import { ConnectionsTable } from './ConnectionsTable';
import type { ConnectionStatus, ConnectorType } from '../../api/types';

const filters: { key: ConnectionStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'error', label: 'Error' },
];

export function ConnectorsScreen() {
  const [status, setStatus] = useState<ConnectionStatus | 'all'>('all');
  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);

  return (
    <section className="screen">
      <h1 className="page">Data Connectors</h1>
      <div className="sub">Connect new data sources yourself — every connection goes through a quick approval before it's usable in Agent Studio or Signal Studio.</div>

      <ConnectorTypeGrid
        selectedTypeId={selectedType?.id}
        onSelect={(t) => { setSelectedType(t); setShowCustomForm(false); }}
        onAddCustom={() => { setShowCustomForm(true); setSelectedType(null); }}
      />

      {selectedType && <NewConnectionForm connectorType={selectedType} onClose={() => setSelectedType(null)} />}
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
