import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { personaLabel } from '../CommandCenter/personas';
import { useKpiBrain } from '../../api/shadowOrg';
import type { AgentCatalogEntry } from '../../api/types';

const statusTone = { draft: 'gray', live: 'green', paused: 'amber', archived: 'gray' } as const;

export function AgentCard({ worker }: { worker: AgentCatalogEntry }) {
  const { data: brain } = useKpiBrain();
  // The card is itself a link, so mandate names render as plain pills here;
  // the detail page carries the deep links into the Operating Picture.
  const mandateNames = (worker.mandateIds ?? [])
    .map((id) => brain?.nodes.find((n) => n.id === id)?.name)
    .filter((n): n is string => !!n);

  return (
    <Link to={`/insights/agents/${worker.agentId}`} className="card agent-card">
      <div className="ac-name">{worker.name}</div>
      <div className="ac-desc">{worker.description}</div>
      <div className="ac-tags">
        <Pill tone="indigo">{worker.function}</Pill>
        <Pill tone="teal">{personaLabel(worker.persona)}</Pill>
        <Pill tone={statusTone[worker.catalogStatus]}>{worker.catalogStatus}</Pill>
        <Pill tone={worker.creationPath === 'studio' ? 'teal' : 'gray'}>{worker.creationPath === 'studio' ? 'Studio' : 'Chat'}</Pill>
        {mandateNames.map((name) => <Pill key={name} tone="gray">⌖ {name}</Pill>)}
      </div>
      <div className="ac-stats">
        <div className="ac-stat"><div className="l">ROI to date</div><div className="v">{worker.roiToDate.value}</div></div>
        <div className="ac-stat"><div className="l">Token cost</div><div className="v">{worker.tokenCostToDate.estCost}</div></div>
        <div className="ac-stat"><div className="l">Runs</div><div className="v">{worker.runsCount}</div></div>
      </div>
    </Link>
  );
}
