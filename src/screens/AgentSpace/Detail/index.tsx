import { Link, useParams } from 'react-router-dom';
import { useAgentCatalogEntry } from '../../../api/agentSpace';
import { Avatar } from '../../../components/shared/Avatar';
import { Pill } from '../../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../../components/shared/StateMessage';
import { industryLabel } from '../industryLabels';
import { PERSONA_LABEL } from '../../CommandCenter/personas';

export function AgentDetailScreen() {
  const { agentId } = useParams();
  const { data, isLoading, isError } = useAgentCatalogEntry(agentId);

  if (isLoading) return <section className="screen"><Loading /></section>;
  if (isError || !data) return <section className="screen"><ErrorMessage message="Couldn't load this agent." /></section>;

  return (
    <section className="screen">
      <h1 className="page">{data.name}</h1>
      <div className="sub">{data.description}</div>

      <div className="card preview" style={{ maxWidth: 520 }}>
        <div className="ph">⚡ Agent detail <Pill tone={data.state === 'live' ? 'green' : 'gray'} style={{ marginLeft: 'auto' }}>{data.state}</Pill></div>
        <div className="pv-row"><span className="l">Function</span><span className="v">{data.function}</span></div>
        <div className="pv-row"><span className="l">Persona</span><span className="v">{PERSONA_LABEL[data.persona]}</span></div>
        <div className="pv-row"><span className="l">Industry</span><span className="v">{industryLabel[data.industry]}</span></div>
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
            <Link className="btn ghost sm" to={`/build/studio/${data.workflowId}`}>View workflow in Agent Studio →</Link>
          </div>
        )}
      </div>
    </section>
  );
}
