import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { markGuideSeen } from './seen';
import { startTour } from '../../components/tour/store';

// Static help content — a new user's first loop as a full-screen intro scroller
// (mobile-onboarding style: one step per screen, snap scrolling, dots, skip).
// Every step deep-links into the live screen it describes.
// Five steps = the five loop words. Each deep-links into the live screen.
const STEPS: {
  title: string;
  where: string;
  to: string;
  cta: string;
  what: string;
  doThis: string[];
}[] = [
  {
    title: 'Sense — your agents watch every number',
    where: 'Agents · Foundation',
    to: '/operate/counterparts',
    cta: 'Meet your agents',
    what: 'Every number that matters has two owners: a person, and an agent that never looks away. The agents read the live data feeds behind each mandate continuously — not on a reporting cadence.',
    doThis: [
      'Each agent card shows what it watches and what it has raised.',
      'The Operating Picture (Foundation) is the map they all reason over.',
    ],
  },
  {
    title: 'Find — drift becomes a finding',
    where: 'Findings',
    to: '/operate/findings',
    cta: 'See the findings',
    what: 'When a number drifts, its agent raises a finding: what drifted, what it costs, the evidence, and the path from the drift up to the company goal it threatens.',
    doThis: [
      'Findings sort by their clock — an unanswered finding escalates to the manager above.',
      'Open one and read the evidence — the agent shows its working.',
    ],
  },
  {
    title: 'Decide — the one stage that is yours',
    where: 'On the finding',
    to: '/operate/findings',
    cta: 'Try it on a finding',
    what: 'Every finding gets one of four answers. Accept: it\'s real — set a recovery target the agent watches until the number is back. Act: fix it now — opens a plan with tasks. Park: known issue — it re-alerts if it worsens. Dismiss: not real — your reason tunes the agent.',
    doThis: [
      'Not your call? Escalate it rather than letting it sit — silence escalates it anyway.',
      'Every decision is recorded in the Decision Ledger, with a verdict later: worked, didn\'t, or too early.',
    ],
  },
  {
    title: 'Act — the decision sets work in motion',
    where: 'Execution',
    to: '/operate/tasks',
    cta: 'See the work',
    what: 'Choosing Act opens a plan broken into tasks — some for workers (agents that execute), some for people. You never browse to the build screens; they come to you when a finding needs them.',
    doThis: [
      'Everything assigned to you or your team lands in Execution · Tasks.',
      'Runs and Outcomes show what the workers did and what it returned.',
    ],
  },
  {
    title: 'Close — watched until the number is back',
    where: 'Findings · Watching',
    to: '/operate/findings?tab=watching',
    cta: 'Open Watching',
    what: 'Nothing is "done" until the number is back. Accepted findings sit on the Watching tab as recovery targets with progress bars; parked ones wait behind their re-alert line. When the target holds, the loop closes itself — and the ledger gets the verdict.',
    doThis: [
      'Only "Mark met · close loop" when the number is truly back.',
      'Regressed targets and re-alerts resurface on their own.',
    ],
  },
];

const LOOP = ['Sense', 'Find', 'Decide', 'Act', 'Close'];
const SLIDE_COUNT = STEPS.length + 2; // intro + steps + finale

const css = `
.gd{position:fixed;inset:0;z-index:60;background:var(--bg);color:var(--ink);font-family:var(--font-body)}
.gd-top{position:absolute;top:0;left:0;right:0;z-index:3;display:flex;align-items:center;justify-content:space-between;padding:18px 26px}
.gd-brand{display:flex;align-items:center;gap:10px}
.gd-brand .mk{width:28px;height:28px;border-radius:8px;background:var(--ink);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--on-emphasis);font-size:14px;font-family:var(--font-display)}
.gd-brand .nm{font-weight:700;font-size:14px;letter-spacing:-.2px;font-family:var(--font-display)}
.gd-skip{font-family:var(--font-mono);font-size:.74rem;letter-spacing:.06em;color:var(--ink-2);text-decoration:none;border:1px solid var(--border);background:var(--surface);border-radius:99px;padding:8px 16px;cursor:pointer;transition:all .2s}
.gd-skip:hover{color:var(--ink);border-color:var(--border-strong)}
.gd-scroll{position:absolute;inset:0;overflow-y:auto;scroll-snap-type:y mandatory;scroll-behavior:smooth;z-index:1}
.gd-slide{height:100%;scroll-snap-align:start;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center;padding:72px 24px 84px}
.gd-inner{max-width:640px;width:100%}
.gd-eyebrow{font-family:var(--font-mono);font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);margin-bottom:14px}
.gd-n{font-family:var(--font-mono);font-size:.78rem;color:var(--accent);border:1px solid var(--border);background:var(--surface);border-radius:99px;padding:5px 13px;display:inline-block;margin-bottom:18px}
.gd h1{font-family:var(--font-display);font-size:clamp(2rem,5vw,3.2rem);font-weight:700;letter-spacing:-.02em;line-height:1.1;margin:0 0 18px;text-wrap:balance}
.gd h2{font-family:var(--font-display);font-size:clamp(1.5rem,3.4vw,2.2rem);font-weight:700;letter-spacing:-.02em;line-height:1.15;margin:0 0 14px;text-wrap:balance}
.gd .grad{color:var(--accent-deep)}
.gd-what{font-size:clamp(.95rem,1.4vw,1.08rem);color:var(--ink-2);line-height:1.65;margin:0 0 18px}
.gd-do{list-style:none;margin:0 0 24px;padding:0;display:flex;flex-direction:column;gap:9px}
.gd-do li{display:flex;gap:11px;align-items:flex-start;font-size:.92rem;line-height:1.55;color:var(--ink)}
.gd-do li .m{color:var(--teal);font-family:var(--font-mono);flex-shrink:0;margin-top:1px}
.gd-cta{display:inline-flex;align-items:center;gap:8px;font-size:.92rem;font-weight:600;text-decoration:none;border:none;color:var(--on-emphasis);background:var(--accent);border-radius:var(--radius);padding:12px 22px;box-shadow:var(--shadow);cursor:pointer;transition:background .2s}
.gd-cta:hover{background:var(--accent-deep)}
.gd-ghost{display:inline-flex;align-items:center;gap:8px;font-size:.92rem;font-weight:600;text-decoration:none;color:var(--ink);border:1px solid var(--border);background:var(--surface);border-radius:var(--radius);padding:12px 22px;box-shadow:var(--shadow);cursor:pointer;transition:all .2s}
.gd-ghost:hover{border-color:var(--border-strong);background:var(--glass-hover)}
.gd-loopstrip{display:flex;flex-wrap:wrap;align-items:center;gap:12px;border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:14px 18px;margin-bottom:26px;box-shadow:var(--shadow)}
.gd-loopstrip .st{font-weight:600;font-size:.95rem}
.gd-loopstrip .st.you{color:var(--teal)}
.gd-loopstrip .arr{color:var(--ink-3);font-family:var(--font-mono);font-size:.8rem}
.gd-loopnote{font-size:.84rem;color:var(--ink-2);width:100%;margin-top:2px}
.gd-dots{position:absolute;right:22px;top:50%;transform:translateY(-50%);z-index:3;display:flex;flex-direction:column;gap:10px}
.gd-dot{width:9px;height:9px;border-radius:50%;border:1px solid var(--border-strong);background:transparent;cursor:pointer;padding:0;transition:all .25s}
.gd-dot.on{background:var(--accent);border-color:var(--accent);transform:scale(1.3)}
.gd-next{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:3;display:flex;align-items:center;gap:9px;font-family:var(--font-mono);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2);background:var(--surface);border:1px solid var(--border);border-radius:99px;padding:9px 18px;cursor:pointer;box-shadow:var(--shadow);transition:all .2s}
.gd-next:hover{color:var(--ink);border-color:var(--border-strong)}
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
              <span className="gd-loopnote">You own one stage: <b style={{ color: 'var(--teal)' }}>Decide</b>. The agents run the rest.</span>
            </div>
            <p className="gd-what">Five stages, one loop. Scroll through — each stage links straight into the live screen it runs on.</p>
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
              Your agents are already watching. Answer what they bring you, and let the loop close.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/command" className="gd-cta">Start on Today →</Link>
              <button className="gd-ghost" onClick={() => { startTour(); navigate('/command'); }}>Show me on screen</button>
              <Link to="/" className="gd-ghost">Read the story</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
