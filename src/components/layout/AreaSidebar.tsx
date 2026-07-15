import { NavLink, useLocation } from 'react-router-dom';
import { Avatar } from '../shared/Avatar';
import { NAV_ITEMS, isNavItemActive } from './areas';
import { NavIcon } from './NavIcon';

// One flat rail, loop-ordered. The single "waiting on you" count lives on the
// Today screen itself — the rail carries no competing badges.
export function AreaSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="side area-side">
      <div className="nav-label">The loop</div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={() => `nav-item${isNavItemActive(item, pathname) ? ' active' : ''}`}
            end={item.end}
          >
            <NavIcon icon={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="side-foot">
        <Avatar initials="KV" background="#4F46E5" />
        <div>
          <div className="who">Kumara Vijayan</div>
          <div className="role">Co-founder · Admin</div>
        </div>
      </div>
    </aside>
  );
}
