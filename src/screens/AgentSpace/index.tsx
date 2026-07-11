import { useState } from 'react';
import { FilterBar } from './FilterBar';
import { AgentGrid } from './AgentGrid';
import type { AgentCatalogFilters } from '../../api/types';

export function AgentSpaceScreen() {
  const [filters, setFilters] = useState<AgentCatalogFilters>({ status: 'all', agentType: 'all' });

  return (
    <section className="screen">
      <h1 className="page">Agent Space</h1>
      <div className="sub">Every agent running for your operating context — with ROI and token cost tracked alongside execution.</div>

      <FilterBar filters={filters} onChange={setFilters} />
      <AgentGrid filters={filters} />
    </section>
  );
}
