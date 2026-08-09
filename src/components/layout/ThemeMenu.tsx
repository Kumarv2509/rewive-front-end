import { useEffect, useRef, useState } from 'react';
import { THEMES, getTheme, setTheme } from '../../theme';

// Appearance lives in global chrome like the lens: pick once, it follows you
// everywhere (persisted as rewive.theme). Same popover idiom as LensMenu.
export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getTheme);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // The ⌘K palette can also change the theme; re-reading on open keeps the
  // checkmark honest without a cross-component subscription.
  const toggle = () => {
    setCurrent(getTheme());
    setOpen((o) => !o);
  };

  return (
    <div className="lens-menu" ref={wrapRef}>
      <button
        type="button"
        className="lens-btn"
        aria-expanded={open}
        title="Appearance"
        onClick={toggle}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-label">Appearance</div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`menu-item${t.id === current ? ' on' : ''}`}
              onClick={() => {
                setTheme(t.id);
                setCurrent(t.id);
                setOpen(false);
              }}
            >
              <span style={{ flex: 1 }}>{t.label}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
