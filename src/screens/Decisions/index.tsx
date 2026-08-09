import { useState } from 'react';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatsRow } from './StatsRow';
import { HalfYearReview } from './HalfYearReview';
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
  const { persona, scope } = useEffectiveLens();
  const [fn, setFn] = useState<DecisionLedgerFilters['function']>('all');
  const [verdict, setVerdict] = useState<DecisionLedgerFilters['verdict']>('all');
  const [view, setView] = useState<'ledger' | 'pl'>('ledger');

  return (
    <section className="screen">
      <PageHeader
        title="Decision Ledger"
        subtitle="Every decision, who made it, what it cost or earned — and, 30–90 days later, whether it worked. Rows link back to the finding they answered."
      />

      <StatsRow persona={persona} scope={scope} />

      <div className="tabs">
        <button className={`tab${view === 'ledger' ? ' active' : ''}`} onClick={() => setView('ledger')}>Ledger</button>
        <button className={`tab${view === 'pl' ? ' active' : ''}`} onClick={() => setView('pl')}>P&amp;L impact · FP&amp;A</button>
      </div>

      {view === 'ledger' && (
        <>
          <HalfYearReview persona={persona} scope={scope} />
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
            <DecisionsTable filters={{ function: fn, verdict, persona, scope }} />
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
