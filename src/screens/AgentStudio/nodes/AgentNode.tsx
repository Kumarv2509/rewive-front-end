import { Link } from 'react-router-dom';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAgentCatalog } from '../../../api/agentSpace';
import type { AgentNodeData } from '../../../api/types';

export type AgentNodeFlowData = AgentNodeData & { onChange: (patch: Partial<AgentNodeData>) => void };

export function AgentNode({ data }: NodeProps & { data: AgentNodeFlowData }) {
  const { data: workers } = useAgentCatalog({});

  return (
    <div className="studio-node agent">
      <Handle type="target" position={Position.Left} />
      <div className="sn-head">Nested worker</div>
      <div className="sn-body">
        <select value={data.refAgentId ?? ''} onChange={(e) => data.onChange({ refAgentId: e.target.value || undefined })}>
          <option value="">Select existing worker…</option>
          {workers?.map((a) => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
        </select>
        {data.refAgentId && <Link className="all" style={{ fontSize: 11.5 }} to={`/insights/agents/${data.refAgentId}`}>View worker →</Link>}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
