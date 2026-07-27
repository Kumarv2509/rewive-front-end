import { NavLink, useLocation } from 'react-router-dom';
import { NAV_GROUPS, isNavItemActive } from './areas';
import { NavIcon } from './NavIcon';

// The rail is grouped so the loop reads at a glance: Today, then the loop
// stages (Find → Decide → Act as quiet right-aligned words), then the org,
// then setup. The single "waiting on you" count lives on the Today screen
// itself — the rail carries no competing badges. The signed-in user moved to
// the top bar.
export function AreaSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="side area-side">
      <nav className="nav">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label && <div className="nav-label">{group.label}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={() => `nav-item${isNavItemActive(item, pathname) ? ' active' : ''}`}
                end={item.end}
              >
                <NavIcon icon={item.icon} />
                {item.label}
                {item.stage && <span className="nav-stage">{item.stage}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
