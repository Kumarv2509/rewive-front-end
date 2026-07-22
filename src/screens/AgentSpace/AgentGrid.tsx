import { useAgentCatalog } from '../../api/agentSpace';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { AgentCard } from './AgentCard';
import type { AgentCatalogFilters } from '../../api/types';

export function AgentGrid({ filters }: { filters: AgentCatalogFilters }) {
  const { data, isLoading, isError } = useAgentCatalog(filters);

  if (isLoading) return <Loading label="Loading workers…" />;
  if (isError) return <ErrorMessage />;
  if (!data?.length) return <div className="state-msg">No workers match these filters.</div>;

  return (
    <div className="grid agent-grid">
      {data.map((worker) => <AgentCard worker={worker} key={worker.agentId} />)}
    </div>
  );
}
