import { useLeaderboard } from '../../api/people';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Avatar } from '../../components/shared/Avatar';
import { Pill } from '../../components/shared/Pill';
import { Sparkline } from '../../components/shared/Sparkline';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';

export function LeaderboardTable() {
  const { persona, scope } = useEffectiveLens();
  const { data, isLoading, isError } = useLeaderboard('all', persona, scope);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="t">
        <thead>
          <tr>
            <th>Member</th><th>Type</th><th>Actions closed</th><th>On-time</th><th>Decision win rate</th><th>Time saved</th><th>Trend</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <tr><td colSpan={7}><Loading /></td></tr>}
          {isError && <tr><td colSpan={7}><ErrorMessage /></td></tr>}
          {data?.map((row) => (
            <tr className="row-h" key={row.id}>
              <td>
                <span className="human">
                  <Avatar initials={row.initials} background={row.avatarBg} size={24} fontSize={9} />
                  {row.name}
                </span>
              </td>
              <td><Pill tone={row.type === 'agent' ? 'indigo' : 'gray'}>{row.type === 'agent' ? 'Agent' : 'Human'}</Pill></td>
              <td><b>{row.actionsClosed}</b></td>
              <td><b className="up">{row.onTimePct}%</b></td>
              <td>{row.decisionWinRatePct}%</td>
              <td>{row.timeSaved}</td>
              <td><Sparkline points={row.trend} color={row.trendColor} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
