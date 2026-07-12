import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useDashboardSummary } from '../../api/dashboard';
import { hasSeenGuide } from '../Guide/seen';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { KpiRow } from './KpiRow';
import { DecisionsList } from './DecisionsList';
import { FindingsList } from './FindingsList';
import { PulseList } from './PulseList';
import { LiveRunsList } from './LiveRunsList';
import { TopPerformerCard } from './TopPerformerCard';
import { PersonaSwitcher } from './PersonaSwitcher';
import { PERSONA_LABEL } from './personas';
import type { Persona } from '../../api/types';

export function CommandCenterScreen() {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const [personaOverride, setPersonaOverride] = useState<Persona | 'all' | null>(null);

  // First visit: open the step-by-step tour instead. Only here (the entry
  // screen), so demo deep links into other screens are never hijacked.
  useEffect(() => {
    if (!hasSeenGuide()) navigate('/guide', { replace: true });
  }, [navigate]);

  // Non-admins are locked to their role's persona; admins default to "all" until they pick one.
  const persona: Persona | 'all' =
    currentUser && !currentUser.isAdmin ? currentUser.defaultPersona : (personaOverride ?? 'all');

  const { data: summary, isLoading, isError } = useDashboardSummary(persona);

  return (
    <section className="screen">
      {currentUser && <PersonaSwitcher currentUser={currentUser} persona={persona} onChange={setPersonaOverride} />}

      {isLoading && <Loading label="Loading dashboard…" />}
      {isError && <ErrorMessage message="Couldn't load dashboard summary." />}
      {summary && (
        <>
          <h1 className="page">Good morning, {summary.greetingName}</h1>
          <div className="sub">
            {persona === 'all' ? (
              <span dangerouslySetInnerHTML={{ __html: summary.summarySentence }} />
            ) : (
              <>Here's what needs the {PERSONA_LABEL[persona]} lens today.</>
            )}
          </div>
          <KpiRow summary={summary} />
        </>
      )}

      <div className="grid home-cols">
        <div>
          {/* Obligations first: findings waiting on a disposition, then pending decisions */}
          <FindingsList persona={persona} />
          <DecisionsList persona={persona} />
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
