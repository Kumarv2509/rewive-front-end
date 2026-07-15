import { usePendingDecisions } from '../../api/dashboard';
import { useDecisionStats } from '../../api/decisions';
import { useFindings } from '../../api/shadowOrg';
import type { Persona, RoleScope } from '../../api/types';

const SLA_AT_RISK_HOURS = 8;

// Three numbers, not five — and the first one is the same count the queue
// below shows, so "waiting on you" has exactly one source of truth.
export function TodayStats({ persona, scope }: { persona: Persona | 'all'; scope?: RoleScope }) {
  const { data: findings } = useFindings({ persona, scope, status: 'open' });
  const { data: decisions } = usePendingDecisions(persona, scope);
  const { data: stats } = useDecisionStats();

  const waiting = (findings?.length ?? 0) + (decisions?.length ?? 0);
  const atRisk = findings?.filter((f) => f.slaHoursRemaining <= SLA_AT_RISK_HOURS).length ?? 0;

  return (
    <div className="grid kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <div className="card kpi">
        <div className="k-label">Waiting on you</div>
        <div className="k-val">{waiting}</div>
        <div className="k-delta" style={{ color: 'var(--ink-3)' }}>findings + approvals · one queue</div>
      </div>
      <div className="card kpi">
        <div className="k-label">SLA at risk</div>
        <div className="k-val">{atRisk}</div>
        <div className={`k-delta ${atRisk ? 'down' : 'up'}`}>
          {atRisk ? `under ${SLA_AT_RISK_HOURS}h before escalation` : 'no clocks near escalation'}
        </div>
      </div>
      <div className="card kpi">
        <div className="k-label">Measured impact · QTD</div>
        <div className="k-val">{stats?.measuredImpactQtd.value ?? '—'}</div>
        <div className={`k-delta ${stats?.measuredImpactQtd.delta.direction ?? 'flat'}`}>{stats?.measuredImpactQtd.delta.label ?? ''}</div>
      </div>
    </div>
  );
}
