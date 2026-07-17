import { useDecisionStats } from '../../api/decisions';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';

export function StatsRow() {
  const { data, isLoading, isError } = useDecisionStats();

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorMessage />;

  return (
    <div className="grid dstats">
      <div className="card kpi">
        <div className="k-label">Decisions on the ledger</div>
        <div className="k-val">{data.tracked.value}</div>
        <div className={`k-delta ${data.tracked.delta.direction}`}>{data.tracked.delta.label}</div>
      </div>
      <div className="card kpi">
        <div className="k-label">Decision win rate</div>
        <div className="k-val">{data.winRate.value}</div>
        <div className={`k-delta ${data.winRate.delta.direction}`}>{data.winRate.delta.label}</div>
      </div>
      <div className="card kpi">
        <div className="k-label">Median time-to-decision</div>
        <div className="k-val">{data.medianTimeToDecision.value}</div>
        <div className={`k-delta ${data.medianTimeToDecision.delta.direction}`}>{data.medianTimeToDecision.delta.label}</div>
      </div>
      <div className="card kpi">
        <div className="k-label">Measured impact · to date</div>
        <div className="k-val">{data.measuredImpact.value}</div>
        <div className={`k-delta ${data.measuredImpact.delta.direction}`}>{data.measuredImpact.delta.label}</div>
      </div>
    </div>
  );
}
