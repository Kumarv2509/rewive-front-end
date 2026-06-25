import { useState } from 'react';
import { useCreateConnection } from '../../api/connectors';
import { useToast } from '../../components/shared/Toast';
import type { ConnectorType } from '../../api/types';

export function NewConnectionForm({ connectorType, onClose }: { connectorType: ConnectorType; onClose: () => void }) {
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const create = useCreateConnection();
  const { showToast } = useToast();

  const handleSubmit = () => {
    create.mutate(
      { connectorTypeId: connectorType.id, name, config },
      {
        onSuccess: () => {
          showToast('Connection submitted for approval');
          onClose();
        },
      }
    );
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>New {connectorType.name} connection</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
        <input
          placeholder="Connection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        />
        {connectorType.fields.map((f) => (
          <div key={f.key}>
            <label style={{ fontSize: 12, color: 'var(--ink-2)', display: 'block', marginBottom: 4 }}>{f.label}</label>
            {f.inputType === 'select' ? (
              <select
                value={config[f.key] ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
                style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
              >
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.inputType === 'password' ? 'password' : 'text'}
                value={config[f.key] ?? ''}
                onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
                style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button className="btn primary" disabled={!name || create.isPending} onClick={handleSubmit}>
          Submit for approval
        </button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
