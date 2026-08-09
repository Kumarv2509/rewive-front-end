// Appearance themes. The look is a token set in globals.css selected by
// `data-theme` on <html>; this module owns which one is active. Signal is the
// default; "classic" is the July-2026 zinc+indigo look; "terminal" is the dark
// trading desk. index.html applies the stored choice inline before first paint
// (no flash) — this module is the one writer after that.
export type ThemeId = 'signal' | 'classic' | 'terminal';

const KEY = 'rewive.theme';
export const DEFAULT_THEME: ThemeId = 'signal';

export const THEMES: { id: ThemeId; label: string; hint: string }[] = [
  { id: 'signal', label: 'Signal', hint: 'Light, hard rules, alarm-orange drift' },
  { id: 'classic', label: 'Classic', hint: 'Quiet zinc and indigo' },
  { id: 'terminal', label: 'Terminal', hint: 'Dark. Numbers are the interface' },
];

function isTheme(v: string | null): v is ThemeId {
  return v === 'signal' || v === 'classic' || v === 'terminal';
}

export function getTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // storage unavailable — fall through
  }
  return DEFAULT_THEME;
}

export function setTheme(id: ThemeId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // storage unavailable — still apply for this page
  }
  applyTheme(id);
}

export function applyTheme(id: ThemeId = getTheme()) {
  document.documentElement.setAttribute('data-theme', id);
}
