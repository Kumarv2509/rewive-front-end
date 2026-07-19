import { useState } from 'react';
import { useKpiBrain } from '../../api/shadowOrg';
import { useTrackingConfigs, useUpsertTrackingConfig } from '../../api/tracking';
import { useToast } from '../../components/shared/Toast';
import type { BrainNode, MandateTrackingConfig, TrackingDirection } from '../../api/types';

const inputStyle = { border: '1px solid var(--border-strong)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5 } as const;

interface Draft {
  targetNumeric: string;
  unit: string;
  direction: TrackingDirection;
  warnPct: string;
  breachPct: string;
  sustainedPoints: string;
  enabled: boolean;
}

const draftFrom = (cfg?: MandateTrackingConfig): Draft => ({
  targetNumeric: cfg ? String(cfg.targetNumeric) : '',
  unit: cfg?.unit ?? 'pct',
  direction: cfg?.direction ?? 'up_good',
  warnPct: String(cfg?.warnPct ?? 3),
  breachPct: String(cfg?.breachPct ?? 5),
  sustainedPoints: String(cfg?.sustainedPoints ?? 3),
  enabled: cfg?.enabled ?? true,
});

export function TrackingConfigPanel() {
  const { data: brain } = useKpiBrain();
  const { data: configs } = useTrackingConfigs();
  const upsert = useUpsertTrackingConfig();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(draftFrom());

  const mandates = (brain?.nodes ?? []).filter((n): n is BrainNode => n.kind === 'stream_kpi' && n.status !== 'declined');
  const configByNode = new Map((configs ?? []).map((c) => [c.nodeId, c]));

  const startEdit = (node: BrainNode) => {
    setEditing(node.id);
    setDraft(draftFrom(configByNode.get(node.id)));
  };

  const save = (node: BrainNode) => {
    const target = Number(draft.targetNumeric);
    if (!Number.isFinite(target)) return;
    upsert.mutate(
      {
        nodeId: node.id,
        targetNumeric: target,
        unit: draft.unit,
        direction: draft.direction,
        warnPct: Number(draft.warnPct) || 3,
        breachPct: Number(draft.breachPct) || 5,
        sustainedPoints: Number(draft.sustainedPoints) || 3,
        enabled: draft.enabled,
      },
      {
        onSuccess: () => {
          setEditing(null);
          showToast(`Live tracking ${draft.enabled ? 'enabled' : 'updated'} for "${node.name}"`);
        },
      }
    );
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Live-tracked mandates</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>
        Give a mandate a numeric target and thresholds, push real data, and its counterpart raises findings when the number drifts.
      </div>
      <table className="t" style={{ fontSize: 13 }}>
        <thead>
          <tr><th>Mandate</th><th>Latest</th><th>Target</th><th>Points</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {mandates.map((node) => {
            const cfg = configByNode.get(node.id);
            const isEditing = editing === node.id;
            return (
              <FragmentRow
                key={node.id}
                node={node}
                cfg={cfg}
                isEditing={isEditing}
                draft={draft}
                setDraft={setDraft}
                onEdit={() => startEdit(node)}
                onCancel={() => setEditing(null)}
                onSave={() => save(node)}
                saving={upsert.isPending}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ node, cfg, isEditing, draft, setDraft, onEdit, onCancel, onSave, saving }: {
  node: BrainNode;
  cfg?: MandateTrackingConfig;
  isEditing: boolean;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <>
      <tr>
        <td>
          <div style={{ fontWeight: 600 }}>{node.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{node.id}</div>
        </td>
        <td>{cfg?.latestValue ?? '—'}</td>
        <td>{cfg ? cfg.targetNumeric : '—'}</td>
        <td>{cfg?.pointCount ?? 0}</td>
        <td>
          {cfg?.enabled
            ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>● live</span>
            : cfg ? <span style={{ color: 'var(--ink-3)' }}>paused</span> : <span style={{ color: 'var(--ink-3)' }}>not tracked</span>}
        </td>
        <td>
          <button className="btn ghost sm" onClick={isEditing ? onCancel : onEdit}>
            {isEditing ? 'Cancel' : cfg ? 'Edit' : 'Track'}
          </button>
        </td>
      </tr>
      {isEditing && (
        <tr>
          <td colSpan={6} style={{ background: 'var(--paper-2, #f7f5f0)' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', padding: '10px 4px' }}>
              <Labeled label="Target">
                <input style={{ ...inputStyle, width: 90 }} value={draft.targetNumeric}
                  onChange={(e) => setDraft({ ...draft, targetNumeric: e.target.value })} placeholder="97" />
              </Labeled>
              <Labeled label="Unit">
                <select style={inputStyle} value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
                  <option value="pct">%</option>
                  <option value="currency_m">Currency (M)</option>
                  <option value="days">Days</option>
                  <option value="ratio">Ratio (x)</option>
                  <option value="count">Count</option>
                </select>
              </Labeled>
              <Labeled label="Good direction">
                <select style={inputStyle} value={draft.direction}
                  onChange={(e) => setDraft({ ...draft, direction: e.target.value as TrackingDirection })}>
                  <option value="up_good">Higher is better</option>
                  <option value="down_good">Lower is better</option>
                </select>
              </Labeled>
              <Labeled label="Warn at %">
                <input style={{ ...inputStyle, width: 60 }} value={draft.warnPct}
                  onChange={(e) => setDraft({ ...draft, warnPct: e.target.value })} />
              </Labeled>
              <Labeled label="Breach at %">
                <input style={{ ...inputStyle, width: 60 }} value={draft.breachPct}
                  onChange={(e) => setDraft({ ...draft, breachPct: e.target.value })} />
              </Labeled>
              <Labeled label="Sustained pts">
                <input style={{ ...inputStyle, width: 60 }} value={draft.sustainedPoints}
                  onChange={(e) => setDraft({ ...draft, sustainedPoints: e.target.value })} />
              </Labeled>
              <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} /> Enabled
              </label>
              <button className="btn primary sm" disabled={!draft.targetNumeric || saving} onClick={onSave}>Save</button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--ink-2)', display: 'block', marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}
