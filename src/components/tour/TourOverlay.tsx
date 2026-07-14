import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TOUR_STEPS } from './steps';
import { endTour, goToStep, useTour } from './store';

// Deep link: any app URL with ?tour=N starts the spotlight tour at step N
// (1-based) — handy for demos and for linking someone straight into a step.
function stepFromUrl(): number | null {
  const t = new URLSearchParams(window.location.search).get('tour');
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isNaN(n) ? 0 : Math.min(Math.max(n, 1), TOUR_STEPS.length) - 1;
}

// How long to keep looking for a step's anchor before showing the step
// centered anyway (screens fetch their data, so anchors appear late).
const FIND_TIMEOUT_MS = 6000;
const POLL_MS = 150;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const css = `
.tr-block{position:fixed;inset:0;z-index:80}
.tr-dim{position:fixed;inset:0;z-index:80;background:rgba(5,5,14,.72)}
.tr-hl{position:fixed;z-index:81;pointer-events:none;border-radius:14px;border:1.5px solid rgba(139,92,246,.95);
  box-shadow:0 0 0 200vmax rgba(5,5,14,.72),0 0 26px rgba(139,92,246,.5);
  transition:top .25s ease,left .25s ease,width .25s ease,height .25s ease}
.tr-card{position:fixed;z-index:82;width:min(400px,calc(100vw - 32px));background:#12121F;color:#F1F1F7;
  border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:18px 20px 16px;
  box-shadow:0 18px 50px rgba(0,0,0,.55);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif}
.tr-eyebrow{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.66rem;letter-spacing:.16em;
  text-transform:uppercase;color:#63678B;margin-bottom:8px;padding-right:24px}
.tr-title{font-size:16px;font-weight:700;letter-spacing:-.2px;margin:0 0 8px}
.tr-body{font-size:13px;line-height:1.6;color:#A6A9C8;margin:0 0 14px}
.tr-note{font-size:11.5px;color:#63678B;font-style:italic;margin:-6px 0 14px}
.tr-foot{display:flex;align-items:center;gap:8px}
.tr-count{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.72rem;color:#63678B;margin-right:auto}
.tr-btn{font-size:12.5px;font-weight:600;border-radius:10px;padding:8px 16px;cursor:pointer;font-family:inherit;
  color:#F1F1F7;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.045);transition:background .2s}
.tr-btn:hover{background:rgba(255,255,255,.1)}
.tr-btn.primary{border:none;background:linear-gradient(120deg,#6366F1,#8B5CF6,#A855F7);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 0 20px rgba(124,99,255,.35)}
.tr-btn.primary:hover{filter:brightness(1.1);background:linear-gradient(120deg,#6366F1,#8B5CF6,#A855F7)}
.tr-x{position:absolute;top:10px;right:10px;width:26px;height:26px;border-radius:8px;border:none;cursor:pointer;
  background:transparent;color:#63678B;font-size:15px;line-height:1;transition:all .2s}
.tr-x:hover{background:rgba(255,255,255,.08);color:#F1F1F7}
`;

function sameRect(a: Rect | null, b: Rect): boolean {
  return (
    !!a &&
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

export function TourOverlay() {
  const { active, index } = useTour();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const step = active ? TOUR_STEPS[index] : undefined;
  const [rect, setRect] = useState<Rect | null>(null);
  const [missing, setMissing] = useState(false);

  // Reset tracking whenever the step (or the screen under it) changes —
  // done during render, per React's "adjusting state on prop change" pattern.
  const [stepKey, setStepKey] = useState('');
  const key = `${active}|${index}|${pathname}`;
  if (key !== stepKey) {
    setStepKey(key);
    setRect(null);
    setMissing(false);
  }

  useEffect(() => {
    const fromUrl = stepFromUrl();
    if (fromUrl !== null) goToStep(fromUrl);
  }, []);

  // Each step owns a route; bring the app there when the step becomes current.
  useEffect(() => {
    if (step && pathname !== step.route) navigate(step.route);
  }, [step, pathname, navigate]);

  // Find the step's anchor, scroll it into view, then keep tracking it
  // (the poll doubles as resize/scroll/layout-shift handling).
  useEffect(() => {
    if (!step?.target || pathname !== step.route) return;
    const started = performance.now();
    let scrolled = false;
    const tick = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          scrolled = true;
        }
        const r = el.getBoundingClientRect();
        const next = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect((prev) => (sameRect(prev, next) ? prev : next));
        setMissing(false);
      } else if (performance.now() - started > FIND_TIMEOUT_MS) {
        setMissing(true);
      }
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [step, pathname]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  if (!step) return null;

  const last = index === TOUR_STEPS.length - 1;
  const pad = 8;
  const hl = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Card below the highlight when there's room, above it otherwise; for
  // near-full-screen highlights (or no anchor) it sits bottom-center.
  let cardStyle: React.CSSProperties;
  if (hl) {
    const spaceBelow = window.innerHeight - (hl.top + hl.height);
    const left = Math.max(16, Math.min(hl.left, window.innerWidth - 416));
    if (spaceBelow >= 260) {
      cardStyle = { top: hl.top + hl.height + 14, left };
    } else if (hl.top >= 260) {
      cardStyle = { bottom: window.innerHeight - hl.top + 14, left };
    } else {
      cardStyle = { bottom: 24, left: '50%', transform: 'translateX(-50%)' };
    }
  } else {
    cardStyle = step.target
      ? { bottom: 24, left: '50%', transform: 'translateX(-50%)' }
      : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }

  return (
    <>
      <style>{css}</style>
      {hl ? (
        <>
          <div className="tr-block" />
          <div className="tr-hl" style={hl} />
        </>
      ) : (
        <div className="tr-dim" />
      )}
      <div className="tr-card" style={cardStyle}>
        <button className="tr-x" aria-label="End tour" onClick={endTour}>✕</button>
        <div className="tr-eyebrow">{step.where}</div>
        <div className="tr-title">{step.title}</div>
        <p className="tr-body">{step.body}</p>
        {missing && (
          <div className="tr-note">This element isn't on screen right now — you can still read the step and continue.</div>
        )}
        <div className="tr-foot">
          <span className="tr-count">{index + 1} / {TOUR_STEPS.length}</span>
          {index > 0 && (
            <button className="tr-btn" onClick={() => goToStep(index - 1)}>Back</button>
          )}
          {last ? (
            <button className="tr-btn primary" onClick={endTour}>Finish</button>
          ) : (
            <button className="tr-btn primary" onClick={() => goToStep(index + 1)}>Next →</button>
          )}
        </div>
      </div>
    </>
  );
}
