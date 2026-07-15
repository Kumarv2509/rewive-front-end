import { useState } from 'react';
import { useLiveRuns } from '../../api/dashboard';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Intro } from '../../components/shared/Intro';
import { ScopeBanner } from '../../components/shared/ScopeBanner';
import { SectionTabs, EXECUTION_TABS } from '../../components/shared/SectionTabs';
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
  const { persona, scope } = useEffectiveLens();
  const { data: liveRuns } = useLiveRuns(persona, scope);
  const primaryLiveRunId = liveRuns?.[0]?.id;

  return (
    <section className="screen">
      <h1 className="page">Execution</h1>
      <Intro
        line="Every execution, live and historical — what ran, who owns it, where it's waiting on a human."
        more={
          <>
            Runs are agent executions; tasks are the human and agent work created by a finding's <b>Act</b> disposition;
            outcomes are the reports a completed run publishes. When an outcome's actions land, the Decision Ledger
            records whether they worked — the loop closes itself.
          </>
        }
      />
      <SectionTabs tabs={EXECUTION_TABS} />
      <ScopeBanner />

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

      <RunsTable status={status} persona={persona} scope={scope} />

      <div style={{ marginTop: 16 }}>
        <ExceptionLog />
        <ChaseEscalateList />
      </div>
    </section>
  );
}
