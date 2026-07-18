import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { personaLabel } from '../CommandCenter/personas';
import { useKpiBrain } from '../../api/shadowOrg';
import type { AgentCatalogEntry } from '../../api/types';

const statusTone = { draft: 'gray', live: 'green', paused: 'amber', archived: 'gray' } as const;

export function AgentCard({ agent }: { agent: AgentCatalogEntry }) {
  const { data: brain } = useKpiBrain();
  // The card is itself a link, so mandate names render as plain pills here;
  // the detail page carries the deep links into the Operating Picture.
  const mandateNames = (agent.mandateIds ?? [])
    .map((id) => brain?.nodes.find((n) => n.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <Link to={`/insights/agents/${agent.agentId}`} className="card agent-card">
      <div className="ac-name">{agent.name}</div>
      <div className="ac-desc">{agent.description}</div>
      <div className="ac-tags">
        <Pill tone="indigo">{agent.function}</Pill>
        <Pill tone="teal">{personaLabel(agent.persona)}</Pill>
        <Pill tone={statusTone[agent.catalogStatus]}>{agent.catalogStatus}</Pill>
        <Pill tone={agent.creationPath === 'studio' ? 'teal' : 'gray'}>{agent.creationPath === 'studio' ? 'Studio' : 'Chat'}</Pill>
        {mandateNames.map((name) => <Pill key={name} tone="gray">⌖ {name}</Pill>)}
      </div>
      <div className="ac-stats">
        <div className="ac-stat"><div className="l">ROI to date</div><div className="v">{agent.roiToDate.value}</div></div>
        <div className="ac-stat"><div className="l">Token cost</div><div className="v">{agent.tokenCostToDate.estCost}</div></div>
        <div className="ac-stat"><div className="l">Runs</div><div className="v">{agent.runsCount}</div></div>
      </div>
    </Link>
  );
}
