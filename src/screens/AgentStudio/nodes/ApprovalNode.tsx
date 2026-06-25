import { Handle, Position, type NodeProps } from '@xyflow/react';
import { usePeopleDirectory } from '../../../api/peopleDirectory';
import { Avatar } from '../../../components/shared/Avatar';
import type { ApprovalNodeData } from '../../../api/types';

export type ApprovalNodeFlowData = ApprovalNodeData & { onChange: (patch: Partial<ApprovalNodeData>) => void };

export function ApprovalNode({ data }: NodeProps & { data: ApprovalNodeFlowData }) {
  const { data: people } = usePeopleDirectory();

  const toggle = (userId: string) => {
    const set = new Set(data.approverUserIds);
    if (set.has(userId)) set.delete(userId); else set.add(userId);
    data.onChange({ approverUserIds: [...set] });
  };

  return (
    <div className="studio-node approval">
      <Handle type="target" position={Position.Left} />
      <div className="sn-head">Human review / approval</div>
      <div className="sn-body">
        <textarea
          placeholder="What should the approver review?"
          value={data.instructions}
          onChange={(e) => data.onChange({ instructions: e.target.value })}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {people?.map((p) => (
            <span
              key={p.userId}
              onClick={() => toggle(p.userId)}
              style={{ cursor: 'pointer', opacity: data.approverUserIds.includes(p.userId) ? 1 : 0.35 }}
              title={p.name}
            >
              <Avatar initials={p.initials} background={p.avatarBg} size={22} fontSize={9} />
            </span>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
