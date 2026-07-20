import { usePendingDecisions } from '../../api/dashboard';
import { useDecisionStats } from '../../api/decisions';
import { useFindings } from '../../api/shadowOrg';
import type { Persona, RoleScope } from '../../api/types';

const SLA_AT_RISK_HOURS = 8;

// Three numbers, not five — and the first one is the same count the queue
// below shows, so "waiting on you" has exactly one source of truth.
//
// "Waiting on you" stays role-scoped even when the lens is widened to "+ their
// team": a leader's team queue is not their queue, and a CEO reading 25 here
// would stop believing the number. Team volume gets its own, deliberately
// differently-named stat.
export function TodayStats({ persona, scope }: { persona: Persona | 'all'; scope?: RoleScope }) {
  const teamScope = scope === 'team' && persona !== 'all';
  const { data: findings } = useFindings({ persona, scope: 'role', status: 'open' });
  const { data: decisions } = usePendingDecisions(persona, 'role');
  // With hierarchy off this resolves to the same query key as above, so it
  // costs no extra request; the value only renders when the lens is widened.
  const { data: teamFindings } = useFindings({ persona, scope: teamScope ? 'team' : 'role', status: 'open' });
  const { data: stats } = useDecisionStats();

  const waiting = (findings?.length ?? 0) + (decisions?.length ?? 0);
  const atRisk = findings?.filter((f) => f.slaHoursRemaining <= SLA_AT_RISK_HOURS).length ?? 0;
  const below = teamScope ? (teamFindings ?? []).filter((f) => f.persona !== persona) : [];
  const belowBreached = below.filter((f) => f.slaHoursRemaining <= 0).length;

  return (
    <div className="grid kpis" style={{ gridTemplateColumns: `repeat(${teamScope ? 4 : 3}, 1fr)` }}>
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
      {teamScope && (
        <div className="card kpi">
          <div className="k-label">Open below you</div>
          <div className="k-val">{below.length}</div>
          <div className={`k-delta ${belowBreached ? 'down' : 'up'}`}>
            {belowBreached ? `${belowBreached} breached — escalating to you` : 'owned by your team, none breached'}
          </div>
        </div>
      )}
      <div className="card kpi">
        <div className="k-label">Measured impact · to date</div>
        <div className="k-val">{stats?.measuredImpact.value ?? '—'}</div>
        <div className={`k-delta ${stats?.measuredImpact.delta.direction ?? 'flat'}`}>{stats?.measuredImpact.delta.label ?? ''}</div>
      </div>
    </div>
  );
}
