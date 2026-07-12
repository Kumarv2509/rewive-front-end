import { useState } from 'react';
import { useLiveRuns } from '../../api/dashboard';
import { LiveRunCard } from './LiveRunCard';
import { RunsTable } from './RunsTable';
import { ExceptionLog } from './ExceptionLog';
import { ChaseEscalateList } from './ChaseEscalateList';
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
  const { data: liveRuns } = useLiveRuns();
  const primaryLiveRunId = liveRuns?.[0]?.id;

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

      {primaryLiveRunId && <LiveRunCard runId={primaryLiveRunId} />}

      <RunsTable status={status} />

      <div style={{ marginTop: 16 }}>
        <ExceptionLog />
        <ChaseEscalateList />
      </div>
    </section>
  );
}
