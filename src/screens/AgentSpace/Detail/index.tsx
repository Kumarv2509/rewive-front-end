import { Link, useParams } from 'react-router-dom';
import { useAgentCatalogEntry } from '../../../api/agentSpace';
import { useKpiBrain } from '../../../api/shadowOrg';
import { Avatar } from '../../../components/shared/Avatar';
import { Pill } from '../../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../../components/shared/StateMessage';
import { industryLabel } from '../industryLabels';
import { personaLabel } from '../../CommandCenter/personas';

export function AgentDetailScreen() {
  const { agentId } = useParams();
  const { data, isLoading, isError } = useAgentCatalogEntry(agentId);
  const { data: brain } = useKpiBrain();

  if (isLoading) return <section className="screen"><Loading /></section>;
  if (isError || !data) return <section className="screen"><ErrorMessage message="Couldn't load this worker." /></section>;

  // The mandates this worker works, resolved against the Operating Picture.
  const mandates = (data.mandateIds ?? [])
    .map((id) => brain?.nodes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => !!n);

  return (
    <section className="screen">
      <h1 className="page">{data.name}</h1>
      <div className="sub">{data.description}</div>

      <div className="card preview" style={{ maxWidth: 520 }}>
        <div className="ph">⚡ Worker detail <Pill tone={data.state === 'live' ? 'green' : 'gray'} style={{ marginLeft: 'auto' }}>{data.state}</Pill></div>
        <div className="pv-row"><span className="l">Function</span><span className="v">{data.function}</span></div>
        <div className="pv-row"><span className="l">Persona</span><span className="v">{personaLabel(data.persona)}</span></div>
        <div className="pv-row"><span className="l">Industry</span><span className="v">{industryLabel[data.industry]}</span></div>
        {mandates.length > 0 && (
          <div className="pv-row">
            <span className="l">Mandates</span>
            <span className="v">
              {mandates.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ' · '}
                  <Link to={`/build/picture?focus=${m.id}`} title={m.definition} style={{ color: 'var(--accent-deep)', textDecoration: 'none', fontWeight: 600 }}>
                    {m.name}
                  </Link>
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="pv-row"><span className="l">Inputs</span><span className="v">{data.inputsSummary.join(', ')}</span></div>
        <div className="pv-row"><span className="l">Outputs</span><span className="v">{data.outputsSummary.join(', ')}</span></div>
        <div className="pv-row"><span className="l">Review gate</span><span className="v">{data.reviewGate}</span></div>
        <div className="pv-row">
          <span className="l">Owner</span>
          <span className="v"><span className="human"><Avatar initials={data.owner.initials} background={data.owner.avatarBg} size={20} fontSize={9} />{data.owner.name}</span></span>
        </div>
        <div className="pv-row"><span className="l">ROI to date</span><span className="v">{data.roiToDate.value}</span></div>
        <div className="pv-row"><span className="l">Token cost</span><span className="v">{data.tokenCostToDate.estCost} ({data.tokenCostToDate.tokens.toLocaleString()} tokens)</span></div>
        <div className="pv-row"><span className="l">Runs</span><span className="v">{data.runsCount} · last {data.lastRunAt ?? 'never'}</span></div>
        {data.workflowId && (
          <div className="pv-foot">
            <Link className="btn ghost sm" to={`/build/studio/${data.workflowId}`}>View workflow in Worker Studio →</Link>
          </div>
        )}
      </div>
    </section>
  );
}
