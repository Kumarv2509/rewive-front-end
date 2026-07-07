import { useState } from 'react';
import { RunsTable } from './RunsTable';
import type { RunStatus } from '../../api/types';

const filters: { key: RunStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'needs_decision', label: 'Needs decision' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
];

export function RunsScreen() {
  const [status, setStatus] = useState<RunStatus | 'all'>('all');

  return (
    <section className="screen">
      <h1 className="page">Runs &amp; Actions</h1>
      <div className="sub">Every execution, live and historical — what ran, who owns it, where it's waiting on a human.</div>

      <div className="filters">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`fchip${status === f.key ? ' on' : ''}`}
            onClick={() => setStatus(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <RunsTable status={status} />
    </section>
  );
}
