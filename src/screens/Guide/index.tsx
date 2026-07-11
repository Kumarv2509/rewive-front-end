import { Link } from 'react-router-dom';

// Static help content — a new user's first loop, step by step. No API data here;
// every step deep-links into the live screen it describes.
const STEPS: {
  n: number;
  title: string;
  where: string;
  to: string;
  what: string;
  doThis: string[];
}[] = [
  {
    n: 1,
    title: 'Start your day in the Command Center',
    where: 'Operate · Command Center',
    to: '/command',
    what: 'The greeting tells you what Rewive executed since yesterday and how many calls are waiting on you. Below it: findings waiting on a disposition, decisions pending, the live pulse, and runs in flight.',
    doThis: [
      'Read the summary sentence — it is your morning briefing.',
      'If you are an admin, switch the persona lens (Store manager / CFO / Operations head) to see the day through one role.',
      'Anything in "Findings — waiting on you" is your first job. Click one.',
    ],
  },
  {
    n: 2,
    title: 'Open a finding and read the case',
    where: 'Operate · Findings',
    to: '/operate/findings',
    what: 'A finding is what a counterpart raises when a number drifts from its mandate. Each one shows severity, the evidence behind it, an impact estimate, and an impact path tracing the drift all the way up to the company intent it threatens.',
    doThis: [
      'Check the SLA pill — findings escalate up the chain of counterparts if nobody answers in time.',
      'Follow the impact path to see which intent is at risk; "View in the Operating Picture" shows it on the map.',
      'Read the evidence before you decide — it is the counterpart\'s working, not just its conclusion.',
    ],
  },
  {
    n: 3,
    title: 'Make the call — one of four dispositions',
    where: 'On the finding',
    to: '/operate/findings',
    what: 'Every finding demands exactly one answer, and each answer instructs the system differently. Accept: it\'s real — set a measurable exit condition and the counterpart watches it until met. Act: fix it now — opens a solution design with tasks. Acknowledge: known issue — parked on a trip-wire that re-alerts if it worsens. Abandon: not real — requires a reason, and the reason tunes the counterpart.',
    doThis: [
      'If it is real but needs no project, Accept and set the exit condition.',
      'If it needs work, Act — you will land in a solution design (step 6).',
      'Not yours? "Not mine — escalate" sends it up the chain instead of letting it sit.',
    ],
  },
  {
    n: 4,
    title: 'Watch the loop stay open in Closure',
    where: 'Operate · Closure',
    to: '/operate/closure',
    what: 'Nothing is "done" until the number is back. Accepted findings live here as exit conditions with progress bars; acknowledged ones sit on their trip-wires. The counterpart keeps watching either way.',
    doThis: [
      'Track each exit condition\'s progress toward target.',
      'Only "Mark met · close loop" when the number is truly back — that is the whole point.',
      'Regressed conditions and tripped wires come back to the Command Center on their own.',
    ],
  },
  {
    n: 5,
    title: 'Check the Decision Ledger — the memory of judgment',
    where: 'Operate · Decision Ledger',
    to: '/operate/decisions',
    what: 'Every decision is recorded: who made it (human or agent), what finding prompted it, what it cost or earned. Later, an assessor returns with a verdict — worked, didn\'t work, or too early to tell — next to the estimate that justified the call.',
    doThis: [
      'Use the verdict filters to see which calls actually paid off.',
      'Each entry links back to its originating finding — the full trail is auditable.',
    ],
  },
  {
    n: 6,
    title: 'When you chose Act: the solution design',
    where: 'Reached from a finding\'s Act disposition',
    to: '/operate/findings',
    what: 'Act opens a solution design: the approach, the data needed, guardrails, and a task list — new agents to build, existing agents to reuse, human tasks. A validation agent reviews the plan (pros, cons, ROI) before it goes for approval. Approved tasks land in Tasks; agent builds continue in the studio.',
    doThis: [
      'You do not browse to the build screens — they come to you when a finding needs them.',
      'Track everything assigned to you or your team in Operate · Tasks.',
    ],
  },
  {
    n: 7,
    title: 'Meet your counterparts',
    where: 'Operate · Counterparts',
    to: '/operate/counterparts',
    what: 'One agent per function, plus an org-level chief of staff watching the intents. Every mandate is held twice — once by a person, once by its counterpart. Each card shows whose mandates it holds, open findings, SLA breaches, and a temperament dial from quiet to hair-trigger.',
    doThis: [
      'Expand "What it\'s flagging" to jump straight to a counterpart\'s open findings.',
      'A "needs you" pill means its findings are breaching SLA — someone is not answering.',
    ],
  },
  {
    n: 8,
    title: 'The Foundation: what everything runs on',
    where: 'Foundation area',
    to: '/build/picture',
    what: 'The Operating Picture is the map the counterparts reason over: intents at the top, the mandates that carry them, the senses (data feeds) that verify them. The Mandate Library is where a new company starts — pick the mandates that matter or import them from a planning tool. Data Connectors wire up the senses; a mandate without a sense is blind.',
    doThis: [
      'Switch industry from the Operating Picture header if you want to see another context.',
      'Counterparts petition for new nodes and edges here — approve or decline their proposals.',
    ],
  },
  {
    n: 9,
    title: 'Measure what is working in Insights',
    where: 'Insights area',
    to: '/insights/outcomes',
    what: 'Outcomes turns runs into scorecards, insights, and recommended actions. Performance shows where the loop closes fastest — mandates, owners, counterparts, and how quickly drift comes back to target. Agent Space lists every agent running for your context, with ROI and token cost side by side.',
    doThis: [
      'Assign or schedule the recommended actions on an outcome report.',
      'Use Agent Space to see what each agent costs against what it returns.',
    ],
  },
];

const LOOP = ['Sense', 'Find', 'Decide', 'Act', 'Close'];

export function GuideScreen() {
  return (
    <section className="screen" style={{ maxWidth: 860 }}>
      <h1 className="page">How to work in Rewive</h1>
      <div className="sub">
        Nothing drifts unanswered. Your counterparts watch the numbers and bring you findings; your job is to answer them
        and let the loop close. This is the whole system, step by step.
      </div>

      <div className="card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--ink-3)' }}>The loop</span>
        {LOOP.map((stage, i) => (
          <span key={stage} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: stage === 'Decide' ? 'var(--accent-deep)' : 'var(--ink)' }}>{stage}</span>
            {i < LOOP.length - 1 && <span style={{ color: 'var(--ink-3)' }}>→</span>}
          </span>
        ))}
        <span style={{ fontSize: 12, color: 'var(--ink-2)', marginLeft: 'auto' }}>You own one stage: Decide. The counterparts run the rest.</span>
      </div>

      {STEPS.map((s) => (
        <div key={s.n} className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, color: 'var(--accent-deep)', border: '1px solid var(--border)', borderRadius: 8, padding: '2px 8px', flexShrink: 0 }}>{s.n}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.where}</div>
            </div>
            <Link to={s.to} className="btn ghost sm" style={{ marginLeft: 'auto', flexShrink: 0 }}>Go there →</Link>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, margin: '8px 0 10px' }}>{s.what}</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {s.doThis.map((d) => (
              <li key={d} style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.55 }}>{d}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Want the story instead?</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>The landing page walks the same ideas as a narrative — the shift, the Operating Picture, the four dispositions.</div>
        </div>
        <Link to="/" className="btn primary sm">Read the story →</Link>
      </div>
    </section>
  );
}
