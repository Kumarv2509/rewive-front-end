import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { PageHeader } from '../../components/shared/PageHeader';
import { SectionTabs, AGENTS_TABS } from '../../components/shared/SectionTabs';
import { FilterBar } from './FilterBar';
import { AgentGrid } from './AgentGrid';
import type { AgentCatalogFilters } from '../../api/types';

// The workforce: workers that execute, next to the agents that watch.
// Worker creation lives here (and in a finding's Act flow) — not as a global CTA.
export function AgentSpaceScreen() {
  const navigate = useNavigate();
  const { persona, scope } = useEffectiveLens();
  const [filters, setFilters] = useState<AgentCatalogFilters>({ status: 'all', agentType: 'all' });

  return (
    <section className="screen">
      <PageHeader
        title="Workforce"
        subtitle="Every worker running for your operating context — with ROI and token cost tracked alongside execution."
        actions={
          <button className="btn primary sm" style={{ flexShrink: 0 }} onClick={() => navigate('/build/create')}>
            + New worker
          </button>
        }
        tabs={<SectionTabs tabs={AGENTS_TABS} />}
      />

      <FilterBar filters={filters} onChange={setFilters} />
      <AgentGrid filters={{ ...filters, persona, scope }} />
    </section>
  );
}
