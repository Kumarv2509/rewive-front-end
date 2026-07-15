import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from '../../api/dashboard';
import { hasSeenGuide } from '../Guide/seen';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { ScopeBanner } from '../../components/shared/ScopeBanner';
import { TodayStats } from './TodayStats';
import { UnifiedQueue } from './UnifiedQueue';
import { PulseList } from './PulseList';
import { LiveRunsList } from './LiveRunsList';
import { TopPerformerCard } from './TopPerformerCard';
import { PERSONA_LABEL } from './personas';

export function CommandCenterScreen() {
  const navigate = useNavigate();
  // Non-admins are locked to their role; hierarchy mode widens to their team.
  const { persona, scope } = useEffectiveLens();

  // First visit: open the step-by-step tour instead. Only here (the entry
  // screen), so demo deep links into other screens are never hijacked.
  useEffect(() => {
    if (!hasSeenGuide()) navigate('/guide', { replace: true });
  }, [navigate]);

  const { data: summary, isLoading, isError } = useDashboardSummary();

  return (
    <section className="screen">
      {isLoading && <Loading label="Loading your day…" />}
      {isError && <ErrorMessage message="Couldn't load dashboard summary." />}
      {summary && (
        <>
          <div data-tour="cc-briefing">
            <h1 className="page">Good morning, {summary.greetingName}</h1>
            <div className="sub">
              {persona === 'all' ? (
                <span dangerouslySetInnerHTML={{ __html: summary.summarySentence }} />
              ) : (
                <>Here's what needs the {PERSONA_LABEL[persona]} lens today.</>
              )}
            </div>
          </div>
          <ScopeBanner />
          <TodayStats persona={persona} scope={scope} />
        </>
      )}

      <div className="grid home-cols">
        <div>
          {/* THE queue — the only "waiting on you" list and count in the product */}
          <UnifiedQueue persona={persona} scope={scope} />
          <PulseList />
        </div>
        <div>
          <LiveRunsList />
          <TopPerformerCard />
        </div>
      </div>
    </section>
  );
}
