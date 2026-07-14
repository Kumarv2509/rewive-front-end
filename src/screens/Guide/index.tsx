import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { markGuideSeen } from './seen';
import { startTour } from '../../components/tour/store';

// Static help content — a new user's first loop as a full-screen intro scroller
// (mobile-onboarding style: one step per screen, snap scrolling, dots, skip).
// Every step deep-links into the live screen it describes.
const STEPS: {
  title: string;
  where: string;
  to: string;
  cta: string;
  what: string;
  doThis: string[];
}[] = [
  {
    title: 'Start your day in the Command Center',
    where: 'Operate · Command Center',
    to: '/command',
    cta: 'Open the Command Center',
    what: 'The greeting tells you what Rewive executed since yesterday and how many calls are waiting on you. Below it: findings waiting on a disposition, decisions pending, the live pulse, and runs in flight.',
    doThis: [
      'Read the summary sentence — it is your morning briefing.',
      'Admins can switch the persona lens: Store manager, CFO, or Operations head.',
      'Anything under "Findings — waiting on you" is your first job. Click one.',
    ],
  },
  {
    title: 'Open a finding and read the case',
    where: 'Operate · Findings',
    to: '/operate/findings',
    cta: 'See the findings',
    what: 'A finding is what a counterpart raises when a number drifts from its mandate — with severity, evidence, an impact estimate, and an impact path tracing the drift up to the intent it threatens.',
    doThis: [
      'Check the SLA pill — unanswered findings escalate up the chain of counterparts.',
      'Follow the impact path to the intent at risk; view it on the Operating Picture.',
      'Read the evidence before you decide — the counterpart shows its working.',
    ],
  },
  {
    title: 'Make the call — four dispositions',
    where: 'On the finding',
    to: '/operate/findings',
    cta: 'Try it on a finding',
    what: 'Every finding demands exactly one answer. Accept: it\'s real — set an exit condition the counterpart watches until met. Act: fix it now — opens a solution design with tasks. Acknowledge: known — parked on a trip-wire. Abandon: not real — the reason you give tunes the counterpart.',
    doThis: [
      'Real but no project needed? Accept and set the exit condition.',
      'Needs work? Act — you land in a solution design.',
      'Not yours? "Not mine — escalate" sends it up the chain instead of letting it sit.',
    ],
  },
  {
    title: 'Watch the loop stay open in Closure',
    where: 'Operate · Closure',
    to: '/operate/closure',
    cta: 'Open Closure',
    what: 'Nothing is "done" until the number is back. Accepted findings live here as exit conditions with progress bars; acknowledged ones sit on their trip-wires. The counterpart keeps watching either way.',
    doThis: [
      'Track each exit condition\'s progress toward target.',
      'Only "Mark met · close loop" when the number is truly back.',
      'Regressed conditions and tripped wires resurface on their own.',
    ],
  },
  {
    title: 'The Decision Ledger — the memory of judgment',
    where: 'Operate · Decision Ledger',
    to: '/operate/decisions',
    cta: 'Open the ledger',
    what: 'Every decision is recorded: who made it (human or agent), what finding prompted it, what it cost or earned. Later an assessor returns a verdict — worked, didn\'t, or too early — next to the estimate that justified the call.',
    doThis: [
      'Filter by verdict to see which calls actually paid off.',
      'Each entry links back to its originating finding — the trail is auditable.',
    ],
  },
  {
    title: 'When you chose Act: the solution design',
    where: 'Reached from a finding\'s Act disposition',
    to: '/operate/tasks',
    cta: 'See your tasks',
    what: 'Act opens a solution design: approach, data needed, guardrails, and a task list — new agents to build, existing agents to reuse, human tasks. A validation agent reviews the plan before approval; agent builds continue in the studio.',
    doThis: [
      'You never browse to the build screens — they come to you when a finding needs them.',
      'Everything assigned to you or your team lands in Operate · Tasks.',
    ],
  },
  {
    title: 'Meet your counterparts',
    where: 'Operate · Counterparts',
    to: '/operate/counterparts',
    cta: 'Meet them',
    what: 'One agent per function, plus an org-level chief of staff watching the intents. Every mandate is held twice — once by a person, once by its counterpart. Each card shows open findings, SLA breaches, and a temperament dial from quiet to hair-trigger.',
    doThis: [
      'Expand "What it\'s flagging" to jump straight to a counterpart\'s open findings.',
      'A "needs you" pill means findings are breaching SLA — someone is not answering.',
    ],
  },
  {
    title: 'The Foundation: what everything runs on',
    where: 'Foundation area',
    to: '/build/picture',
    cta: 'Open the Operating Picture',
    what: 'The Operating Picture is the map the counterparts reason over: intents, the mandates that carry them, the senses that verify them. The Mandate Library is where a new company starts; Data Connectors wire up the senses — a mandate without a sense is blind.',
    doThis: [
      'Switch industry from the Operating Picture header to see another context.',
      'Counterparts petition for new nodes and edges — approve or decline their proposals.',
    ],
  },
  {
    title: 'Measure what is working in Insights',
    where: 'Insights area',
    to: '/insights/outcomes',
    cta: 'Open Insights',
    what: 'Outcomes turns runs into scorecards and recommended actions. Performance shows where the loop closes fastest. Agent Space lists every agent running for your context, ROI and token cost side by side.',
    doThis: [
      'Assign or schedule the recommended actions on an outcome report.',
      'Use Agent Space to weigh what each agent costs against what it returns.',
    ],
  },
];

const LOOP = ['Sense', 'Find', 'Decide', 'Act', 'Close'];
const SLIDE_COUNT = STEPS.length + 2; // intro + steps + finale

const css = `
.gd{position:fixed;inset:0;z-index:60;background:#07070F;color:#F1F1F7;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
.gd::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(1100px 720px at 82% -8%,rgba(139,92,246,.20),transparent 58%),
             radial-gradient(900px 640px at -12% 22%,rgba(45,212,191,.08),transparent 55%),
             radial-gradient(1000px 720px at 50% 118%,rgba(99,102,241,.16),transparent 60%)}
.gd-top{position:absolute;top:0;left:0;right:0;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:18px 26px}
.gd-brand{display:flex;align-items:center;gap:10px}
.gd-brand .mk{width:28px;height:28px;border-radius:8px;background:linear-gradient(120deg,#6366F1,#8B5CF6,#A855F7);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:14px}
.gd-brand .nm{font-weight:700;font-size:14px;letter-spacing:-.2px}
.gd-skip{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.74rem;letter-spacing:.06em;color:#F1F1F7;text-decoration:none;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.045);border-radius:99px;padding:8px 16px;cursor:pointer;transition:background .2s}
.gd-skip:hover{background:rgba(255,255,255,.1)}
.gd-scroll{position:absolute;inset:0;overflow-y:auto;scroll-snap-type:y mandatory;scroll-behavior:smooth;z-index:1}
.gd-slide{height:100%;scroll-snap-align:start;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center;padding:72px 24px 84px}
.gd-inner{max-width:640px;width:100%}
.gd-eyebrow{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#63678B;margin-bottom:14px}
.gd-n{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.78rem;color:#A855F7;border:1px solid rgba(255,255,255,.16);border-radius:99px;padding:5px 13px;display:inline-block;margin-bottom:18px}
.gd h1{font-size:clamp(2rem,5vw,3.2rem);font-weight:700;letter-spacing:-.02em;line-height:1.1;margin:0 0 18px;text-wrap:balance}
.gd h2{font-size:clamp(1.5rem,3.4vw,2.2rem);font-weight:700;letter-spacing:-.02em;line-height:1.15;margin:0 0 14px;text-wrap:balance}
.gd .grad{background:linear-gradient(120deg,#6366F1,#8B5CF6,#A855F7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.gd-what{font-size:clamp(.95rem,1.4vw,1.08rem);color:#A6A9C8;line-height:1.65;margin:0 0 18px}
.gd-do{list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:9px}
.gd-do li{display:flex;gap:11px;align-items:flex-start;font-size:.92rem;line-height:1.55;color:#F1F1F7}
.gd-do li .m{color:#2DD4BF;font-family:ui-monospace,monospace;flex-shrink:0;margin-top:1px}
.gd-cta{display:inline-flex;align-items:center;gap:8px;font-size:.92rem;font-weight:600;text-decoration:none;color:#fff;background:linear-gradient(120deg,#6366F1,#8B5CF6,#A855F7);border-radius:12px;padding:12px 22px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 0 30px rgba(124,99,255,.35);transition:filter .2s}
.gd-cta:hover{filter:brightness(1.1)}
.gd-ghost{display:inline-flex;align-items:center;gap:8px;font-size:.92rem;font-weight:600;text-decoration:none;color:#F1F1F7;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.045);border-radius:12px;padding:12px 22px;transition:background .2s}
.gd-ghost:hover{background:rgba(255,255,255,.1)}
.gd-loopstrip{display:flex;flex-wrap:wrap;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);border-radius:14px;padding:14px 18px;margin-bottom:26px;backdrop-filter:blur(14px)}
.gd-loopstrip .st{font-weight:600;font-size:.95rem}
.gd-loopstrip .st.you{color:#2DD4BF}
.gd-loopstrip .arr{color:#63678B;font-family:ui-monospace,monospace;font-size:.8rem}
.gd-loopnote{font-size:.84rem;color:#A6A9C8;width:100%;margin-top:2px}
.gd-dots{position:absolute;right:22px;top:50%;transform:translateY(-50%);z-index:3;display:flex;flex-direction:column;gap:10px}
.gd-dot{width:9px;height:9px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:transparent;cursor:pointer;padding:0;transition:all .25s}
.gd-dot.on{background:linear-gradient(120deg,#8B5CF6,#A855F7);border-color:transparent;box-shadow:0 0 10px rgba(139,92,246,.8);transform:scale(1.3)}
.gd-next{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:9px;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#A6A9C8;background:rgba(11,11,22,.7);border:1px solid rgba(255,255,255,.14);border-radius:99px;padding:9px 18px;cursor:pointer;backdrop-filter:blur(12px);transition:all .2s}
.gd-next:hover{color:#F1F1F7;border-color:rgba(255,255,255,.3)}
.gd-next .chev{animation:gd-bob 1.8s ease-in-out infinite}
@keyframes gd-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}
@media(prefers-reduced-motion:reduce){.gd-scroll{scroll-behavior:auto}.gd-next .chev{animation:none}}
@media(max-width:640px){.gd-dots{right:10px}.gd-slide{padding:64px 18px 84px}}
`;

export function GuideScreen() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Shown once = seen; the auto-redirect never fires again.
  useEffect(() => {
    markGuideSeen();
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const slides = Array.from(root.querySelectorAll('.gd-slide'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(slides.indexOf(e.target));
        }
      },
      { root, threshold: 0.6 },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const goTo = (i: number) => {
    const root = scrollRef.current;
    const slide = root?.querySelectorAll('.gd-slide')[i];
    slide?.scrollIntoView({ behavior: 'smooth' });
  };

  const last = active === SLIDE_COUNT - 1;

  return (
    <div className="gd">
      <style>{css}</style>

      <div className="gd-top">
        <span className="gd-brand"><span className="mk">R</span><span className="nm">Rewive</span></span>
        <button className="gd-skip" onClick={() => navigate('/command')}>Skip · enter the app →</button>
      </div>

      <div className="gd-dots">
        {Array.from({ length: SLIDE_COUNT }, (_, i) => (
          <button key={i} className={`gd-dot${i === active ? ' on' : ''}`} aria-label={`Slide ${i + 1}`} onClick={() => goTo(i)} />
        ))}
      </div>

      {!last && (
        <button className="gd-next" onClick={() => goTo(active + 1)}>
          {active === 0 ? 'Start the tour' : `${active} / ${STEPS.length}`} <span className="chev">↓</span>
        </button>
      )}

      <div className="gd-scroll" ref={scrollRef}>
        {/* Intro slide */}
        <section className="gd-slide">
          <div className="gd-inner">
            <div className="gd-eyebrow">How to work in Rewive</div>
            <h1>Nothing drifts <span className="grad">unanswered</span> — here's your part in that.</h1>
            <div className="gd-loopstrip">
              {LOOP.map((stage, i) => (
                <span key={stage} style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                  <span className={`st${stage === 'Decide' ? ' you' : ''}`}>{stage}</span>
                  {i < LOOP.length - 1 && <span className="arr">→</span>}
                </span>
              ))}
              <span className="gd-loopnote">You own one stage: <b style={{ color: '#2DD4BF' }}>Decide</b>. The counterparts run the rest.</span>
            </div>
            <p className="gd-what">Nine screens, one loop. Scroll through — each step links straight into the live screen it describes.</p>
            <button className="gd-cta" onClick={() => { startTour(); navigate('/command'); }}>
              Show me on screen →
            </button>
          </div>
        </section>

        {/* Step slides */}
        {STEPS.map((s, i) => (
          <section key={s.title} className="gd-slide">
            <div className="gd-inner">
              <span className="gd-n">Step {i + 1} of {STEPS.length}</span>
              <div className="gd-eyebrow">{s.where}</div>
              <h2>{s.title}</h2>
              <p className="gd-what">{s.what}</p>
              <ul className="gd-do">
                {s.doThis.map((d) => (
                  <li key={d}><span className="m">→</span>{d}</li>
                ))}
              </ul>
              <Link to={s.to} className="gd-ghost">{s.cta} →</Link>
            </div>
          </section>
        ))}

        {/* Finale */}
        <section className="gd-slide">
          <div className="gd-inner" style={{ textAlign: 'center' }}>
            <div className="gd-eyebrow">That's the whole system</div>
            <h1>Every mandate, <span className="grad">held twice</span>.</h1>
            <p className="gd-what" style={{ maxWidth: 520, margin: '0 auto 26px' }}>
              Your counterparts are already watching. Answer what they bring you, and let the loop close.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/command" className="gd-cta">Start in the Command Center →</Link>
              <button className="gd-ghost" onClick={() => { startTour(); navigate('/command'); }}>Show me on screen</button>
              <Link to="/" className="gd-ghost">Read the story</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
