import { NavLink, useLocation } from 'react-router-dom';
import { Avatar } from '../shared/Avatar';
import { useCurrentUser } from '../../api/dashboard';
import { NAV_ITEMS, isNavItemActive } from './areas';
import { NavIcon } from './NavIcon';

// One flat rail, loop-ordered. The single "waiting on you" count lives on the
// Today screen itself — the rail carries no competing badges.
export function AreaSidebar() {
  const { pathname } = useLocation();
  const { data: user } = useCurrentUser();

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
      {user && (
        <div className="side-foot">
          <Avatar initials={user.initials} background={user.avatarBg} />
          <div>
            <div className="who">{user.name}</div>
            <div className="role">{user.role}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
