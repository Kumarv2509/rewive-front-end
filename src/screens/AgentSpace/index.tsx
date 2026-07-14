import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Intro } from '../../components/shared/Intro';
import { SectionTabs, AGENTS_TABS } from '../../components/shared/SectionTabs';
import { FilterBar } from './FilterBar';
import { AgentGrid } from './AgentGrid';
import type { AgentCatalogFilters } from '../../api/types';

// The workforce: agents that execute, next to the counterparts that watch.
// Agent creation lives here (and in a finding's Act flow) — not as a global CTA.
export function AgentSpaceScreen() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AgentCatalogFilters>({ status: 'all', agentType: 'all' });

  return (
    <section className="screen">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="page">Agents</h1>
          <Intro line="Every agent running for your operating context — with ROI and token cost tracked alongside execution." />
        </div>
        <button className="btn primary sm" style={{ flexShrink: 0 }} onClick={() => navigate('/build/create')}>
          + New agent
        </button>
      </div>
      <SectionTabs tabs={AGENTS_TABS} />

      <FilterBar filters={filters} onChange={setFilters} />
      <AgentGrid filters={filters} />
    </section>
  );
}
