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
}

// One flat rail, ordered by the loop: what needs you → find → decide → act →
// who does the work → how fast the loop closes → setup. Merged surfaces
// (Execution = runs+tasks+outcomes, Agents = counterparts+workforce) stay on
// their original routes; `match` keeps the rail item lit across the set.
// The Act sub-flow (solution design → agent build) is reached from a finding,
// so it keeps Findings lit — mid-loop, not "Foundation".
export const NAV_ITEMS: AreaNavItem[] = [
  { to: '/command', label: 'Today', end: true, icon: 'home' },
  { to: '/operate/findings', label: 'Findings', icon: 'signal', match: ['/operate/findings', '/operate/closure', '/insights/signals', '/build/solutions', '/build/agent-studio', '/build/studio', '/build/create'] },
  { to: '/operate/decisions', label: 'Decisions', icon: 'check' },
  { to: '/operate/runs', label: 'Execution', icon: 'clock', match: ['/operate/runs', '/operate/tasks', '/insights/outcomes'] },
  { to: '/operate/counterparts', label: 'Agents', icon: 'shadow', match: ['/operate/counterparts', '/insights/agents'] },
  { to: '/insights/people', label: 'Performance', icon: 'people' },
  { to: '/business/overview', label: 'Business', icon: 'chart', match: ['/business'] },
  { to: '/build/picture', label: 'Foundation', icon: 'brain', match: ['/build/picture', '/build/kpis', '/build/connectors', '/build/datasets'] },
];

export function isNavItemActive(item: AreaNavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  const prefixes = item.match ?? [item.to];
  return prefixes.some((p) => pathname.startsWith(p));
}

// Off-rail screens still need a crumb title.
const SPECIAL_TITLES: [prefix: string, title: string][] = [
  ['/operate/findings/', 'Findings / Thread'],
  ['/business/overview', 'Business / Overview'],
  ['/business/sku', 'Business / Sales by SKU'],
  ['/business/customers', 'Business / Customers'],
  ['/business/pl', 'Business / P&L'],
  ['/operate/tasks', 'Execution / Tasks'],
  ['/operate/runs', 'Execution / Runs'],
  ['/insights/outcomes', 'Execution / Outcomes'],
  ['/operate/counterparts', 'Agents / Counterparts'],
  ['/insights/agents', 'Agents / Workforce'],
  ['/insights/signals', 'Findings / Signal'],
  ['/build/picture', 'Foundation / Operating Picture'],
  ['/build/kpis', 'Foundation / Mandate Library'],
  ['/build/connectors', 'Foundation / Data Connectors'],
  ['/build/datasets', 'Foundation / Datasets'],
  ['/build/agent-studio', 'Findings / Act · Agent Studio'],
  ['/build/solutions', 'Findings / Act · Solution Design'],
  ['/build/studio', 'Findings / Act · Agent Studio'],
  ['/build/create', 'Findings / Act · Create an Agent'],
];

export function crumbTitle(pathname: string): string {
  for (const [prefix, title] of SPECIAL_TITLES) {
    if (pathname.startsWith(prefix)) return title;
  }
  const item = NAV_ITEMS.find((i) => isNavItemActive(i, pathname));
  return item?.label ?? 'Rewive';
}
