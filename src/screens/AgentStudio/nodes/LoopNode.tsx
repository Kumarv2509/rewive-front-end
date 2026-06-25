import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { LoopNodeData } from '../../../api/types';

export type LoopNodeFlowData = LoopNodeData & { onChange: (patch: Partial<LoopNodeData>) => void };

export function LoopNode({ data }: NodeProps & { data: LoopNodeFlowData }) {
  return (
    <div className="studio-node loop">
      <Handle type="target" position={Position.Left} />
      <div className="sn-head">Loop</div>
      <div className="sn-body">
        <select value={data.iterationMode} onChange={(e) => data.onChange({ iterationMode: e.target.value as LoopNodeData['iterationMode'] })}>
          <option value="fixed_count">Fixed count</option>
          <option value="per_item">Per item (from upstream node)</option>
        </select>
        {data.iterationMode === 'fixed_count' && (
          <input
            type="number"
            min={1}
            placeholder="Iterations"
            value={data.iterationCount ?? ''}
            onChange={(e) => data.onChange({ iterationCount: Number(e.target.value) || 1 })}
          />
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
