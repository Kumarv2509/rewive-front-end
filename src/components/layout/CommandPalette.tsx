import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useFindings } from '../../api/shadowOrg';
import { useRunSweepNow } from '../../api/tracking';
import { useCurrentUser } from '../../api/dashboard';
import { useToast } from '../shared/Toast';
import { usePersonaLens, useEffectiveLens } from './personaLens';
import { personaLabel, personaGroupsForIndustry, ROLE_CHILDREN } from '../../screens/CommandCenter/personas';
import { clearActiveTenant } from '../../tenants';
import { THEMES, setTheme } from '../../theme';
import type { Finding } from '../../api/types';

// The ⌘K bar, made real. One box that answers "where is X" and "do X" without
// leaving the keyboard: every screen the rail can reach, every finding in the
// current lens, and the handful of verbs that are otherwise buried on a screen
// (run a sweep, change lens, switch org). It searches what the lens shows —
// same rule as every other surface — so results never contradict the queue.

interface PaletteContextValue {
  open: () => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- co-located with its provider intentionally
export function useCommandPalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({ open }), [open]);
  return (
    <PaletteContext.Provider value={value}>
      {children}
      {isOpen && <Palette onClose={() => setIsOpen(false)} />}
    </PaletteContext.Provider>
  );
}

// ---------- The item model ----------

type ItemGroup = 'Go to' | 'Findings' | 'Do';

interface Item {
  id: string;
  group: ItemGroup;
  label: string;
  /** Quiet second line — what this is, or why it needs you. */
  hint?: string;
  /** Right-aligned tag: the loop stage for screens, the status for findings. */
  tag?: string;
  /** Extra words that match but are not shown (route slugs, old names). */
  keywords?: string;
  run: () => void;
}

// Every destination the rail can reach, plus the merged sub-surfaces that only
// exist as tabs. Kept flat and hand-written rather than derived from
// NAV_GROUPS: the palette wants tab-level destinations the rail deliberately
// hides, and their plain-language names.
interface Dest {
  to: string;
  label: string;
  hint: string;
  tag?: string;
  keywords?: string;
}

const DESTINATIONS: Dest[] = [
  { to: '/command', label: 'Today', hint: 'Everything waiting on you', tag: 'Sense', keywords: 'queue home command center inbox' },
  { to: '/operate/findings?tab=open', label: 'Findings — Open', hint: 'Drift that needs a decision', tag: 'Find', keywords: 'signals drift needs decision' },
  { to: '/operate/findings?tab=watching', label: 'Findings — Watching', hint: 'Accepted, waiting for the number to come back', tag: 'Close', keywords: 'closure recovery targets exit conditions' },
  { to: '/operate/findings?tab=closed', label: 'Findings — Closed', hint: 'The number came back', tag: 'Close', keywords: 'closure done history' },
  { to: '/operate/findings?view=agents', label: 'Findings by agent', hint: 'Grouped by the agent that raised them', tag: 'Find', keywords: 'counterparts by agent' },
  { to: '/operate/decisions', label: 'Decisions', hint: 'The ledger — every call and its later verdict', tag: 'Decide', keywords: 'ledger verdicts assessor record' },
  { to: '/operate/runs', label: 'Execution — Runs', hint: 'Work in flight', tag: 'Act', keywords: 'workflows jobs' },
  { to: '/operate/tasks', label: 'Execution — Tasks', hint: 'The task board', tag: 'Act', keywords: 'todo board' },
  { to: '/operate/counterparts', label: 'Agents', hint: 'The agent holding each number alongside a person', keywords: 'shadow org counterparts holders' },
  { to: '/operate/agent-teams', label: 'Agent teams', hint: 'The loop as a team hierarchy', keywords: 'org chart teams' },
  { to: '/insights/agents', label: 'Workforce', hint: 'The workers that run the fixes', keywords: 'agent space catalog workers roi' },
  { to: '/insights/people', label: 'Performance', hint: 'How the org is deciding', keywords: 'people leaderboard loop speed' },
  { to: '/business/overview', label: 'Business', hint: 'The base data the mandates stand on', keywords: 'context dimensions' },
  { to: '/business/pl', label: 'Business — P&L', hint: 'The statement, with anomalies roped to findings', keywords: 'profit loss statement financials' },
  { to: '/business/sku', label: 'Business — SKU sales', hint: 'Sales by product', keywords: 'products items' },
  { to: '/business/customers', label: 'Business — Customer sales', hint: 'Sales by customer', keywords: 'accounts' },
  { to: '/build/picture', label: 'Operating Picture', hint: 'The graph: intents ← mandates ← signals', keywords: 'foundation brain kpi tree map' },
  { to: '/build/kpis', label: 'Mandates', hint: 'The numbers someone is on the hook for', keywords: 'kpi library foundation' },
  { to: '/build/connectors', label: 'Connectors', hint: 'Live tracking, ingest keys, sweep history', keywords: 'foundation integrations data upload csv tracking' },
  { to: '/build/datasets', label: 'Datasets', hint: 'The data that feeds the picture', keywords: 'foundation files sources' },
  { to: '/guide', label: 'Guide', hint: 'The loop in five slides', keywords: 'help intro tour onboarding' },
];

// The lifecycle word each finding status carries in UI copy — the same words
// the Findings tabs use, so a palette row and the screen it opens agree.
const FINDING_TAG: Record<string, string> = {
  open: 'Needs a decision',
  accepted: 'Watching',
  acting: 'Acting',
  acknowledged: 'Parked',
  abandoned: 'Dismissed',
  closed: 'Closed',
};

// ---------- Matching ----------

/** Subsequence match with a light score: earlier hits and word-start hits win,
 *  so "fin op" ranks "Findings — Open" above a finding that merely contains
 *  both letters. Returns null when the query is not a subsequence at all. */
function score(haystack: string, needle: string): number | null {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  let total = 0;
  let from = 0;
  for (const word of needle.toLowerCase().split(/\s+/).filter(Boolean)) {
    const at = h.indexOf(word, from);
    if (at === -1) {
      // Fall back to anywhere in the string, so word order is forgiving.
      const loose = h.indexOf(word);
      if (loose === -1) return null;
      total += loose + 40;
      continue;
    }
    const wordStart = at === 0 || /[\s—·(-]/.test(h[at - 1]);
    total += at + (wordStart ? 0 : 12);
    from = at + word.length;
  }
  return total;
}

// ---------- The palette ----------

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setLens, setHierarchy } = usePersonaLens();
  const { persona, scope, hierarchy } = useEffectiveLens();
  const { data: currentUser } = useCurrentUser();
  const { data: findings } = useFindings({ persona, scope });
  const { mutate: runSweepNow } = useRunSweepNow();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const go = useCallback(
    (to: string) => {
      navigate(to);
      onClose();
    },
    [navigate, onClose],
  );

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];

    for (const d of DESTINATIONS) {
      out.push({
        id: `go:${d.to}`,
        group: 'Go to',
        label: d.label,
        hint: d.hint,
        tag: d.tag,
        keywords: `${d.keywords ?? ''} ${d.to}`,
        run: () => go(d.to),
      });
    }

    for (const f of (findings ?? []) as Finding[]) {
      out.push({
        id: `finding:${f.id}`,
        group: 'Findings',
        label: f.title,
        hint: `${f.raisedByAgentName}${f.entity ? ` · ${f.entity}` : ''} · ${f.impactEstimate}`,
        tag: FINDING_TAG[f.status] ?? f.status,
        keywords: `${f.id} ${f.summary} ${f.streamKey} ${f.severity} ${f.region ?? ''}`,
        run: () => go(`/operate/findings/${f.id}`),
      });
    }

    out.push({
      id: 'do:sweep',
      group: 'Do',
      label: 'Run an agent sweep now',
      hint: 'Re-read every live-tracked mandate and raise what drifted',
      keywords: 'sweep refresh check tracking live drift',
      run: () => {
        runSweepNow(undefined, {
          onSuccess: () => showToast('Sweep finished — findings refreshed'),
          onError: () => showToast('Sweep failed'),
        });
        showToast('Sweep started…');
        onClose();
      },
    });

    // Lens verbs, only for admins — a locked non-admin cannot change what they
    // see, and offering it would lie about that.
    if (currentUser?.isAdmin) {
      out.push({
        id: 'do:lens:all',
        group: 'Do',
        label: 'Set lens to All lenses',
        hint: 'See every role at once',
        keywords: 'lens persona role everything',
        run: () => {
          setLens('all');
          showToast('Lens: All lenses');
          onClose();
        },
      });
      for (const group of personaGroupsForIndustry()) {
        for (const p of group.roles) {
          out.push({
            id: `do:lens:${p}`,
            group: 'Do',
            label: `Set lens to ${personaLabel(p)}`,
            hint: group.label,
            keywords: `lens persona role ${p}`,
            run: () => {
              setLens(p);
              showToast(`Lens: ${personaLabel(p)}`);
              onClose();
            },
          });
        }
      }
    }

    if (persona !== 'all' && (ROLE_CHILDREN[persona]?.length ?? 0) > 0) {
      out.push({
        id: 'do:hierarchy',
        group: 'Do',
        label: hierarchy ? 'Show only my own role' : "Show my team's work too",
        hint: hierarchy ? 'Drop the reporting subtree from every screen' : 'Include everything owned by the roles below me',
        keywords: 'team hierarchy scope reports subtree',
        run: () => {
          setHierarchy(!hierarchy);
          showToast(hierarchy ? 'Lens: role only' : 'Lens: + their team');
          onClose();
        },
      });
    }

    for (const t of THEMES) {
      out.push({
        id: `do:theme:${t.id}`,
        group: 'Do',
        label: `Appearance: ${t.label}`,
        hint: t.hint,
        keywords: 'theme appearance look dark light mode skin style',
        run: () => {
          setTheme(t.id);
          showToast(`Appearance: ${t.label}`);
          onClose();
        },
      });
    }

    out.push({
      id: 'do:switch-org',
      group: 'Do',
      label: 'Switch organization',
      hint: 'Sign in to another tenant',
      keywords: 'tenant login sign out company',
      run: () => {
        clearActiveTenant();
        navigate('/login');
        onClose();
      },
    });

    return out;
  }, [findings, go, navigate, onClose, currentUser, persona, hierarchy, runSweepNow, setHierarchy, setLens, showToast]);

  // Empty query shows a short standing menu — the loop's screens and the
  // findings actually waiting on a decision — rather than 200 rows.
  const results = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const needsDecision = items.filter((i) => i.group === 'Findings' && i.tag === FINDING_TAG.open).slice(0, 4);
      const screens = items.filter((i) => i.group === 'Go to').slice(0, 6);
      const verbs = items
        .filter((i) => i.group === 'Do' && !i.id.startsWith('do:lens:') && !i.id.startsWith('do:theme:'))
        .slice(0, 3);
      return [...needsDecision, ...screens, ...verbs];
    }
    return items
      .map((item) => {
        const s = score(`${item.label} ${item.hint ?? ''} ${item.keywords ?? ''}`, q);
        return s === null ? null : { item, s };
      })
      .filter((r): r is { item: Item; s: number } => r !== null)
      .sort((a, b) => a.s - b.s)
      .slice(0, 12)
      .map((r) => r.item);
  }, [items, query]);

  // Group headers are resolved here rather than while mapping — the compiler
  // rules bar mutating a render-scoped cursor inside JSX.
  const rows = useMemo(
    () => results.map((item, i) => ({ item, header: item.group !== results[i - 1]?.group ? item.group : null })),
    [results],
  );

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="1"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[active]?.run();
    }
  };

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk-input-row">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            className="cmdk-input"
            value={query}
            placeholder="Search findings and screens, or run a command…"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 && <div className="cmdk-empty">Nothing matches “{query.trim()}”.</div>}
          {rows.map(({ item, header }, i) => (
            <div key={item.id}>
              {header && <div className="cmdk-group">{header}</div>}
              <button
                type="button"
                className={`cmdk-item${i === active ? ' on' : ''}`}
                data-active={i === active ? '1' : '0'}
                onMouseEnter={() => setActive(i)}
                onClick={item.run}
              >
                <span className="cmdk-item-main">
                  <span className="cmdk-item-label">{item.label}</span>
                  {item.hint && <span className="cmdk-item-hint">{item.hint}</span>}
                </span>
                {item.tag && <span className="cmdk-item-tag">{item.tag}</span>}
              </button>
            </div>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><span className="kbd">↑↓</span> move</span>
          <span><span className="kbd">↵</span> open</span>
          <span className="cmdk-foot-lens">
            Searching {persona === 'all' ? 'all lenses' : personaLabel(persona)}
            {persona !== 'all' && hierarchy ? ' + their team' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
