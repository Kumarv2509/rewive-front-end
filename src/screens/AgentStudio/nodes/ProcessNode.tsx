import { useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ProcessNodeData } from '../../../api/types';

export type ProcessNodeFlowData = ProcessNodeData & {
  onChange: (patch: Partial<ProcessNodeData>) => void;
  onGenerate: (instructions: string) => Promise<string>;
};

export function ProcessNode({ data }: NodeProps & { data: ProcessNodeFlowData }) {
  const [generating, setGenerating] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    const generatedPrompt = await data.onGenerate(data.instructions);
    data.onChange({ generatedPrompt, generatedAt: new Date().toISOString() });
    setGenerating(false);
  };

  return (
    <div className="studio-node process">
      <Handle type="target" position={Position.Left} />
      <div className="sn-head">Process</div>
      <div className="sn-body">
        <textarea
          className="main"
          placeholder="Describe what this agent should do with the incoming data…"
          value={data.instructions}
          onChange={(e) => data.onChange({ instructions: e.target.value })}
        />
        <div className="attach-row">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const names = Array.from(e.target.files ?? []).map((f) => f.name);
              setAttachments((prev) => [...prev, ...names]);
              e.target.value = '';
            }}
          />
          <button className="btn ghost sm" onClick={() => fileInputRef.current?.click()}>📎 Attach</button>
          {attachments.map((name, i) => (
            <span className="attach-chip" key={`${name}-${i}`}>
              {name}
              <span style={{ cursor: 'pointer' }} onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>✕</span>
            </span>
          ))}
        </div>
        <button className="btn primary sm" disabled={!data.instructions || generating} onClick={handleGenerate}>
          {generating ? 'Generating…' : 'Generate prompt'}
        </button>
        {data.generatedPrompt && <textarea className="generated" readOnly value={data.generatedPrompt} />}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
