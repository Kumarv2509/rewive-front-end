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

export const AREAS: Area[] = [
  {
    key: 'operate',
    label: 'Operate',
    basePath: '/command',
    items: [
      { to: '/command', label: 'Command Center', end: true, icon: 'home' },
      { to: '/operate/shadow', label: 'Shadow Org', icon: 'shadow' },
      { to: '/operate/runs', label: 'Runs & Actions', icon: 'clock', badgeKey: 'pendingDecisions' },
      { to: '/operate/decisions', label: 'Decision Ledger', icon: 'check' },
      { to: '/operate/tasks', label: 'Tasks', icon: 'tasks' },
    ],
  },
  {
    key: 'build',
    label: 'Build',
    basePath: '/build',
    items: [
      { to: '/build/picture', label: 'Operating Picture', icon: 'brain' },
      { to: '/build/kpis', label: 'Mandate Library', icon: 'chart' },
      { to: '/build/create', label: 'Create an Agent', icon: 'plus' },
      { to: '/build/connectors', label: 'Data Connectors', icon: 'plug' },
      { to: '/build/studio', label: 'Agent Studio', icon: 'studio' },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    basePath: '/insights',
    items: [
      { to: '/insights/agents', label: 'Agent Space', icon: 'grid' },
      { to: '/insights/people', label: 'People & Agents', icon: 'people' },
      { to: '/insights/outcomes', label: 'Outcomes', icon: 'chart' },
      { to: '/insights/findings', label: 'Findings', icon: 'signal' },
      { to: '/insights/closure', label: 'Closure', icon: 'loop' },
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
