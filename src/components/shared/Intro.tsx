import { useEffect, useState, type ReactNode } from 'react';

// One-line screen intro. Everything else — what to do here, and the doctrine
// behind it — lives behind a single "Help" button that opens a small popup.
// One entry point rather than an inline box plus a disclosure: the screen
// stays clean, and help is in the same place on every screen.
export function Intro({ line, more, doThis }: { line: ReactNode; more?: ReactNode; doThis?: ReactNode[] }) {
  const [open, setOpen] = useState(false);
  const hasHelp = (doThis && doThis.length > 0) || !!more;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="intro">
      <span className="intro-line">
        {line}
        {hasHelp && (
          <button className="intro-help" onClick={() => setOpen(true)}>What to do here</button>
        )}
      </span>

      {open && (
        <div className="help-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div
            className="help-modal"
            role="dialog"
            aria-modal="true"
            aria-label="What to do here"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="help-head">
              <h3>What to do here</h3>
              <button className="help-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
            {doThis && doThis.length > 0 && (
              <ol className="help-steps">
                {doThis.map((item, i) => <li key={i}>{item}</li>)}
              </ol>
            )}
            {more && (
              <div className="help-more">
                <div className="help-more-head">How this works</div>
                {more}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
