import { useState } from 'react';
import { Intro } from '../../components/shared/Intro';
import { StatsRow } from './StatsRow';
import { DecisionsTable } from './DecisionsTable';
import { PlImpactTable } from './PlImpactTable';
import { PlStatement } from './PlStatement';
import type { DecisionLedgerFilters } from '../../api/decisions';

const functionFilters: { key: DecisionLedgerFilters['function']; label: string }[] = [
  { key: 'all', label: 'All functions' },
  { key: 'finance', label: 'Finance' },
  { key: 'hr', label: 'HR' },
  { key: 'procurement', label: 'Procurement' },
];
const verdictFilters: { key: DecisionLedgerFilters['verdict']; label: string }[] = [
  { key: 'worked', label: 'Worked' },
  { key: 'not_worked', label: "Didn't work" },
];

export function DecisionsScreen() {
  const [fn, setFn] = useState<DecisionLedgerFilters['function']>('all');
  const [verdict, setVerdict] = useState<DecisionLedgerFilters['verdict']>('all');
  const [view, setView] = useState<'ledger' | 'pl'>('ledger');

  return (
    <section className="screen">
      <h1 className="page">Decision Ledger</h1>
      <Intro
        line="The company's memory of judgment — every decision, who made it, what it cost or earned, and whether it worked."
        more={
          <>
            Every disposition lands here the moment it's made: who made the call (human or agent), the finding that
            prompted it, and what it was expected to cost or earn. 30–90 days later an assessor returns a verdict —
            worked, didn't, or too early — with the measured impact next to the estimate that justified the call.
            Rows link back to the finding they answered, so the whole thread is one click away.
          </>
        }
      />

      <StatsRow />

      <div className="tabs">
        <button className={`tab${view === 'ledger' ? ' active' : ''}`} onClick={() => setView('ledger')}>Ledger</button>
        <button className={`tab${view === 'pl' ? ' active' : ''}`} onClick={() => setView('pl')}>P&amp;L impact · FP&amp;A</button>
      </div>

      {view === 'ledger' && (
        <>
          <div className="filters">
            {functionFilters.map((f) => (
              <button key={f.key} className={`fchip${fn === f.key ? ' on' : ''}`} onClick={() => setFn(f.key)}>{f.label}</button>
            ))}
            {verdictFilters.map((f) => (
              <button
                key={f.key}
                className={`fchip${verdict === f.key ? ' on' : ''}`}
                onClick={() => setVerdict(verdict === f.key ? 'all' : f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div data-tour="ledger-table">
            <DecisionsTable filters={{ function: fn, verdict }} />
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
            Verdicts are confirmed against measured KPIs 30–90 days after the decision. The ledger is the audit trail your board and your buyers can trust.
          </div>
        </>
      )}

      {view === 'pl' && (
        <>
          <PlStatement />
          <div className="sec-head" style={{ padding: '0 0 12px' }}>
            <h3>Loop funnel by P&amp;L line</h3>
          </div>
          <PlImpactTable />
        </>
      )}
    </section>
  );
}
