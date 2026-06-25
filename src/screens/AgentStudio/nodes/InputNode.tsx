import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useApprovedConnections } from '../../../api/connectors';
import type { InputNodeData } from '../../../api/types';

export type InputNodeFlowData = InputNodeData & { onChange: (patch: Partial<InputNodeData>) => void };

export function InputNode({ data }: NodeProps & { data: InputNodeFlowData }) {
  const { data: connections } = useApprovedConnections();

  return (
    <div className="studio-node input">
      <div className="sn-head">Input</div>
      <div className="sn-body">
        <select value={data.sourceType} onChange={(e) => data.onChange({ sourceType: e.target.value as InputNodeData['sourceType'] })}>
          <option value="synthetic">Synthetic data</option>
          <option value="connector">Data connector</option>
        </select>
        {data.sourceType === 'connector' && (
          <select value={data.connectionId ?? ''} onChange={(e) => data.onChange({ connectionId: e.target.value })}>
            <option value="">Select connection…</option>
            {connections?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
