import { useState } from 'react';
import { useUpdateBrainNode } from '../../api/shadowOrg';
import { useToast } from '../../components/shared/Toast';
import type { BrainNode, StreamDef } from '../../api/types';

const kindNoun = { target: 'intent', pl_line: 'P&L line', stream_kpi: 'mandate', driver: 'sense' } as const;

export function NodeEditor({ node, streams, onClose }: { node: BrainNode; streams: StreamDef[]; onClose: () => void }) {
  const update = useUpdateBrainNode();
  const { showToast } = useToast();
  const [name, setName] = useState(node.name);
  const [definition, setDefinition] = useState(node.definition ?? '');
  const [targetValue, setTargetValue] = useState(node.targetValue ?? '');
  const [streamKey, setStreamKey] = useState(node.streamKey ?? '');
  const [dataSources, setDataSources] = useState((node.dataSources ?? []).join(', '));

  const noun = kindNoun[node.kind];
  const inputStyle = { width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, fontFamily: 'inherit' as const, background: 'var(--surface)', color: 'var(--ink)' };
  const labelStyle = { fontSize: 10.5, textTransform: 'uppercase' as const, letterSpacing: '.4px', color: 'var(--ink-3)', marginBottom: 4, display: 'block' };

  const save = () => {
    update.mutate(
      {
        id: node.id,
        name,
        definition,
        targetValue: node.kind === 'driver' ? undefined : targetValue,
        streamKey: node.kind === 'target' ? undefined : streamKey,
        dataSources: dataSources.split(',').map((s) => s.trim()).filter(Boolean),
      },
      {
        onSuccess: () => { showToast(`${noun[0].toUpperCase() + noun.slice(1)} updated`); onClose(); },
      },
    );
  };

  return (
    <div className="brain-editor-backdrop" onClick={onClose}>
      <div className="brain-editor" onClick={(e) => e.stopPropagation()}>
        <div className="be-title">Edit {noun}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>{node.kind === 'stream_kpi' ? 'Mandate — what must stay true' : 'Name'}</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Definition</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 56 }} value={definition} onChange={(e) => setDefinition(e.target.value)} />
          </div>
          {node.kind !== 'driver' && (
            <div>
              <label style={labelStyle}>Target value</label>
              <input style={inputStyle} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="e.g. 96%" />
            </div>
          )}
          {node.kind !== 'target' && (
            <div>
              <label style={labelStyle}>Stream</label>
              <select style={inputStyle} value={streamKey} onChange={(e) => setStreamKey(e.target.value)}>
                {streams.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={labelStyle}>Senses — data feeds (comma separated)</label>
            <input style={inputStyle} value={dataSources} onChange={(e) => setDataSources(e.target.value)} placeholder="e.g. Modern trade POS API, DC stock snapshots" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn primary sm" disabled={!name.trim() || update.isPending} onClick={save}>Save changes</button>
          <button className="btn ghost sm" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
