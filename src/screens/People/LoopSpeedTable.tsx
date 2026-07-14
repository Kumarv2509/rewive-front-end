import { useLoopSpeed } from '../../api/people';
import { Avatar } from '../../components/shared/Avatar';
import { Pill } from '../../components/shared/Pill';
import { Sparkline } from '../../components/shared/Sparkline';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';

function windowColor(pct: number) {
  if (pct >= 70) return 'var(--green)';
  if (pct >= 50) return 'var(--amber)';
  return 'var(--red)';
}

export function LoopSpeedTable() {
  const { data, isLoading, isError } = useLoopSpeed();

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="t">
        <thead>
          <tr>
            <th>Mandate</th><th>Owner</th><th>Counterpart</th><th>Findings · 90d</th><th>Time to decide</th><th>Time to close</th><th>Closed in window</th><th>Close-time trend</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <tr><td colSpan={8}><Loading /></td></tr>}
          {isError && <tr><td colSpan={8}><ErrorMessage /></td></tr>}
          {data?.map((row) => (
            <tr className="row-h" key={row.id}>
              <td>
                <div style={{ fontWeight: 600 }}>{row.mandate}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{row.stream}</div>
              </td>
              <td>
                <span className="human">
                  <Avatar initials={row.owner.initials} background={row.owner.avatarBg} size={24} fontSize={9} />
                  {row.owner.name}
                </span>
              </td>
              <td><Pill tone="indigo">{row.counterpart}</Pill></td>
              <td><b>{row.findings90d}</b></td>
              <td>{row.medianTimeToDecide}</td>
              <td><b>{row.medianTimeToClose}</b></td>
              <td><b style={{ color: windowColor(row.closedInWindowPct) }}>{row.closedInWindowPct}%</b></td>
              <td><Sparkline points={row.trend} color={row.trendColor} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
