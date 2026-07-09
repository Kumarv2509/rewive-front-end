import { useNavigate } from 'react-router-dom';
import { useSetIndustry } from '../../api/shadowOrg';
import type { IndustryKey } from '../../api/types';

const INDUSTRIES: { id: IndustryKey; name: string; blurb: string; mandates: number }[] = [
  { id: 'fmcg', name: 'FMCG / food & beverage', blurb: 'Manufacturing, distribution and trade across modern and traditional channels.', mandates: 26 },
  { id: 'healthcare', name: 'Healthcare', blurb: 'Clinical operations, revenue cycle, patient experience, pharmacy, finance and people.', mandates: 22 },
  { id: 'manufacturing', name: 'Industrial manufacturing', blurb: 'Production, maintenance, supplier network, quality and safety.', mandates: 11 },
];

function useEnter() {
  const navigate = useNavigate();
  const setIndustry = useSetIndustry();
  // Start in the Build area on the Operating Picture — the mandates for that industry.
  const enter = (id: IndustryKey) =>
    setIndustry.mutate(id, { onSettled: () => navigate('/build/picture') });
  return { enter, pending: setIndustry.isPending };
}

const css = `
.om{
  --ground:#07070F;--ground-2:#0B0B16;
  --om-ink:#F1F1F7;--om-ink-2:#A6A9C8;--om-ink-3:#63678B;
  --i1:#6366F1;--i2:#8B5CF6;--i3:#A855F7;--om-teal:#2DD4BF;
  --grad:linear-gradient(120deg,#6366F1 0%,#8B5CF6 52%,#A855F7 100%);
  --om-glass:rgba(255,255,255,.045);--om-line:rgba(255,255,255,.09);--om-line-2:rgba(255,255,255,.16);
  --om-good:#4ADE80;--om-warn:#FBBF24;--om-crit:#F87171;
  --om-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
  --om-mono:ui-monospace,"SF Mono",Menlo,Monaco,"Cascadia Code",monospace;
  --om-maxw:1080px;
  font-family:var(--om-sans);color:var(--om-ink);line-height:1.7;
  position:relative;overflow-x:hidden;min-height:100vh;background:var(--ground);
  padding:0 24px 0;
}
.om::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(1100px 720px at 82% -8%,rgba(139,92,246,.20),transparent 58%),
    radial-gradient(900px 640px at -12% 22%,rgba(45,212,191,.08),transparent 55%),
    radial-gradient(1000px 720px at 50% 118%,rgba(99,102,241,.16),transparent 60%);}
.om > *{position:relative;z-index:1}
.om .wrap{max-width:var(--om-maxw);margin:0 auto}

.om .topbar-land{display:flex;align-items:center;justify-content:space-between;max-width:var(--om-maxw);margin:0 auto;padding:22px 0}
.om .brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--om-ink)}
.om .brand .mk{width:30px;height:30px;border-radius:9px;background:var(--grad);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;box-shadow:0 0 22px rgba(124,99,255,.5)}
.om .brand .nm{font-weight:700;letter-spacing:-.3px;font-size:16px}
.om .enter{font-family:var(--om-mono);font-size:.78rem;letter-spacing:.08em;text-decoration:none;color:var(--om-ink);border:1px solid var(--om-line-2);background:var(--om-glass);border-radius:99px;padding:9px 18px;transition:all .2s;backdrop-filter:blur(12px)}
.om .enter:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.28)}

.om .eyebrow{font-family:var(--om-mono);font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--om-ink-3)}
.om h1,.om h2,.om h3{text-wrap:balance;font-weight:700;letter-spacing:-.02em;line-height:1.08;margin:0}
.om h1{font-size:clamp(2.5rem,6vw,4.4rem)}
.om h2{font-size:clamp(1.7rem,3.2vw,2.5rem)}
.om h3{font-size:1.06rem;letter-spacing:-.01em}
.om p{margin:0}
.om .lede{font-size:clamp(1.05rem,1.7vw,1.35rem);color:var(--om-ink-2);line-height:1.6;max-width:60ch}
.om .grad-text{background:var(--grad);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.om .teal{color:var(--om-teal)}

.om section{padding:clamp(56px,9vh,120px) 0;border-top:1px solid var(--om-line)}
.om section.hero{border-top:none;padding-top:clamp(40px,7vh,92px)}
.om .sec-eyebrow{display:flex;align-items:center;gap:12px;margin-bottom:26px}
.om .sec-eyebrow .tick{width:26px;height:1px;background:var(--om-line-2)}

.om .hero .kicker{display:inline-flex;align-items:center;gap:10px;font-family:var(--om-mono);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--om-ink-2);border:1px solid var(--om-line);background:var(--om-glass);border-radius:99px;padding:7px 15px;backdrop-filter:blur(12px);margin-bottom:34px}
.om .hero .kicker .live{width:7px;height:7px;border-radius:50%;background:var(--om-teal);box-shadow:0 0 10px var(--om-teal);animation:om-blink 2.4s ease-in-out infinite}
.om .hero h1{max-width:16ch;margin-bottom:28px}
.om .hero .lede{margin-bottom:34px}
.om .hero .thesis-line{font-family:var(--om-mono);font-size:.92rem;color:var(--om-ink-2);border-left:2px solid var(--i2);padding-left:16px;max-width:56ch;margin-bottom:38px}
.om .hero .thesis-line b{color:var(--om-ink);font-weight:500}
.om .cta{display:inline-flex;align-items:center;gap:9px;font-family:var(--om-sans);font-size:1rem;font-weight:600;text-decoration:none;color:#fff;background:var(--grad);border-radius:13px;padding:14px 26px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 0 34px rgba(124,99,255,.4);transition:filter .2s,transform .2s}
.om .cta:hover{filter:brightness(1.1);transform:translateY(-1px)}
.om .cta .arr{font-family:var(--om-mono)}
.om .ind-picker{scroll-margin-top:24px}
.om .ind-picker-label{font-family:var(--om-mono);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--om-ink-3);margin-bottom:14px}
.om .ind-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.om .ind-card{text-align:left;cursor:pointer;font-family:inherit;color:var(--om-ink);background:var(--om-glass);border:1px solid var(--om-line-2);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:8px;transition:transform .18s,border-color .18s,box-shadow .18s;backdrop-filter:blur(16px)}
.om .ind-card:hover:not(:disabled){transform:translateY(-3px);border-color:rgba(139,92,246,.55);box-shadow:0 10px 34px rgba(0,0,0,.4),0 0 30px rgba(124,99,255,.18)}
.om .ind-card:disabled{opacity:.5;cursor:default}
.om .ind-card .ind-name{font-size:1.05rem;font-weight:700;letter-spacing:-.01em}
.om .ind-card .ind-blurb{font-size:.86rem;color:var(--om-ink-2);line-height:1.5;flex:1}
.om .ind-card .ind-foot{display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:12px;border-top:1px solid var(--om-line)}
.om .ind-card .ind-count{font-family:var(--om-mono);font-size:.72rem;color:var(--om-ink-3)}
.om .ind-card .ind-go{font-size:.86rem;font-weight:600;color:var(--i3)}
.om .ind-card .ind-go .arr{font-family:var(--om-mono)}
@media(max-width:720px){.om .ind-cards{grid-template-columns:1fr}}

.om .shift{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:8px}
.om .col{border:1px solid var(--om-line);border-radius:16px;background:var(--om-glass);backdrop-filter:blur(18px);padding:26px 26px 12px}
.om .col.old{opacity:.8}
.om .col.new{border-color:rgba(139,92,246,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 0 40px rgba(124,99,255,.10)}
.om .col .col-tag{font-family:var(--om-mono);font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;margin-bottom:18px}
.om .col.old .col-tag{color:var(--om-ink-3)}
.om .col.new .col-tag{color:var(--i3)}
.om .col ul{list-style:none;padding:0;margin:0}
.om .col li{padding:13px 0;border-top:1px solid var(--om-line);font-size:.98rem;color:var(--om-ink-2);display:flex;gap:11px;align-items:flex-start}
.om .col li:first-child{border-top:none}
.om .col li .m{font-family:var(--om-mono);flex-shrink:0;margin-top:2px;font-size:.9rem}
.om .col.old li .m{color:var(--om-ink-3)}
.om .col.new li{color:var(--om-ink)}
.om .col.new li .m{color:var(--om-teal)}

.om .tiers{display:flex;flex-direction:column;gap:14px;margin-top:34px}
.om .tier{border:1px solid var(--om-line);border-radius:14px;background:var(--om-glass);backdrop-filter:blur(16px);padding:20px 24px;display:grid;grid-template-columns:150px 1fr;gap:22px;align-items:center}
.om .tier .t-label{font-family:var(--om-mono);font-size:.82rem;letter-spacing:.06em;display:flex;align-items:center;gap:10px}
.om .tier .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.om .tier .t-def{color:var(--om-ink-2);font-size:.98rem}
.om .tier .t-def b{color:var(--om-ink);font-weight:500}
.om .tier.intent{border-color:rgba(45,212,191,.3)}
.om .tier.intent .dot{background:var(--om-teal);box-shadow:0 0 12px var(--om-teal)}
.om .tier.intent .t-label{color:var(--om-teal)}
.om .tier.mandate .dot{background:var(--i2);box-shadow:0 0 12px var(--i2)}
.om .tier.mandate .t-label{color:#B9C0FF}
.om .tier.sense .dot{background:var(--om-ink-3)}
.om .tier.sense .t-label{color:var(--om-ink-2)}
.om .tier-arrow{text-align:center;color:var(--om-ink-3);font-family:var(--om-mono);font-size:.7rem;letter-spacing:.14em}
.om .held{margin-top:30px;border:1px solid rgba(139,92,246,.32);border-radius:14px;background:linear-gradient(120deg,rgba(99,102,241,.12),rgba(168,85,247,.08));padding:22px 26px;font-size:clamp(1.05rem,1.8vw,1.4rem);font-weight:500;text-wrap:balance}

.om .loop{display:grid;grid-template-columns:minmax(0,440px) 1fr;gap:clamp(28px,5vw,68px);align-items:center;margin-top:20px}
.om .loop-svg-wrap{position:relative}
.om .loop svg{width:100%;height:auto;display:block;overflow:visible}
.om .stages{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.om .stage{padding:16px 0;border-top:1px solid var(--om-line);display:grid;grid-template-columns:38px 1fr;gap:16px;align-items:start}
.om .stage:first-child{border-top:none}
.om .stage .n{font-family:var(--om-mono);font-size:.92rem;font-weight:500;color:var(--i3);border:1px solid var(--om-line-2);border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center}
.om .stage h3{margin-bottom:5px}
.om .stage p{color:var(--om-ink-2);font-size:.96rem}
.om .stage b{color:var(--om-ink);font-weight:500}

.om .dispo{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:34px}
.om .dcard{border:1px solid var(--om-line);border-radius:16px;background:var(--om-glass);backdrop-filter:blur(18px);padding:22px 20px;display:flex;flex-direction:column;gap:11px;transition:transform .2s,border-color .2s}
.om .dcard:hover{transform:translateY(-3px);border-color:var(--om-line-2)}
.om .dcard .verb{font-size:1.2rem;font-weight:700;letter-spacing:-.01em}
.om .dcard .tag{font-family:var(--om-mono);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;align-self:flex-start;border-radius:99px;padding:4px 10px;border:1px solid transparent}
.om .dcard p{font-size:.9rem;color:var(--om-ink-2);line-height:1.55}
.om .dcard.accept .verb{color:var(--om-teal)}.om .dcard.accept .tag{color:var(--om-teal);background:rgba(45,212,191,.13);border-color:rgba(45,212,191,.3)}
.om .dcard.act .verb{color:#B9C0FF}.om .dcard.act .tag{color:#B9C0FF;background:rgba(124,124,255,.14);border-color:rgba(124,124,255,.3)}
.om .dcard.ack .verb{color:var(--om-warn)}.om .dcard.ack .tag{color:var(--om-warn);background:rgba(251,191,36,.13);border-color:rgba(251,191,36,.28)}
.om .dcard.abandon .verb{color:var(--om-ink-2)}.om .dcard.abandon .tag{color:var(--om-ink-2);background:rgba(255,255,255,.06);border-color:var(--om-line)}
.om .dispo-foot{margin-top:20px;font-family:var(--om-mono);font-size:.82rem;color:var(--om-ink-3);letter-spacing:.02em}
.om .dispo-foot b{color:var(--om-crit);font-weight:500}

.om .example{border:1px solid var(--om-line);border-radius:18px;background:var(--om-glass);backdrop-filter:blur(18px);margin-top:32px;overflow:hidden}
.om .ex-head{padding:20px 26px;border-bottom:1px solid var(--om-line);display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.om .ex-head .who{font-family:var(--om-mono);font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;color:var(--i3)}
.om .ex-head .impact{font-family:var(--om-mono);font-size:.86rem;color:var(--om-crit)}
.om .ex-flow{display:grid;grid-template-columns:repeat(5,1fr)}
.om .ex-step{padding:22px 20px;border-left:1px solid var(--om-line);display:flex;flex-direction:column;gap:8px}
.om .ex-step:first-child{border-left:none}
.om .ex-step .s-tag{font-family:var(--om-mono);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--om-ink-3)}
.om .ex-step .s-body{font-size:.92rem;color:var(--om-ink-2);line-height:1.5}
.om .ex-step .s-body b{color:var(--om-ink);font-weight:500}
.om .ex-step.pivot{background:linear-gradient(180deg,rgba(45,212,191,.08),transparent)}
.om .ex-step.pivot .s-tag{color:var(--om-teal)}

.om .close{text-align:center;padding-bottom:clamp(70px,12vh,130px)}
.om .close h2{max-width:20ch;margin:0 auto 22px}
.om .close .lede{margin:0 auto 34px}
.om .close .sig{margin-top:40px;font-family:var(--om-mono);font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;color:var(--om-ink-3)}

@keyframes om-blink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes om-travel{to{stroke-dashoffset:-1508}}
.om .om-pulse{animation:om-travel 6s linear infinite}
@media (prefers-reduced-motion:reduce){.om .om-pulse{animation:none}.om .hero .kicker .live{animation:none}.om .dcard,.om .cta{transition:none}}
@media(max-width:860px){
  .om .shift{grid-template-columns:1fr}
  .om .loop{grid-template-columns:1fr;gap:28px}
  .om .loop-svg-wrap{max-width:420px;margin:0 auto}
  .om .dispo{grid-template-columns:1fr 1fr}
  .om .ex-flow{grid-template-columns:1fr}
  .om .ex-step{border-left:none;border-top:1px solid var(--om-line)}
  .om .ex-step:first-child{border-top:none}
  .om .tier{grid-template-columns:1fr;gap:8px}
}
@media(max-width:520px){.om .dispo{grid-template-columns:1fr}}
`;

function IndustryPicker() {
  const { enter, pending } = useEnter();
  return (
    <div className="ind-picker" id="start">
      <div className="ind-picker-label">Choose your operating context to begin</div>
      <div className="ind-cards">
        {INDUSTRIES.map((ind) => (
          <button key={ind.id} className="ind-card" disabled={pending} onClick={() => enter(ind.id)}>
            <div className="ind-name">{ind.name}</div>
            <div className="ind-blurb">{ind.blurb}</div>
            <div className="ind-foot">
              <span className="ind-count">{ind.mandates} mandates</span>
              <span className="ind-go">Enter <span className="arr">→</span></span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LandingScreen() {
  return (
    <div className="om">
      <style>{css}</style>

      <header className="topbar-land">
        <span className="brand">
          <span className="mk">R</span>
          <span className="nm">Rewive</span>
        </span>
        <a href="#start" className="enter">Get started ↓</a>
      </header>

      {/* HERO */}
      <section className="hero wrap">
        <span className="kicker"><span className="live" /> The Agentic Operating Model</span>
        <h1>Dashboards tell you what happened. A <span className="grad-text">shadow organization</span> does something about it.</h1>
        <p className="lede">Give every function a tireless counterpart — an agent that watches the same numbers its human owner does, catches drift the moment it starts, and arrives with a decision instead of a report.</p>
        <p className="thesis-line"><b>Every mandate is held twice</b> — once by a person, once by the agent shadowing them.</p>
        <IndustryPicker />
      </section>

      {/* THE SHIFT */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The shift</span><span className="tick" /></div>
        <h2>From a system you <span className="teal">read</span> to one that <span className="grad-text">runs</span>.</h2>
        <div className="shift">
          <div className="col old">
            <div className="col-tag">The reporting era</div>
            <ul>
              <li><span className="m">—</span> A metric is a number you go and look at.</li>
              <li><span className="m">—</span> Insight waits for a human to notice it.</li>
              <li><span className="m">—</span> A problem becomes a meeting, then a deck.</li>
              <li><span className="m">—</span> The business reacts on your calendar.</li>
              <li><span className="m">—</span> Data ages while it waits for attention.</li>
            </ul>
          </div>
          <div className="col new">
            <div className="col-tag">The agentic operating model</div>
            <ul>
              <li><span className="m">→</span> A metric is a <b>mandate</b> something enforces.</li>
              <li><span className="m">→</span> Drift is caught the moment it starts.</li>
              <li><span className="m">→</span> A problem arrives as a <b>decision with options</b>.</li>
              <li><span className="m">→</span> The business moves at the speed of its data.</li>
              <li><span className="m">→</span> You are interrupted only when it matters.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* OPERATING PICTURE */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The Operating Picture</span><span className="tick" /></div>
        <h2>One live picture of what the company is trying to make true.</h2>
        <p className="lede" style={{ marginTop: 18 }}>Not a dashboard you visit — a structure the whole shadow organization reasons over. Three layers, wired together, so a problem anywhere can be traced to the goal it threatens.</p>
        <div className="tiers">
          <div className="tier intent">
            <div className="t-label"><span className="dot" />Intents</div>
            <div className="t-def"><b>What leadership has declared must become true.</b> Revenue growth. EBITDA margin. On-time delivery. The handful of outcomes the company is steering toward.</div>
          </div>
          <div className="tier-arrow">▲ carried by</div>
          <div className="tier mandate">
            <div className="t-label"><span className="dot" />Mandates</div>
            <div className="t-def"><b>Enforceable commitments each function owns.</b> "Case fill above 97%." "Waste under 3.5%." Not indicators to admire — promises with an owner and a shadow watching them.</div>
          </div>
          <div className="tier-arrow">▲ verified by</div>
          <div className="tier sense">
            <div className="t-label"><span className="dot" />Senses</div>
            <div className="t-def"><b>What the agents perceive through.</b> The data feeds behind every mandate — POS, plant telemetry, the planning system. A mandate without a sense is blind, and the picture says so.</div>
          </div>
        </div>
        <p className="held">Every mandate is held twice — once by a person, once by their shadow. The person decides. The shadow never looks away.</p>
      </section>

      {/* THE LOOP */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">How the agents operate — the loop</span><span className="tick" /></div>
        <h2>A loop that runs whether or not anyone is watching.</h2>
        <div className="loop">
          <div className="loop-svg-wrap">
            <svg viewBox="0 0 600 600" role="img" aria-label="The five-stage operating loop: sense, find, decide, act, learn, repeating.">
              <defs>
                <linearGradient id="omring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6366F1" /><stop offset=".55" stopColor="#8B5CF6" /><stop offset="1" stopColor="#A855F7" />
                </linearGradient>
                <filter id="omglow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <circle cx="300" cy="300" r="240" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="1.5" />
              <circle className="om-pulse" cx="300" cy="300" r="240" fill="none" stroke="url(#omring)" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 1418" strokeDashoffset="0" filter="url(#omglow)" />
              <text x="300" y="290" textAnchor="middle" fontFamily="ui-monospace,SF Mono,Menlo,monospace" fontSize="13" letterSpacing="3" fill="#63678B">CONTINUOUS</text>
              <text x="300" y="318" textAnchor="middle" fontFamily="-apple-system,system-ui,sans-serif" fontSize="22" fontWeight="700" fill="#F1F1F7">The loop</text>
              <g fontFamily="ui-monospace,SF Mono,Menlo,monospace" fontSize="15" fontWeight="600">
                <circle cx="300" cy="60" r="27" fill="#0B0B16" stroke="url(#omring)" strokeWidth="1.6" />
                <text x="300" y="66" textAnchor="middle" fill="#B9C0FF">1</text>
                <text x="300" y="24" textAnchor="middle" fontSize="14" fill="#F1F1F7">Sense</text>
                <circle cx="528" cy="226" r="27" fill="#0B0B16" stroke="url(#omring)" strokeWidth="1.6" />
                <text x="528" y="232" textAnchor="middle" fill="#B9C0FF">2</text>
                <text x="528" y="277" textAnchor="middle" fontSize="14" fill="#F1F1F7">Find</text>
                <circle cx="441" cy="494" r="27" fill="#0B0B16" stroke="#2DD4BF" strokeWidth="1.8" />
                <text x="441" y="500" textAnchor="middle" fill="#2DD4BF">3</text>
                <text x="441" y="545" textAnchor="middle" fontSize="14" fill="#F1F1F7">Decide</text>
                <circle cx="159" cy="494" r="27" fill="#0B0B16" stroke="url(#omring)" strokeWidth="1.6" />
                <text x="159" y="500" textAnchor="middle" fill="#B9C0FF">4</text>
                <text x="159" y="545" textAnchor="middle" fontSize="14" fill="#F1F1F7">Act</text>
                <circle cx="72" cy="226" r="27" fill="#0B0B16" stroke="url(#omring)" strokeWidth="1.6" />
                <text x="72" y="232" textAnchor="middle" fill="#B9C0FF">5</text>
                <text x="72" y="277" textAnchor="middle" fontSize="14" fill="#F1F1F7">Learn</text>
              </g>
            </svg>
          </div>
          <ol className="stages">
            <li className="stage"><span className="n">1</span><div><h3>Sense</h3><p>Each shadow agent watches the data feeds behind its mandates — <b>continuously</b>, not on a reporting cadence.</p></div></li>
            <li className="stage"><span className="n">2</span><div><h3>Find</h3><p>When reality drifts from a mandate, the agent raises a <b>finding</b> and traces its impact path up to the intent it threatens.</p></div></li>
            <li className="stage"><span className="n">3</span><div><h3>Decide</h3><p>The finding demands a human call — one of <b>four dispositions</b>. Nothing proceeds without it; unanswered findings escalate up the shadow org.</p></div></li>
            <li className="stage"><span className="n">4</span><div><h3>Act</h3><p>The decision sets the machine in motion: a watched exit condition, a solution with tasks handed to agents, or a deliberate pause.</p></div></li>
            <li className="stage"><span className="n">5</span><div><h3>Learn</h3><p>Outcomes close the loop — met exit conditions retire the finding, a dismissal <b>tunes the agent</b>, and the picture updates. Then back to sensing.</p></div></li>
          </ol>
        </div>
      </section>

      {/* FOUR DISPOSITIONS */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The decision — four dispositions</span><span className="tick" /></div>
        <h2>The agent brings the finding. The human owns the call.</h2>
        <p className="lede" style={{ marginTop: 18 }}>Every finding forces a choice — and each choice is a different instruction to the organization, not a status you set and forget.</p>
        <div className="dispo">
          <div className="dcard accept"><span className="tag">it's real</span><div className="verb">Accept</div><p>Set a measurable exit condition. The shadow keeps watching until the number is truly back — then closes the loop itself.</p></div>
          <div className="dcard act"><span className="tag">fix it now</span><div className="verb">Act</div><p>Open a solution, broken into tasks. New work goes to agents, existing agents are reused, humans own the rest.</p></div>
          <div className="dcard ack"><span className="tag">not yet</span><div className="verb">Acknowledge</div><p>A known issue, parked with a trip-wire. It comes back — louder — the moment it crosses the line you set.</p></div>
          <div className="dcard abandon"><span className="tag">not real</span><div className="verb">Abandon</div><p>Dismiss it with a reason. The reason isn't paperwork — it's the signal that <b>tunes the agent</b> so it learns what not to raise.</p></div>
        </div>
        <p className="dispo-foot">No disposition is a decision too — <b>ignored findings escalate automatically</b> up the shadow organization until someone owns them.</p>
      </section>

      {/* WORKED EXAMPLE */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">One finding, end to end · FMCG</span><span className="tick" /></div>
        <h2>What the loop looks like on a real problem.</h2>
        <div className="example">
          <div className="ex-head">
            <span className="who">Raised by the Shadow Planning agent</span>
            <span className="impact">≈ AED 1.2M revenue at risk this quarter</span>
          </div>
          <div className="ex-flow">
            <div className="ex-step"><span className="s-tag">1 · Sense</span><span className="s-body">Watches the <b>POS and forecast feeds</b> behind the frozen-category fill mandate.</span></div>
            <div className="ex-step"><span className="s-tag">2 · Find</span><span className="s-body">"Frozen forecast bias is starving modern trade." Traced up to the <b>Revenue growth</b> intent.</span></div>
            <div className="ex-step pivot"><span className="s-tag">3 · Decide</span><span className="s-body">The planning owner reviews the impact path and clicks <b>Accept</b>.</span></div>
            <div className="ex-step"><span className="s-tag">4 · Act</span><span className="s-body">Exit condition set: <b>frozen fill ≥ 96% for four straight weeks</b>, watched automatically.</span></div>
            <div className="ex-step"><span className="s-tag">5 · Learn</span><span className="s-body">Fill recovers, the condition is met, the finding <b>closes itself</b> — and the picture updates.</span></div>
          </div>
        </div>
      </section>

      {/* CLOSE */}
      <section className="close wrap">
        <h2>An organization that <span className="grad-text">points at what you decided matters</span> — without being asked.</h2>
        <p className="lede">One organization does the work. Its shadow makes sure the work still serves the intent, catches it when it doesn't, and brings you the decision the moment it counts.</p>
        <div><a href="#start" className="cta">Choose your context <span className="arr">↑</span></a></div>
        <p className="sig">Every mandate, held twice.</p>
      </section>
    </div>
  );
}
