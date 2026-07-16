import { useNavigate } from 'react-router-dom';
import { useSetIndustry } from '../../api/shadowOrg';
import type { IndustryKey } from '../../api/types';

// Manufacturing pack exists but is hidden until it's as deep as the other two —
// a shallow third industry weakens the "this understands my business" effect.
const INDUSTRIES: { id: IndustryKey; name: string; blurb: string; mandates: number }[] = [
  { id: 'fmcg', name: 'FMCG / food & beverage', blurb: 'Manufacturing, distribution and trade across modern and traditional channels.', mandates: 26 },
  { id: 'healthcare', name: 'Healthcare', blurb: 'Clinical operations, revenue cycle, patient experience, pharmacy, finance and people.', mandates: 22 },
];

function useEnter() {
  const navigate = useNavigate();
  const setIndustry = useSetIndustry();
  // Land on the Command Center — the "4 decisions are waiting on you" moment.
  const enter = (id: IndustryKey) =>
    setIndustry.mutate(id, { onSettled: () => navigate('/command') });
  return { enter, pending: setIndustry.isPending };
}

const css = `
.om{
  --ground:var(--bg);--ground-2:var(--surface);
  --om-ink:var(--ink);--om-ink-2:var(--ink-2);--om-ink-3:var(--ink-3);
  --i1:var(--accent);--i2:var(--accent);--i3:var(--accent-deep);--om-teal:var(--teal);
  --grad:var(--accent);
  --om-card:var(--surface);--om-line:var(--border);--om-line-2:var(--border-strong);
  --om-good:var(--green);--om-warn:var(--amber);--om-crit:var(--red);
  --om-sans:var(--font-body);
  --om-serif:var(--font-display);
  --om-mono:var(--font-mono);
  --om-maxw:1120px;
  font-family:var(--om-sans);color:var(--om-ink);line-height:1.7;
  position:relative;overflow-x:hidden;min-height:100vh;background:var(--ground);
  padding:0 24px 0;
}
.om .wrap{max-width:var(--om-maxw);margin:0 auto}

.om .topbar-land{display:flex;align-items:center;justify-content:space-between;max-width:var(--om-maxw);margin:0 auto;padding:22px 0;border-bottom:1px solid var(--om-line)}
.om .brand{display:flex;align-items:center;gap:11px;text-decoration:none;color:var(--om-ink)}
.om .brand .mk{width:30px;height:30px;border-radius:8px;background:var(--om-ink);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--ground);font-family:var(--om-serif)}
.om .brand .nm{font-weight:700;letter-spacing:-.3px;font-size:16px;font-family:var(--om-serif)}
.om .enter{font-family:var(--om-mono);font-size:.78rem;letter-spacing:.08em;text-decoration:none;color:var(--om-ink-2);border:1px solid var(--om-line-2);background:var(--om-card);border-radius:99px;padding:9px 18px;transition:all .2s;box-shadow:var(--shadow)}
.om .enter:hover{color:var(--om-ink);border-color:rgba(26,26,46,.3)}

.om .eyebrow{font-family:var(--om-mono);font-size:.72rem;letter-spacing:.22em;text-transform:uppercase;color:var(--om-ink-3)}
.om h1,.om h2,.om h3{text-wrap:balance;font-weight:700;letter-spacing:-.02em;line-height:1.12;margin:0}
.om h1,.om h2{font-family:var(--om-serif);font-weight:600;letter-spacing:-.01em}
.om h1{font-size:clamp(2.3rem,5vw,3.7rem)}
.om h2{font-size:clamp(1.7rem,3.2vw,2.5rem)}
.om h3{font-size:1.06rem;letter-spacing:-.01em}
.om p{margin:0}
.om .lede{font-size:clamp(1.02rem,1.6vw,1.28rem);color:var(--om-ink-2);line-height:1.6;max-width:60ch}
.om .grad-text{color:var(--accent-deep)}
.om .teal{color:var(--om-teal)}

.om section{padding:clamp(56px,9vh,110px) 0;border-top:1px solid var(--om-line)}
.om section.hero{border-top:none;padding-top:clamp(28px,5vh,64px)}
.om .sec-eyebrow{display:flex;align-items:center;gap:12px;margin-bottom:26px}
.om .sec-eyebrow .tick{width:26px;height:1px;background:var(--om-line-2)}

/* ---------- hero: story left, system working right ---------- */
.om .hero-grid{display:grid;grid-template-columns:minmax(0,1.04fr) minmax(0,.96fr);gap:clamp(28px,4vw,60px);align-items:center}
.om .hero .kicker{display:inline-flex;align-items:center;gap:10px;font-family:var(--om-mono);font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--om-ink-2);border:1px solid var(--om-line-2);background:var(--om-card);border-radius:99px;padding:7px 15px;box-shadow:var(--shadow);margin-bottom:30px}
.om .hero .kicker .live{width:7px;height:7px;border-radius:50%;background:var(--om-teal);animation:om-blink 2.4s ease-in-out infinite}
.om .hero h1{max-width:16ch;margin-bottom:24px}
.om .hero .lede{margin-bottom:26px}
.om .hero .thesis-line{font-family:var(--om-mono);font-size:.9rem;color:var(--om-ink-2);border-left:2px solid var(--accent);padding-left:16px;max-width:56ch;margin-bottom:34px}
.om .hero .thesis-line b{color:var(--om-ink);font-weight:500}
.om .ind-picker{scroll-margin-top:24px}
.om .ind-picker-label{font-family:var(--om-mono);font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--om-ink-3);margin-bottom:14px}
.om .ind-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;max-width:600px}
.om .ind-card{text-align:left;cursor:pointer;font-family:inherit;color:var(--om-ink);background:var(--om-card);border:1px solid var(--om-line-2);border-radius:var(--radius);padding:18px;display:flex;flex-direction:column;gap:8px;transition:border-color .18s,box-shadow .18s;box-shadow:var(--shadow)}
.om .ind-card:hover:not(:disabled){border-color:var(--accent);box-shadow:var(--shadow-lg)}
.om .ind-card:disabled{opacity:.5;cursor:default}
.om .ind-card .ind-name{font-size:1rem;font-weight:700;letter-spacing:-.01em}
.om .ind-card .ind-blurb{font-size:.84rem;color:var(--om-ink-2);line-height:1.5;flex:1}
.om .ind-card .ind-foot{display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding-top:12px;border-top:1px solid var(--om-line)}
.om .ind-card .ind-count{font-family:var(--om-mono);font-size:.72rem;color:var(--om-ink-3)}
.om .ind-card .ind-go{font-size:.86rem;font-weight:600;color:var(--i3)}
.om .ind-card .ind-go .arr{font-family:var(--om-mono)}

/* the system, working — finding card inside the loop */
.om .viz{position:relative;min-height:500px}
.om .viz svg.wires{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.om .viz .node{position:absolute;display:flex;flex-direction:column;align-items:center;gap:8px;width:88px}
.om .viz .node .bx{width:44px;height:44px;border-radius:12px;border:1.5px dashed var(--om-line-2);display:flex;align-items:center;justify-content:center;font-family:var(--om-mono);font-size:.78rem;color:var(--om-ink-2);background:var(--om-card)}
.om .viz .node .lb{font-size:.8rem;color:var(--om-ink-2);font-weight:600}
.om .viz .node.you .bx{border-color:rgba(13,126,116,.55);color:var(--om-teal)}
.om .viz .node.you .lb{color:var(--om-teal)}
.om .n-sense{top:0;left:0}
.om .n-find{top:0;right:0}
.om .n-act{bottom:0;right:0}
.om .n-close{bottom:0;left:0}
.om .fcard{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(340px,80%);background:var(--om-card);border:1px solid var(--om-line);border-radius:12px;padding:16px 16px 13px;box-shadow:var(--shadow-lg)}
.om .fcard .fc-head{display:flex;align-items:center;gap:9px;margin-bottom:10px}
.om .fcard .fc-ava{width:26px;height:26px;border-radius:8px;background:var(--accent);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800}
.om .fcard .fc-who{font-size:.8rem;font-weight:700}
.om .fcard .fc-when{margin-left:auto;font-family:var(--om-mono);font-size:.64rem;color:var(--om-ink-3)}
.om .fcard .fc-title{font-size:.94rem;font-weight:700;line-height:1.4;margin-bottom:7px}
.om .fcard .fc-body{font-size:.8rem;color:var(--om-ink-2);line-height:1.5;margin-bottom:11px}
.om .fcard .fc-body b{color:var(--om-ink);font-weight:600}
.om .fcard .fc-chips{display:flex;gap:7px;margin-bottom:12px}
.om .chip{font-family:var(--om-mono);font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;border-radius:99px;padding:3px 9px;font-weight:600}
.om .chip.crit{color:var(--om-crit);background:var(--red-soft);border:1px solid rgba(180,35,24,.25)}
.om .chip.sla{color:var(--om-warn);background:var(--amber-soft);border:1px solid rgba(154,103,0,.25)}
.om .fcard .fc-btns{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:11px}
.om .fbtn{font-family:inherit;font-size:.76rem;font-weight:600;border-radius:8px;padding:7px 13px;border:1px solid var(--om-line-2);background:var(--om-card);color:var(--om-ink-2);cursor:default}
.om .fbtn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.om .fcard .fc-foot{font-family:var(--om-mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--om-ink-3);border-top:1px solid var(--om-line);padding-top:9px}
.om .viz-cap{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);font-family:var(--om-mono);font-size:.64rem;letter-spacing:.14em;text-transform:uppercase;color:var(--om-ink-3);white-space:nowrap}

/* ---------- anatomy: the five primitives ---------- */
.om .anatomy{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:34px}
.om .acard{border:1px solid var(--om-line);border-radius:var(--radius);background:var(--om-card);box-shadow:var(--shadow);padding:20px 18px;display:flex;flex-direction:column;gap:9px;transition:border-color .2s,box-shadow .2s}
.om .acard:hover{border-color:var(--om-line-2);box-shadow:var(--shadow-lg)}
.om .acard .a-where{font-family:var(--om-mono);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--om-ink-3)}
.om .acard h3{font-size:1rem}
.om .acard .a-what{font-family:var(--om-mono);font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--i3)}
.om .acard p{font-size:.84rem;color:var(--om-ink-2);line-height:1.55}
.om .acard p b{color:var(--om-ink);font-weight:500}
.om .anatomy-foot{margin-top:22px;font-family:var(--om-mono);font-size:.82rem;color:var(--om-ink-3)}
.om .anatomy-foot b{color:var(--om-ink-2);font-weight:500}

.om .shift{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:8px}
.om .col{border:1px solid var(--om-line);border-radius:var(--radius);background:var(--om-card);box-shadow:var(--shadow);padding:26px 26px 12px}
.om .col.old{background:transparent;box-shadow:none}
.om .col.new{border-color:rgba(59,59,196,.35)}
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
.om .tier{border:1px solid var(--om-line);border-radius:var(--radius);background:var(--om-card);box-shadow:var(--shadow);padding:20px 24px;display:grid;grid-template-columns:150px 1fr;gap:22px;align-items:center}
.om .tier .t-label{font-family:var(--om-mono);font-size:.82rem;letter-spacing:.06em;display:flex;align-items:center;gap:10px}
.om .tier .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.om .tier .t-def{color:var(--om-ink-2);font-size:.98rem}
.om .tier .t-def b{color:var(--om-ink);font-weight:500}
.om .tier.intent{border-color:rgba(13,126,116,.35)}
.om .tier.intent .dot{background:var(--om-teal)}
.om .tier.intent .t-label{color:var(--om-teal)}
.om .tier.mandate .dot{background:var(--accent)}
.om .tier.mandate .t-label{color:var(--accent-deep)}
.om .tier.sense .dot{background:var(--om-ink-3)}
.om .tier.sense .t-label{color:var(--om-ink-2)}
.om .tier-arrow{text-align:center;color:var(--om-ink-3);font-family:var(--om-mono);font-size:.7rem;letter-spacing:.14em}
.om .held{margin-top:30px;border:1px solid rgba(59,59,196,.3);border-radius:var(--radius);background:var(--accent-soft);padding:22px 26px;font-family:var(--om-serif);font-size:clamp(1.05rem,1.8vw,1.4rem);font-weight:500;text-wrap:balance}

.om .loop{display:grid;grid-template-columns:minmax(0,440px) 1fr;gap:clamp(28px,5vw,68px);align-items:center;margin-top:20px}
.om .loop-svg-wrap{position:relative}
.om .loop svg{width:100%;height:auto;display:block;overflow:visible}
.om .stages{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px}
.om .stage{padding:16px 0;border-top:1px solid var(--om-line);display:grid;grid-template-columns:38px 1fr;gap:16px;align-items:start}
.om .stage:first-child{border-top:none}
.om .stage .n{font-family:var(--om-mono);font-size:.92rem;font-weight:500;color:var(--i3);border:1px solid var(--om-line-2);border-radius:9px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--om-card)}
.om .stage h3{margin-bottom:5px}
.om .stage p{color:var(--om-ink-2);font-size:.96rem}
.om .stage b{color:var(--om-ink);font-weight:500}

.om .dispo{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:34px}
.om .dcard{border:1px solid var(--om-line);border-radius:var(--radius);background:var(--om-card);box-shadow:var(--shadow);padding:22px 20px;display:flex;flex-direction:column;gap:11px;transition:border-color .2s,box-shadow .2s}
.om .dcard:hover{border-color:var(--om-line-2);box-shadow:var(--shadow-lg)}
.om .dcard .verb{font-size:1.2rem;font-weight:700;letter-spacing:-.01em;font-family:var(--om-serif)}
.om .dcard .tag{font-family:var(--om-mono);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;align-self:flex-start;border-radius:99px;padding:4px 10px;border:1px solid transparent}
.om .dcard p{font-size:.9rem;color:var(--om-ink-2);line-height:1.55}
.om .dcard.accept .verb{color:var(--om-teal)}.om .dcard.accept .tag{color:var(--om-teal);background:var(--teal-soft);border-color:rgba(13,126,116,.3)}
.om .dcard.act .verb{color:var(--accent-deep)}.om .dcard.act .tag{color:var(--accent-deep);background:var(--accent-soft);border-color:rgba(59,59,196,.3)}
.om .dcard.ack .verb{color:var(--om-warn)}.om .dcard.ack .tag{color:var(--om-warn);background:var(--amber-soft);border-color:rgba(154,103,0,.28)}
.om .dcard.abandon .verb{color:var(--om-ink-2)}.om .dcard.abandon .tag{color:var(--om-ink-2);background:var(--glass);border-color:var(--om-line)}
.om .dispo-foot{margin-top:20px;font-family:var(--om-mono);font-size:.82rem;color:var(--om-ink-3);letter-spacing:.02em}
.om .dispo-foot b{color:var(--om-crit);font-weight:500}

/* ---------- proof: numbers + ledger ---------- */
.om .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:34px}
.om .stat{border:1px solid var(--om-line);border-radius:var(--radius);background:var(--om-card);box-shadow:var(--shadow);padding:22px 20px}
.om .stat .sv{font-family:var(--om-mono);font-variant-numeric:tabular-nums;font-size:clamp(1.7rem,2.8vw,2.3rem);font-weight:600;letter-spacing:-.02em;color:var(--om-ink)}
.om .stat .sv em{font-style:normal;font-size:.55em;color:var(--om-ink-2)}
.om .stat .sk{font-size:.84rem;color:var(--om-ink-2);margin-top:6px;line-height:1.5}
.om .stats-cap{margin-top:16px;font-family:var(--om-mono);font-size:.72rem;color:var(--om-ink-3);letter-spacing:.04em}

/* ---------- for each seat ---------- */
.om .seats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:34px}
.om .seat{border:1px solid var(--om-line);border-radius:var(--radius);background:var(--om-card);box-shadow:var(--shadow);padding:24px 22px;display:flex;flex-direction:column;gap:12px}
.om .seat .s-role{font-family:var(--om-mono);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--i3)}
.om .seat h3{font-size:1.14rem}
.om .seat p{font-size:.9rem;color:var(--om-ink-2);line-height:1.6}
.om .seat p b{color:var(--om-ink);font-weight:500}
.om .seat .s-screen{margin-top:auto;padding-top:14px;border-top:1px solid var(--om-line);font-family:var(--om-mono);font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--om-ink-3)}

.om .example{border:1px solid var(--om-line);border-radius:var(--radius);background:var(--om-card);box-shadow:var(--shadow);margin-top:32px;overflow:hidden}
.om .ex-head{padding:20px 26px;border-bottom:1px solid var(--om-line);display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
.om .ex-head .who{font-family:var(--om-mono);font-size:.74rem;letter-spacing:.14em;text-transform:uppercase;color:var(--i3)}
.om .ex-head .impact{font-family:var(--om-mono);font-size:.86rem;color:var(--om-crit)}
.om .ex-flow{display:grid;grid-template-columns:repeat(5,1fr)}
.om .ex-step{padding:22px 20px;border-left:1px solid var(--om-line);display:flex;flex-direction:column;gap:8px}
.om .ex-step:first-child{border-left:none}
.om .ex-step .s-tag{font-family:var(--om-mono);font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--om-ink-3)}
.om .ex-step .s-body{font-size:.92rem;color:var(--om-ink-2);line-height:1.5}
.om .ex-step .s-body b{color:var(--om-ink);font-weight:500}
.om .ex-step.pivot{background:var(--teal-soft)}
.om .ex-step.pivot .s-tag{color:var(--om-teal)}

.om .close{text-align:center;padding-bottom:clamp(70px,12vh,130px)}
.om .close h2{max-width:20ch;margin:0 auto 22px}
.om .close .lede{margin:0 auto 34px}
.om .cta{display:inline-flex;align-items:center;gap:9px;font-family:var(--om-sans);font-size:1rem;font-weight:600;text-decoration:none;color:#fff;background:var(--accent);border:1px solid var(--accent);border-radius:8px;padding:14px 26px;box-shadow:var(--shadow);transition:background .2s,border-color .2s}
.om .cta:hover{background:var(--accent-deep);border-color:var(--accent-deep)}
.om .cta .arr{font-family:var(--om-mono)}
.om .close .sig{margin-top:40px;font-family:var(--om-mono);font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;color:var(--om-ink-3)}

@keyframes om-blink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes om-travel{to{stroke-dashoffset:-1508}}
.om .om-pulse{animation:om-travel 6s linear infinite}
@media (prefers-reduced-motion:reduce){.om .om-pulse{animation:none}.om .hero .kicker .live{animation:none}.om .dcard,.om .acard,.om .cta{transition:none}}
@media(max-width:1020px){
  .om .hero-grid{grid-template-columns:1fr}
  .om .viz{display:none}
  .om .anatomy{grid-template-columns:repeat(2,1fr)}
  .om .seats{grid-template-columns:1fr}
  .om .stats{grid-template-columns:repeat(2,1fr)}
}
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
@media(max-width:720px){.om .ind-cards{grid-template-columns:1fr}}
@media(max-width:520px){.om .dispo{grid-template-columns:1fr}.om .anatomy{grid-template-columns:1fr}.om .stats{grid-template-columns:1fr}}
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

/** The system, caught mid-loop: a finding waiting on its human, inside Sense → Find → Decide → Act → Close. */
function HeroViz() {
  return (
    <div className="viz" aria-hidden="true">
      <svg className="wires" viewBox="0 0 560 500" fill="none" preserveAspectRatio="none">
        <g stroke="rgba(26,26,46,.30)" strokeWidth="1.5" strokeDasharray="4 6">
          <path d="M 92 22 H 468" markerEnd="url(#omArr)" />
          <path d="M 514 48 V 430" markerEnd="url(#omArr)" />
          <path d="M 468 478 H 92" markerEnd="url(#omArr)" />
          <path d="M 46 430 V 48" markerEnd="url(#omArr)" />
        </g>
        <defs>
          <marker id="omArr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke="rgba(26,26,46,.45)" strokeWidth="1.5" />
          </marker>
        </defs>
      </svg>
      <div className="node n-sense"><span className="bx">1</span><span className="lb">Sense</span></div>
      <div className="node n-find"><span className="bx">2</span><span className="lb">Find</span></div>
      <div className="node n-act"><span className="bx">4</span><span className="lb">Act</span></div>
      <div className="node n-close"><span className="bx">5</span><span className="lb">Close</span></div>

      <div className="fcard">
        <div className="fc-head">
          <span className="fc-ava">P</span>
          <span className="fc-who">Planning counterpart</span>
          <span className="fc-when">raised 9:20 AM</span>
        </div>
        <div className="fc-title">Frozen category forecast bias is starving modern trade</div>
        <div className="fc-body">≈ AED 1.2M revenue at risk this quarter — traced to the <b>Revenue growth</b> intent.</div>
        <div className="fc-chips">
          <span className="chip crit">critical</span>
          <span className="chip sla">14h SLA</span>
        </div>
        <div className="fc-btns">
          <span className="fbtn primary">Accept</span>
          <span className="fbtn">Act</span>
          <span className="fbtn">Acknowledge</span>
          <span className="fbtn">Abandon</span>
        </div>
        <div className="fc-foot">3 · Decide — yours. The counterparts run the rest.</div>
      </div>
      <div className="viz-cap">A finding, waiting — decide, or it escalates on its SLA</div>
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

      {/* HERO — the story on the left, the system caught working on the right */}
      <section className="hero wrap">
        <div className="hero-grid">
          <div>
            <span className="kicker"><span className="live" /> The Decision Accountability Layer</span>
            <h1>Nothing drifts <span className="grad-text">unanswered</span>.</h1>
            <p className="lede">Every number has an owner and a counterpart. When it drifts, a finding demands a decision — and silence escalates until someone owns the call.</p>
            <p className="thesis-line"><b>Every mandate is held twice</b> — once by a person, once by its counterpart.</p>
            <IndustryPicker />
          </div>
          <HeroViz />
        </div>
      </section>

      {/* THE SYSTEM, NAMED — five primitives, each anchored to the screen it lives in */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The layer, named</span><span className="tick" /></div>
        <h2>Five primitives make up the accountability layer.</h2>
        <p className="lede" style={{ marginTop: 18 }}>Not features — a small vocabulary the whole system is built from. Learn these five and every screen inside will already make sense.</p>
        <div className="anatomy">
          <div className="acard">
            <span className="a-where">Foundation</span>
            <h3>Operating Picture</h3>
            <span className="a-what">The map</span>
            <p>What the company is trying to make true: <b>intents</b>, carried by <b>mandates</b>, verified by <b>senses</b> — one live structure, not a dashboard.</p>
          </div>
          <div className="acard">
            <span className="a-where">Operate</span>
            <h3>Counterparts</h3>
            <span className="a-what">The second holder</span>
            <p>One agent per function stream, plus an org-level chief. Each holds the same mandates its human owner does — and <b>never looks away</b>.</p>
          </div>
          <div className="acard">
            <span className="a-where">Operate</span>
            <h3>Findings</h3>
            <span className="a-what">Drift, made answerable</span>
            <p>When reality leaves a mandate, the counterpart raises a finding with the impact traced to an intent — and an <b>SLA that escalates silence</b>.</p>
          </div>
          <div className="acard">
            <span className="a-where">Operate</span>
            <h3>Closure</h3>
            <span className="a-what">The exit condition</span>
            <p>Accepted findings become measurable exit conditions, watched until met. <b>Nothing is "done" until the number is back.</b></p>
          </div>
          <div className="acard">
            <span className="a-where">Operate</span>
            <h3>Decision Ledger</h3>
            <span className="a-what">The memory</span>
            <p>Every disposition is recorded with its expected impact — and an assessor returns later with the verdict: <b>worked, didn't, too early</b>.</p>
          </div>
        </div>
        <p className="anatomy-foot">Everything is industry-parameterized — the same five primitives, seeded for <b>FMCG</b> and <b>Healthcare</b> operating contexts.</p>
      </section>

      {/* THE SHIFT */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The shift</span><span className="tick" /></div>
        <h2>From a system you <span className="teal">read</span> to one that <span className="grad-text">runs</span>.</h2>
        <div className="shift">
          <div className="col old">
            <div className="col-tag">The reporting era</div>
            <ul>
              <li><span className="m">—</span> A red number on a dashboard is nobody's obligation.</li>
              <li><span className="m">—</span> Insight waits for a human to notice it.</li>
              <li><span className="m">—</span> A problem becomes a meeting, then a deck.</li>
              <li><span className="m">—</span> Drift is caught on the calendar, not the moment.</li>
              <li><span className="m">—</span> Nobody records whether the decision worked.</li>
            </ul>
          </div>
          <div className="col new">
            <div className="col-tag">The accountability layer</div>
            <ul>
              <li><span className="m">→</span> A metric is a <b>mandate</b> with an owner and a counterpart.</li>
              <li><span className="m">→</span> Drift is caught the moment it starts.</li>
              <li><span className="m">→</span> A problem arrives as a <b>finding that must be answered</b>.</li>
              <li><span className="m">→</span> Silence escalates until someone owns the call.</li>
              <li><span className="m">→</span> Every decision gets a verdict: <b>did it work?</b></li>
            </ul>
          </div>
        </div>
      </section>

      {/* OPERATING PICTURE */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The Operating Picture</span><span className="tick" /></div>
        <h2>One live picture of what the company is trying to make true.</h2>
        <p className="lede" style={{ marginTop: 18 }}>Not a dashboard you visit — a structure every counterpart reasons over. Three layers, wired together, so a problem anywhere can be traced to the goal it threatens.</p>
        <div className="tiers">
          <div className="tier intent">
            <div className="t-label"><span className="dot" />Intents</div>
            <div className="t-def"><b>What leadership has declared must become true.</b> Revenue growth. EBITDA margin. On-time delivery. The handful of outcomes the company is steering toward.</div>
          </div>
          <div className="tier-arrow">▲ carried by</div>
          <div className="tier mandate">
            <div className="t-label"><span className="dot" />Mandates</div>
            <div className="t-def"><b>Enforceable commitments each function owns.</b> "Case fill above 97%." "Waste under 3.5%." Not indicators to admire — promises with an owner and a counterpart watching them.</div>
          </div>
          <div className="tier-arrow">▲ verified by</div>
          <div className="tier sense">
            <div className="t-label"><span className="dot" />Senses</div>
            <div className="t-def"><b>What the agents perceive through.</b> The data feeds behind every mandate — POS, plant telemetry, the planning system. A mandate without a sense is blind, and the picture says so.</div>
          </div>
        </div>
        <p className="held">Every mandate is held twice — once by a person, once by its counterpart. The person decides. The counterpart never looks away.</p>
      </section>

      {/* THE LOOP */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">How the agents operate — the loop</span><span className="tick" /></div>
        <h2>A loop that runs whether or not anyone is watching.</h2>
        <div className="loop">
          <div className="loop-svg-wrap">
            <svg viewBox="0 0 600 600" role="img" aria-label="The five-stage operating loop: sense, find, decide, act, close, repeating.">
              <circle cx="300" cy="300" r="240" fill="none" stroke="rgba(26,26,46,.12)" strokeWidth="1.5" />
              <circle className="om-pulse" cx="300" cy="300" r="240" fill="none" stroke="#3B3BC4" strokeWidth="3" strokeLinecap="round" strokeDasharray="90 1418" strokeDashoffset="0" />
              <text x="300" y="290" textAnchor="middle" fontFamily="ui-monospace,SF Mono,Menlo,monospace" fontSize="13" letterSpacing="3" fill="#9A9DB0">CONTINUOUS</text>
              <text x="300" y="318" textAnchor="middle" fontFamily="Iowan Old Style,Palatino,Georgia,serif" fontSize="22" fontWeight="600" fill="#1A1A2E">The loop</text>
              <g fontFamily="ui-monospace,SF Mono,Menlo,monospace" fontSize="15" fontWeight="600">
                <circle cx="300" cy="60" r="27" fill="#FFFFFF" stroke="#3B3BC4" strokeWidth="1.6" />
                <text x="300" y="66" textAnchor="middle" fill="#2E2EA8">1</text>
                <text x="300" y="24" textAnchor="middle" fontSize="14" fill="#1A1A2E">Sense</text>
                <circle cx="528" cy="226" r="27" fill="#FFFFFF" stroke="#3B3BC4" strokeWidth="1.6" />
                <text x="528" y="232" textAnchor="middle" fill="#2E2EA8">2</text>
                <text x="528" y="277" textAnchor="middle" fontSize="14" fill="#1A1A2E">Find</text>
                <circle cx="441" cy="494" r="27" fill="#FFFFFF" stroke="#0D7E74" strokeWidth="1.8" />
                <text x="441" y="500" textAnchor="middle" fill="#0D7E74">3</text>
                <text x="441" y="545" textAnchor="middle" fontSize="14" fill="#1A1A2E">Decide</text>
                <circle cx="159" cy="494" r="27" fill="#FFFFFF" stroke="#3B3BC4" strokeWidth="1.6" />
                <text x="159" y="500" textAnchor="middle" fill="#2E2EA8">4</text>
                <text x="159" y="545" textAnchor="middle" fontSize="14" fill="#1A1A2E">Act</text>
                <circle cx="72" cy="226" r="27" fill="#FFFFFF" stroke="#3B3BC4" strokeWidth="1.6" />
                <text x="72" y="232" textAnchor="middle" fill="#2E2EA8">5</text>
                <text x="72" y="277" textAnchor="middle" fontSize="14" fill="#1A1A2E">Close</text>
              </g>
            </svg>
          </div>
          <ol className="stages">
            <li className="stage"><span className="n">1</span><div><h3>Sense</h3><p>Each counterpart watches the data feeds behind its mandates — <b>continuously</b>, not on a reporting cadence.</p></div></li>
            <li className="stage"><span className="n">2</span><div><h3>Find</h3><p>When reality drifts from a mandate, the counterpart raises a <b>finding</b> and traces its impact path up to the intent it threatens.</p></div></li>
            <li className="stage"><span className="n">3</span><div><h3>Decide</h3><p>The finding demands a human call — one of <b>four dispositions</b>. Nothing proceeds without it; unanswered findings escalate up the chain of counterparts.</p></div></li>
            <li className="stage"><span className="n">4</span><div><h3>Act</h3><p>The decision sets the machine in motion: a watched exit condition, a solution with tasks handed to agents, or a deliberate pause.</p></div></li>
            <li className="stage"><span className="n">5</span><div><h3>Close</h3><p>Nothing is "done" until the number is back — met exit conditions retire the finding, a dismissal <b>tunes the counterpart</b>, and every decision lands in the ledger with a verdict. Then back to sensing.</p></div></li>
          </ol>
        </div>
      </section>

      {/* FOUR DISPOSITIONS */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The decision — four dispositions</span><span className="tick" /></div>
        <h2>The agent brings the finding. The human owns the call.</h2>
        <p className="lede" style={{ marginTop: 18 }}>Every finding forces a choice — and each choice is a different instruction to the organization, not a status you set and forget.</p>
        <div className="dispo">
          <div className="dcard accept"><span className="tag">it's real</span><div className="verb">Accept</div><p>Set a measurable exit condition. The counterpart keeps watching until the number is truly back — then closes the loop itself.</p></div>
          <div className="dcard act"><span className="tag">fix it now</span><div className="verb">Act</div><p>Open a solution, broken into tasks. New work goes to agents, existing agents are reused, humans own the rest.</p></div>
          <div className="dcard ack"><span className="tag">not yet</span><div className="verb">Acknowledge</div><p>A known issue, parked with a trip-wire. It comes back — louder — the moment it crosses the line you set.</p></div>
          <div className="dcard abandon"><span className="tag">not real</span><div className="verb">Abandon</div><p>Dismiss it with a reason. The reason isn't paperwork — it's the signal that <b>tunes the agent</b> so it learns what not to raise.</p></div>
        </div>
        <p className="dispo-foot">No disposition is a decision too — <b>ignored findings escalate automatically</b> up the chain of counterparts until someone owns them.</p>
      </section>

      {/* THE PROOF — NUMBERS + DECISION LEDGER */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The proof — the Decision Ledger</span><span className="tick" /></div>
        <h2>The company's <span className="grad-text">memory of judgment</span>.</h2>
        <p className="lede" style={{ marginTop: 18 }}>Most companies can tell you what they measured. Almost none can tell you what they decided — or whether it worked. Rewive records both, and an assessor comes back later with the verdict.</p>
        <div className="stats">
          <div className="stat"><div className="sv">142</div><div className="sk">Decisions tracked this quarter — each with an owner and a prompt</div></div>
          <div className="stat"><div className="sv">78<em>%</em></div><div className="sk">Decision win rate, judged by the assessor after the fact — up from 61%</div></div>
          <div className="stat"><div className="sv">4.0<em>h</em></div><div className="sk">Median time from finding to disposition — was 2.1 days</div></div>
          <div className="stat"><div className="sv">AED 1.2<em>M</em></div><div className="sk">Measured impact this quarter, across 31 assessed decisions</div></div>
        </div>
        <p className="stats-cap">From the FMCG demo organization's current quarter.</p>
        <div className="tiers">
          <div className="tier intent">
            <div className="t-label"><span className="dot" />Recorded</div>
            <div className="t-def"><b>Every decision, the moment it's made.</b> Who made it, human or agent, what finding prompted it, and what it was expected to cost or earn.</div>
          </div>
          <div className="tier mandate">
            <div className="t-label"><span className="dot" />Judged</div>
            <div className="t-def"><b>An assessor returns with a verdict.</b> Worked, didn't work, or too early to tell — with the measured impact next to the estimate that justified the call.</div>
          </div>
          <div className="tier sense">
            <div className="t-label"><span className="dot" />Closed</div>
            <div className="t-def"><b>Nothing is "done" until the number is back.</b> Accepted findings become exit conditions the counterpart watches; acknowledged ones sit on a trip-wire.</div>
          </div>
        </div>
        <p className="held">Auditable by a CFO, not just admired in a review meeting — the ledger is what the accountability layer produces.</p>
      </section>

      {/* FOR EACH SEAT */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">The same layer, from three seats</span><span className="tick" /></div>
        <h2>What it means for the person holding the number.</h2>
        <div className="seats">
          <div className="seat">
            <span className="s-role">Rewive for the store manager</span>
            <h3>Your mandates, your findings, one tap to answer.</h3>
            <p>The Command Center filters to the mandates you hold. A finding arrives sized to your store — <b>what drifted, what it costs, what the counterpart suggests</b> — and your disposition is one tap, with the SLA clock visible.</p>
            <span className="s-screen">Command Center · persona: store manager</span>
          </div>
          <div className="seat">
            <span className="s-role">Rewive for the operations head</span>
            <h3>Every stream's drift and closure, in one picture.</h3>
            <p>The Operating Picture shows where drift concentrates; escalations reach you <b>only when a finding sits unanswered</b> below you. Loop speed per mandate shows where decisions move fast — and where they stall.</p>
            <span className="s-screen">Operating Picture · Performance</span>
          </div>
          <div className="seat">
            <span className="s-role">Rewive for the CFO</span>
            <h3>A ledger of judgment you can audit.</h3>
            <p>Every decision is priced going in and measured coming out. Win rate, median time-to-decision, measured impact by quarter — <b>the memory of judgment, auditable</b>, not anecdotes in a review deck.</p>
            <span className="s-screen">Decision Ledger · persona: CFO</span>
          </div>
        </div>
      </section>

      {/* WORKED EXAMPLE */}
      <section className="wrap">
        <div className="sec-eyebrow"><span className="eyebrow">One finding, end to end · FMCG</span><span className="tick" /></div>
        <h2>What the loop looks like on a real problem.</h2>
        <div className="example">
          <div className="ex-head">
            <span className="who">Raised by the Planning counterpart</span>
            <span className="impact">≈ AED 1.2M revenue at risk this quarter</span>
          </div>
          <div className="ex-flow">
            <div className="ex-step"><span className="s-tag">1 · Sense</span><span className="s-body">Watches the <b>POS and forecast feeds</b> behind the frozen-category fill mandate.</span></div>
            <div className="ex-step"><span className="s-tag">2 · Find</span><span className="s-body">"Frozen forecast bias is starving modern trade." Traced up to the <b>Revenue growth</b> intent.</span></div>
            <div className="ex-step pivot"><span className="s-tag">3 · Decide</span><span className="s-body">The planning owner reviews the impact path and clicks <b>Accept</b>.</span></div>
            <div className="ex-step"><span className="s-tag">4 · Act</span><span className="s-body">Exit condition set: <b>frozen fill ≥ 96% for four straight weeks</b>, watched automatically.</span></div>
            <div className="ex-step"><span className="s-tag">5 · Close</span><span className="s-body">Fill recovers, the condition is met, the finding <b>closes itself</b> — and the decision lands in the ledger with its verdict.</span></div>
          </div>
        </div>
      </section>

      {/* CLOSE */}
      <section className="close wrap">
        <h2>A red number is <span className="grad-text">no longer nobody's problem</span>.</h2>
        <p className="lede">The organization does the work. Its counterparts make sure the work still serves the intent, catch it when it doesn't, and bring you the decision the moment it counts.</p>
        <div><a href="#start" className="cta">Choose your context <span className="arr">↑</span></a></div>
        <p className="sig">Every mandate, held twice.</p>
      </section>
    </div>
  );
}
