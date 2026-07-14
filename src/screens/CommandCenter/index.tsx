import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useDashboardSummary } from '../../api/dashboard';
import { hasSeenGuide } from '../Guide/seen';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { usePersonaLens } from '../../components/layout/personaLens';
import { TodayStats } from './TodayStats';
import { UnifiedQueue } from './UnifiedQueue';
import { PulseList } from './PulseList';
import { LiveRunsList } from './LiveRunsList';
import { TopPerformerCard } from './TopPerformerCard';
import { PERSONA_LABEL } from './personas';
import type { Persona } from '../../api/types';

export function CommandCenterScreen() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { lens } = usePersonaLens();

  // First visit: open the step-by-step tour instead. Only here (the entry
  // screen), so demo deep links into other screens are never hijacked.
  useEffect(() => {
    if (!hasSeenGuide()) navigate('/guide', { replace: true });
  }, [navigate]);

  // Non-admins are locked to their role's persona; admins follow the global lens.
  const persona: Persona | 'all' = currentUser && !currentUser.isAdmin ? currentUser.defaultPersona : lens;

  const { data: summary, isLoading, isError } = useDashboardSummary(persona);

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
          <TodayStats persona={persona} />
        </>
      )}

      <div className="grid home-cols">
        <div>
          {/* THE queue — the only "waiting on you" list and count in the product */}
          <UnifiedQueue persona={persona} />
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
