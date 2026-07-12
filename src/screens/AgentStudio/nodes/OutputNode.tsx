import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useApprovedConnections } from '../../../api/connectors';
import type { OutputNodeData, StudioOutputType } from '../../../api/types';

const outputOptions: { value: StudioOutputType; label: string }[] = [
  { value: 'mcp', label: 'MCP' },
  { value: 'connector', label: 'Data connector (write-back)' },
  { value: 'excel', label: 'Excel' },
  { value: 'ppt', label: 'PPT' },
  { value: 'json', label: 'JSON' },
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
];

export type OutputNodeFlowData = OutputNodeData & { onChange: (patch: Partial<OutputNodeData>) => void };

export function OutputNode({ data }: NodeProps & { data: OutputNodeFlowData }) {
  const { data: connections } = useApprovedConnections();

  return (
    <div className="studio-node output">
      <Handle type="target" position={Position.Left} />
      <div className="sn-head">Output</div>
      <div className="sn-body">
        <select value={data.outputType} onChange={(e) => data.onChange({ outputType: e.target.value as StudioOutputType })}>
          {outputOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {data.outputType === 'connector' && (
          <select value={data.connectionId ?? ''} onChange={(e) => data.onChange({ connectionId: e.target.value })}>
            <option value="">Select connection…</option>
            {connections?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input
          placeholder="Destination (e.g. file name)"
          value={data.destinationLabel}
          onChange={(e) => data.onChange({ destinationLabel: e.target.value })}
        />
      </div>
    </div>
  );
}
