import type { DashboardResponse } from '../../api/types';

export function KpiRow({ dashboard }: { dashboard: DashboardResponse }) {
  const actions = dashboard.agent_actions_today?.rows?.[0]?.action_count ?? 0;
  const pending = dashboard.analytics_agent_approvals?.rows?.length ?? 0;
  const processes = dashboard.process_count_today?.rows?.[0]?.process_count ?? 0;
  const wf = dashboard.workflow_execution_count_total?.rows?.[0];
  const liveCount = dashboard.live_runs_today?.rows?.length ?? 0;

  return (
    <div className="grid kpis">
      <div className="card kpi">
        <div className="k-label">Actions executed today</div>
        <div className="k-val">{actions}</div>
      </div>
      <div className="card kpi">
        <div className="k-label">Decisions pending</div>
        <div className="k-val">{pending}</div>
      </div>
      <div className="card kpi">
        <div className="k-label">Processes active now</div>
        <div className="k-val">{processes}</div>
      </div>
      <div className="card kpi">
        <div className="k-label">Live runs</div>
        <div className="k-val">{liveCount}</div>
      </div>
      <div className="card kpi">
        <div className="k-label">Total executions</div>
        <div className="k-val">{wf?.execution_count ?? 0}</div>
      </div>
    </div>
  );
}
