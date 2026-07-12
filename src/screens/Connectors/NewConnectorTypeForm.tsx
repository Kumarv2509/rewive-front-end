import { useState } from 'react';
import { useCreateCustomConnectorType } from '../../api/connectors';
import { useToast } from '../../components/shared/Toast';
import type { ConnectorField } from '../../api/types';

export function NewConnectorTypeForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<ConnectorField[]>([
    { key: '', label: '', inputType: 'text', required: true },
  ]);
  const create = useCreateCustomConnectorType();
  const { showToast } = useToast();

  const updateField = (i: number, patch: Partial<ConnectorField>) =>
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const handleSubmit = () => {
    create.mutate(
      { name, icon: '🔌', description, fields: fields.filter((f) => f.key && f.label) },
      {
        onSuccess: () => {
          showToast('Custom connector type added');
          onClose();
        },
      }
    );
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>New custom connector type</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
        <input
          placeholder="Connector type name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        />
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginTop: 4 }}>Config fields</div>
        {fields.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="key"
              value={f.key}
              onChange={(e) => updateField(i, { key: e.target.value })}
              style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}
            />
            <input
              placeholder="label"
              value={f.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
              style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}
            />
            <select
              value={f.inputType}
              onChange={(e) => updateField(i, { inputType: e.target.value as ConnectorField['inputType'] })}
              style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 }}
            >
              <option value="text">text</option>
              <option value="password">password</option>
              <option value="url">url</option>
              <option value="select">select</option>
            </select>
          </div>
        ))}
        <button
          className="btn ghost sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setFields((prev) => [...prev, { key: '', label: '', inputType: 'text', required: true }])}
        >
          + Add field
        </button>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button className="btn primary" disabled={!name || create.isPending} onClick={handleSubmit}>
          Save connector type
        </button>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
