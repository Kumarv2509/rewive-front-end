// First-visit flag: the Command Center auto-opens the tour until this is set.
export const GUIDE_SEEN_KEY = 'rewive.guideSeen';

export function hasSeenGuide(): boolean {
  try { return localStorage.getItem(GUIDE_SEEN_KEY) === '1'; } catch { return true; }
}

export function markGuideSeen(): void {
  try { localStorage.setItem(GUIDE_SEEN_KEY, '1'); } catch { /* ignore */ }
}
