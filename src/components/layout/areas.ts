export type NavIconKey =
  | 'home' | 'clock' | 'check' | 'plus' | 'plug' | 'studio' | 'grid' | 'people'
  | 'chart' | 'signal' | 'tasks' | 'brain' | 'shadow' | 'loop';

export interface AreaNavItem {
  to: string;
  label: string;
  end?: boolean;
  icon: NavIconKey;
  /** Extra path prefixes that keep this item highlighted (merged surfaces). */
  match?: string[];
  /** Loop-stage word rendered right-aligned on the rail item. */
  stage?: string;
}

export interface NavGroup {
  /** Quiet uppercase label above the group; omitted for the first group. */
  label?: string;
  items: AreaNavItem[];
}

// The rail is grouped so the loop is visible at a glance: Today (what needs
// you), then the loop stages Find → Decide → Act, then the org, then setup.
// Merged surfaces (Execution = runs+tasks+outcomes, Agents = agents+workforce)
// stay on their original routes; `match` keeps the rail item lit across the
// set. The Act sub-flow (solution design → agent build) is reached from a
// finding, so it keeps Findings lit — mid-loop, not "Foundation".
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/command', label: 'Today', end: true, icon: 'home' }],
  },
  {
    label: 'The loop',
    items: [
      { to: '/operate/findings', label: 'Findings', icon: 'signal', stage: 'Find', match: ['/operate/findings', '/operate/closure', '/insights/signals', '/build/solutions', '/build/agent-studio', '/build/studio', '/build/create'] },
      { to: '/operate/decisions', label: 'Decisions', icon: 'check', stage: 'Decide' },
      { to: '/operate/runs', label: 'Execution', icon: 'clock', stage: 'Act', match: ['/operate/runs', '/operate/tasks', '/insights/outcomes'] },
    ],
  },
  {
    label: 'The org',
    items: [
      { to: '/operate/counterparts', label: 'Agents', icon: 'shadow', match: ['/operate/counterparts', '/insights/agents', '/operate/agent-teams'] },
      { to: '/insights/people', label: 'Performance', icon: 'people' },
      { to: '/business/overview', label: 'Business', icon: 'chart', match: ['/business'] },
    ],
  },
  {
    label: 'Setup',
    items: [
      { to: '/build/picture', label: 'Foundation', icon: 'brain', match: ['/build/picture', '/build/kpis', '/build/connectors', '/build/datasets'] },
    ],
  },
];

export const NAV_ITEMS: AreaNavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function isNavItemActive(item: AreaNavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  const prefixes = item.match ?? [item.to];
  return prefixes.some((p) => pathname.startsWith(p));
}
