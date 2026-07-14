// The on-screen spotlight tour: the same narrative as /guide, but walked
// through the live app — each step navigates to a screen and highlights the
// real element it explains via a [data-tour] anchor.
export interface TourStep {
  route: string; // screen the step lives on
  target: string | null; // [data-tour] anchor on that screen; null = centered card
  where: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: '/command',
    target: 'cc-briefing',
    where: 'Operate · Command Center',
    title: 'Start your day here',
    body: 'The greeting is your morning briefing — what Rewive executed since yesterday and how many calls are waiting on you. Admins can switch the persona lens: store manager, CFO, or operations head.',
  },
  {
    route: '/command',
    target: 'cc-findings',
    where: 'Operate · Command Center',
    title: 'Findings — waiting on you',
    body: 'Anything in this list is your first job of the day: a counterpart\'s case that a number drifted from its mandate, waiting on your call. The pill is the SLA clock.',
  },
  {
    route: '/operate/findings',
    target: 'findings-open',
    where: 'Operate · Findings',
    title: 'Every finding demands one answer',
    body: 'Unanswered findings escalate up the chain of counterparts when the SLA runs out. Open one and make the call: Accept (set an exit condition), Act (opens a solution design), Acknowledge (park it on a trip-wire), or Abandon (your reason tunes the counterpart).',
  },
  {
    route: '/operate/closure',
    target: 'closure-exit',
    where: 'Operate · Closure',
    title: 'Nothing is "done" until the number is back',
    body: 'Accepted findings live here as exit conditions with progress toward target. The counterpart keeps watching either way — regressed conditions and tripped wires resurface on their own.',
  },
  {
    route: '/operate/decisions',
    target: 'ledger-table',
    where: 'Operate · Decision Ledger',
    title: 'The memory of judgment',
    body: 'Every decision is recorded — who made it (human or agent), what finding prompted it, what it cost or earned. Later an assessor returns a verdict next to the estimate that justified the call: worked, didn\'t, or too early.',
  },
  {
    route: '/operate/counterparts',
    target: 'counterpart-grid',
    where: 'Operate · Counterparts',
    title: 'Every mandate, held twice',
    body: 'One agent per function, plus an org-level chief watching the intents. Each card shows its human, open findings, SLA breaches, and a temperament dial from quiet to hair-trigger. A "needs you" pill means someone is not answering.',
  },
  {
    route: '/build/picture',
    target: 'picture-map',
    where: 'Foundation · Operating Picture',
    title: 'The map it all runs on',
    body: 'Intents at the top, the mandates that carry them, the senses that verify them. This is what the counterparts reason over — a finding on any node traces its impact up to the intent it threatens.',
  },
  {
    route: '/insights/people',
    target: 'loop-speed',
    where: 'Insights · Performance',
    title: 'Where the loop closes fastest',
    body: 'Every mandate, its owner, its counterpart, and how quickly drift comes back to target — time to decide, time to close, and the share of loops closed inside the exit condition\'s window.',
  },
  {
    route: '/command',
    target: null,
    where: 'That\'s the whole system',
    title: 'Nothing drifts unanswered',
    body: 'Sense → Find → Decide → Act → Close. Your counterparts are already watching — answer what they bring you, and let the loop close.',
  },
];
