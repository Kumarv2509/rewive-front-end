import { useState } from 'react';
import { Pill } from '../../components/shared/Pill';
import type { AgentWorkflow } from '../../api/types';

export function StudioToolbar({
  workflow,
  saving,
  simulating,
  publishing,
  onRename,
  onSave,
  onSimulate,
  onPublish,
}: {
  workflow: AgentWorkflow;
  saving: boolean;
  simulating: boolean;
  publishing: boolean;
  onRename: (name: string) => void;
  onSave: () => void;
  onSimulate: () => void;
  onPublish: () => void;
}) {
  const [name, setName] = useState(workflow.name);

  return (
    <div className="studio-toolbar">
      <input
        className="name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onRename(name)}
      />
      <Pill tone={workflow.status === 'published' ? 'green' : 'gray'}>
        {workflow.status === 'published' ? `Published v${workflow.publishedVersion}` : `Draft v${workflow.version}`}
      </Pill>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
        <button className="btn ghost sm" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save draft'}</button>
        <button className="btn ghost sm" disabled={simulating} onClick={onSimulate}>{simulating ? 'Simulating…' : 'Simulate'}</button>
        <button className="btn primary sm" disabled={publishing} onClick={onPublish}>{publishing ? 'Publishing…' : 'Publish'}</button>
      </div>
    </div>
  );
}
