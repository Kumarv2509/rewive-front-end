import { useState } from 'react';
import { SuggestedSignalsList } from './SuggestedSignalsList';
import { ReviewQueue } from './ReviewQueue';
import { TicketBoard } from './TicketBoard';
import { DatasetCoverageView } from './DatasetCoverageView';

type Tab = 'suggested' | 'review' | 'tickets';

export function SignalStudioScreen() {
  const [tab, setTab] = useState<Tab>('suggested');

  return (
    <section className="screen" style={{ maxWidth: 1280 }}>
      <h1 className="page">Signal Studio</h1>
      <div className="sub">Derailers, laggards, cost drainers, and revenue leakage surfaced from your data — approved by committee, tracked through to resolution.</div>

      <DatasetCoverageView />

      <div className="tabs">
        <button className={`tab${tab === 'suggested' ? ' active' : ''}`} onClick={() => setTab('suggested')}>Suggested signals</button>
        <button className={`tab${tab === 'review' ? ' active' : ''}`} onClick={() => setTab('review')}>Committee review</button>
        <button className={`tab${tab === 'tickets' ? ' active' : ''}`} onClick={() => setTab('tickets')}>KPI tickets</button>
      </div>

      {tab === 'suggested' && <SuggestedSignalsList />}
      {tab === 'review' && <ReviewQueue />}
      {tab === 'tickets' && <TicketBoard />}
    </section>
  );
}
