import { useState } from 'react';
import { StatsRow } from './StatsRow';
import { DecisionsTable } from './DecisionsTable';
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

  return (
    <section className="screen">
      <h1 className="page">Decision Ledger</h1>
      <div className="sub">The company's memory of judgment — every decision, who made it, what it cost or earned, and whether it worked.</div>

      <StatsRow />

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
    </section>
  );
}
