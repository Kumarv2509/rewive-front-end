import { useState } from 'react';
import { useCreateIngestKey, useIngestKeys, useRevokeIngestKey } from '../../api/tracking';
import { useToast } from '../../components/shared/Toast';
import type { CreatedIngestKey } from '../../api/types';

const inputStyle = { border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 } as const;

export function IngestKeysPanel() {
  const { data: keys } = useIngestKeys();
  const createKey = useCreateIngestKey();
  const revokeKey = useRevokeIngestKey();
  const { showToast } = useToast();
  const [label, setLabel] = useState('');
  const [justCreated, setJustCreated] = useState<CreatedIngestKey | null>(null);

  const curlExample = justCreated
    ? `curl -X POST ${window.location.origin}/api/v1/metrics \\\n  -H "X-API-Key: ${justCreated.key}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"points":[{"nodeId":"<mandate-node-id>","value":84.2}]}'`
    : '';

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Ingest keys</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>
        Any system can push real metric values to the mandates with an ingest key — the counterpart watches whatever lands.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          placeholder="Key label (e.g. ERP nightly export)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ ...inputStyle, width: 280 }}
        />
        <button
          className="btn primary"
          disabled={!label.trim() || createKey.isPending}
          onClick={() =>
            createKey.mutate(label.trim(), {
              onSuccess: (created) => {
                setJustCreated(created);
                setLabel('');
                showToast(`Ingest key "${created.label}" issued`);
              },
            })
          }
        >
          Issue key
        </button>
      </div>

      {justCreated && (
        <div className="card" style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--green)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
            Copy this key now — it is shown only once.
          </div>
          <code style={{ fontSize: 12.5, wordBreak: 'break-all' }}>{justCreated.key}</code>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button
              className="btn ghost sm"
              onClick={() => { navigator.clipboard.writeText(justCreated.key); showToast('Key copied'); }}
            >
              Copy key
            </button>
            <button
              className="btn ghost sm"
              onClick={() => { navigator.clipboard.writeText(curlExample); showToast('curl example copied'); }}
            >
              Copy curl example
            </button>
            <button className="btn ghost sm" onClick={() => setJustCreated(null)}>Done</button>
          </div>
          <pre style={{ marginTop: 10, fontSize: 11.5, background: 'var(--paper-2, #f6f4ee)', padding: 10, borderRadius: 8, overflowX: 'auto' }}>{curlExample}</pre>
        </div>
      )}

      {(keys ?? []).length > 0 && (
        <table className="t" style={{ fontSize: 13 }}>
          <thead>
            <tr><th>Label</th><th>Created</th><th>Last used</th><th /></tr>
          </thead>
          <tbody>
            {keys!.map((k) => (
              <tr key={k.id} style={{ opacity: k.revokedAt ? 0.5 : 1 }}>
                <td>{k.label}{k.revokedAt ? ' (revoked)' : ''}</td>
                <td>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never'}</td>
                <td>
                  {!k.revokedAt && (
                    <button
                      className="btn ghost sm"
                      onClick={() => revokeKey.mutate(k.id, { onSuccess: () => showToast(`Key "${k.label}" revoked`) })}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
