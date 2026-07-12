export interface AreaNavItem {
  to: string;
  label: string;
  end?: boolean;
  badgeKey?: 'pendingDecisions';
  icon: 'home' | 'clock' | 'check' | 'plus' | 'plug' | 'studio' | 'grid' | 'people' | 'chart' | 'signal' | 'tasks' | 'brain' | 'shadow' | 'loop';
}

export interface Area {
  key: 'operate' | 'build' | 'insights';
  label: string;
  basePath: string;
  items: AreaNavItem[];
}

// Operate walks the loop's hero path (findings → closure → ledger); Foundation
// holds setup surfaces. Agent-building screens stay routable but are off the nav —
// they're reached from a finding's Act disposition, not browsed to.
export const AREAS: Area[] = [
  {
    key: 'operate',
    label: 'Operate',
    basePath: '/command',
    items: [
      { to: '/command', label: 'Command Center', end: true, icon: 'home' },
      { to: '/operate/findings', label: 'Findings', icon: 'signal' },
      { to: '/operate/closure', label: 'Closure', icon: 'loop' },
      { to: '/operate/decisions', label: 'Decision Ledger', icon: 'check' },
      { to: '/operate/counterparts', label: 'Counterparts', icon: 'shadow' },
      { to: '/operate/runs', label: 'Runs & Actions', icon: 'clock', badgeKey: 'pendingDecisions' },
      { to: '/operate/tasks', label: 'Tasks', icon: 'tasks' },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    basePath: '/insights',
    items: [
      { to: '/insights/outcomes', label: 'Outcomes', icon: 'chart' },
      { to: '/insights/people', label: 'Performance', icon: 'people' },
      { to: '/insights/agents', label: 'Agent Space', icon: 'grid' },
    ],
  },
  {
    key: 'build',
    label: 'Foundation',
    basePath: '/build',
    items: [
      { to: '/build/picture', label: 'Operating Picture', icon: 'brain' },
      { to: '/build/kpis', label: 'Mandate Library', icon: 'chart' },
      { to: '/build/connectors', label: 'Data Connectors', icon: 'plug' },
    ],
  },
];

export function getAreaKeyFromPath(pathname: string): Area['key'] {
  if (pathname.startsWith('/build')) return 'build';
  if (pathname.startsWith('/insights')) return 'insights';
  return 'operate';
}

export function getArea(key: Area['key']): Area {
  return AREAS.find((a) => a.key === key) ?? AREAS[0];
}
