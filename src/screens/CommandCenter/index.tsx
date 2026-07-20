import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from '../../api/dashboard';
import { hasSeenGuide } from '../Guide/seen';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Intro } from '../../components/shared/Intro';
import { TodayStats } from './TodayStats';
import { UnifiedQueue } from './UnifiedQueue';
import { PulseList } from './PulseList';
import { LiveRunsList } from './LiveRunsList';
import { TopPerformerCard } from './TopPerformerCard';
import { personaLabel } from './personas';

export function CommandCenterScreen() {
  const navigate = useNavigate();
  // Non-admins are locked to their role; hierarchy mode widens to their team.
  const { persona, scope, hierarchy } = useEffectiveLens();

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
                <>Here's what needs the {personaLabel(persona)} lens today.</>
              )}
            </div>
          </div>
          <Intro
            line="One queue for everything waiting on you — findings that need a call and approvals that need a click."
            more={
              <>
                “Waiting on you” is the only such count in the product, and it is always <b>your</b> call: even with the
                lens widened to your team, a subordinate's finding stays in their queue, not yours. Findings carry an
                SLA — leave one unanswered and it escalates to the role above. Everything here links to the thread
                where the decision gets made and recorded.
              </>
            }
            doThis={
              hierarchy
                ? [
                    <>Clear <b>Waiting on you</b> — it is only ever your own calls, so the number should reach zero most days.</>,
                    <>Watch <b>Open below you</b>. It is not your queue, but a breached item there is about to become one.</>,
                    <>Go to <b>Findings</b> for the roll-up of what each of your reports is carrying.</>,
                  ]
                : [
                    <>Work <b>Waiting on you</b> top down — findings first, since they are the ones on a clock.</>,
                    <>Answer each finding rather than letting it sit; silence escalates it to your manager.</>,
                    <>Scan <b>SLA at risk</b> before you stop for the day — those escalate first.</>,
                  ]
            }
          />
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
