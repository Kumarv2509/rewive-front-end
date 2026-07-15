import { Link, useLocation } from 'react-router-dom';

export interface SectionTab {
  to: string;
  label: string;
  /** Path prefix that marks this tab active (routes can carry params). */
  match: string;
}

// Tab header for merged nav surfaces (Execution = runs/tasks/outcomes,
// Agents = counterparts/workforce). Tabs are links, so each surface keeps its
// URL and old bookmarks keep working.
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const { pathname } = useLocation();
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={`tab${pathname.startsWith(t.match) ? ' active' : ''}`}
          style={{ textDecoration: 'none' }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- tab presets co-located with the component intentionally
export const EXECUTION_TABS: SectionTab[] = [
  { to: '/operate/runs', label: 'Runs & actions', match: '/operate/runs' },
  { to: '/operate/tasks', label: 'Tasks', match: '/operate/tasks' },
  { to: '/insights/outcomes/latest', label: 'Outcomes', match: '/insights/outcomes' },
];

// eslint-disable-next-line react-refresh/only-export-components -- tab presets co-located with the component intentionally
export const AGENTS_TABS: SectionTab[] = [
  { to: '/operate/counterparts', label: 'Counterparts', match: '/operate/counterparts' },
  { to: '/insights/agents', label: 'Workforce', match: '/insights/agents' },
];
