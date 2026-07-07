import { useDashboard } from '../../api/dashboard';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { KpiRow } from './KpiRow';
import { DecisionsList } from './DecisionsList';
import { PulseList } from './PulseList';
import { LiveRunsList } from './LiveRunsList';
import { TopPerformerCard } from './TopPerformerCard';

export function CommandCenterScreen() {
  const { data: dashboard, isLoading, isError } = useDashboard();

  return (
    <section className="screen">
      {isLoading && <Loading label="Loading dashboard…" />}
      {isError && <ErrorMessage message="Couldn't load dashboard." />}
      {dashboard && (
        <>
          <h1 className="page">Command Center</h1>
          <KpiRow dashboard={dashboard} />
        </>
      )}

      <div className="grid home-cols">
        <div>
          <DecisionsList dashboard={dashboard} />
          <PulseList dashboard={dashboard} />
        </div>
        <div>
          <LiveRunsList dashboard={dashboard} />
          <TopPerformerCard dashboard={dashboard} />
        </div>
      </div>
    </section>
  );
}
