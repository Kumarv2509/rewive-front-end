import { Link } from 'react-router-dom';
import { Avatar } from '../../components/shared/Avatar';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useDecisionLedger, type DecisionLedgerFilters } from '../../api/decisions';
import type { Verdict } from '../../api/types';

const verdictDisplay: Record<Verdict, { tone: 'green' | 'red' | 'amber'; label: string }> = {
  worked: { tone: 'green', label: '✓ Worked' },
  not_worked: { tone: 'red', label: "✗ Didn't work" },
  too_early: { tone: 'amber', label: '◷ Too early' },
};

export function DecisionsTable({ filters }: { filters: DecisionLedgerFilters }) {
  const { data, isLoading, isError } = useDecisionLedger(filters);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="t">
        <thead>
          <tr>
            <th>Decision</th><th>Made by</th><th>Informed by</th><th>Date</th><th>Verdict</th><th>Measured impact</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <tr><td colSpan={6}><Loading /></td></tr>}
          {isError && <tr><td colSpan={6}><ErrorMessage /></td></tr>}
          {data?.map((d) => (
            <tr className="row-h" key={d.id}>
              <td>
                <b>{d.title}</b>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{d.subtitle}</div>
                {d.assessorNote && (
                  <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4, maxWidth: 320 }}>
                    {d.assessorNote}
                    {d.originatingSignalId && (
                      <>
                        {' '}
                        <Link to={`/insights/signals/${d.originatingSignalId}`}>Closes the originating signal &rarr;</Link>
                      </>
                    )}
                  </div>
                )}
              </td>
              <td>
                {d.madeBy.type === 'human' ? (
                  <span className="human">
                    <Avatar initials={d.madeBy.initials ?? ''} background={d.madeBy.avatarBg ?? '#999'} size={22} fontSize={9} />
                    {d.madeBy.name}
                  </span>
                ) : (
                  <span className="agent-chip">{d.madeBy.name}</span>
                )}
              </td>
              <td>
                {d.informedBy.type === 'agent' ? (
                  <span className="agent-chip">{d.informedBy.name}</span>
                ) : (
                  <Pill tone="gray">{d.informedBy.name}</Pill>
                )}
              </td>
              <td>{d.date}</td>
              <td><Pill tone={verdictDisplay[d.verdict].tone}>{verdictDisplay[d.verdict].label}</Pill></td>
              <td className={d.measuredImpact.direction === 'up' ? 'up' : d.measuredImpact.direction === 'down' ? 'down' : ''} style={{ fontWeight: 700 }}>
                {d.measuredImpact.text}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
