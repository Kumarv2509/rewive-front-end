import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BrainHealth, BrainNodeKind } from '../../api/types';
import type { BrainNodeData } from './layout';

const kindLabel: Record<BrainNodeKind, string> = { target: 'Intent', stream_kpi: 'Mandate', driver: 'Sense' };
const kindAccent: Record<BrainNodeKind, string> = { target: '#2DD4BF', stream_kpi: '#7C7CFF', driver: '#63678B' };
const healthColor: Record<BrainHealth, string> = { on_track: '#4ADE80', at_risk: '#FBBF24', off_track: '#F87171' };
const healthLabel: Record<BrainHealth, string> = { on_track: 'on track', at_risk: 'at risk', off_track: 'off track' };

export function BrainNodeCard({ data }: NodeProps & { data: BrainNodeData }) {
  const { node, streamName, dimmed, focused, onResolve, onEdit } = data;
  const proposed = node.status === 'proposed';
  const needsData = node.status === 'needs_data';
  const accent = kindAccent[node.kind];

  return (
    <div
      className="brain-node"
      style={{
        borderTop: `2.5px solid ${proposed ? '#8B5CF6' : accent}`,
        opacity: dimmed ? 0.3 : 1,
        boxShadow: focused ? `0 0 0 1.5px ${accent}, 0 0 26px rgba(124,99,255,.4)` : undefined,
        borderStyle: proposed ? 'dashed' : 'solid',
      }}
    >
      {/* contribution flows upward: drivers/KPIs emit from the top, KPIs/targets receive at the bottom */}
      {node.kind !== 'target' && <Handle type="source" position={Position.Top} />}
      {node.kind !== 'driver' && <Handle type="target" position={Position.Bottom} />}

      <div className="bn-head">
        <span style={{ color: accent }}>{kindLabel[node.kind]}</span>
        {node.health && (
          <span className="bn-health" style={{ color: healthColor[node.health] }}>
            <span className="bn-dot" style={{ background: healthColor[node.health] }} />
            {healthLabel[node.health]}
          </span>
        )}
        {proposed && <span className="bn-health" style={{ color: '#B9C0FF' }}>petition</span>}
        {needsData && <span className="bn-health" style={{ color: '#FBBF24' }}>needs a sense</span>}
      </div>

      <div className="bn-name">{node.name}</div>
      {streamName && node.kind !== 'target' && <div className="bn-stream">{streamName}</div>}

      {(node.currentValue || node.targetValue) && (
        <div className="bn-vals">
          {node.currentValue && <span className="bn-now">{node.currentValue}</span>}
          {node.targetValue && <span className="bn-tgt">→ {node.targetValue}</span>}
        </div>
      )}

      {proposed && (
        <>
          {node.proposedBy && <div className="bn-proposed-by">{node.proposedBy} petitions for this</div>}
          <div className="bn-actions">
            <button className="btn primary sm" onClick={() => onResolve('node', node.id, 'accept')}>Ratify</button>
            <button className="btn ghost sm" onClick={() => onResolve('node', node.id, 'decline')}>Decline</button>
          </div>
        </>
      )}

      {focused && !proposed && (
        <div className="bn-actions">
          <button
            className="btn ghost sm"
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}
          >
            Edit {kindLabel[node.kind].toLowerCase()}
          </button>
        </div>
      )}
    </div>
  );
}
