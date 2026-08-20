import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { NAV_ITEMS, isNavItemActive, type AreaNavItem } from './areas';
import { NavIcon } from './NavIcon';

// The phone shell (≤760px, CSS-gated — desktop never renders this visibly):
// the rail becomes a bottom bar carrying Today + the loop, the four screens
// someone reaches for away from a desk. Everything else (the org, setup) is
// a desk activity and lives behind "More" — present, not promoted.
const BAR_ROUTES = ['/command', '/operate/findings', '/operate/decisions', '/operate/runs'];

export function MobileNav() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const barItems = BAR_ROUTES
    .map((to) => NAV_ITEMS.find((i) => i.to === to))
    .filter((i): i is AreaNavItem => !!i);
  const moreItems = NAV_ITEMS.filter((i) => !BAR_ROUTES.includes(i.to));
  const moreActive = moreItems.some((i) => isNavItemActive(i, pathname));

  return (
    <>
      {moreOpen && (
        <>
          <div className="mobile-sheet-scrim" onClick={() => setMoreOpen(false)} />
          <div className="mobile-sheet" role="menu" aria-label="More screens">
            {moreItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={() => `menu-item${isNavItemActive(item, pathname) ? ' on' : ''}`}
                onClick={() => setMoreOpen(false)}
              >
                <NavIcon icon={item.icon} />
                {item.label}
              </NavLink>
            ))}
            <div className="menu-sep" />
            <Link to="/guide" className="menu-item" onClick={() => setMoreOpen(false)}>
              Guide
            </Link>
          </div>
        </>
      )}
      <nav className="mobile-nav" aria-label="Primary">
        {barItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={() => `mnav-item${isNavItemActive(item, pathname) ? ' active' : ''}`}
            end={item.end}
            onClick={() => setMoreOpen(false)}
          >
            <NavIcon icon={item.icon} />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          className={`mnav-item${moreActive ? ' active' : ''}${moreOpen ? ' open' : ''}`}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((o) => !o)}
        >
          <NavIcon icon="grid" />
          More
        </button>
      </nav>
    </>
  );
}
