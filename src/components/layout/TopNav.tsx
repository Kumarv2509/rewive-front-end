import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AREAS, getAreaKeyFromPath } from './areas';

export function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeKey = getAreaKeyFromPath(pathname);

  return (
    <div className="topnav">
      <Link to="/command" className="topnav-logo">
        <div className="logo-mark">R</div>
        <div>
          <div className="logo-name">Rewive</div>
          <div className="logo-tag">Accountability Layer</div>
        </div>
      </Link>
      <div className="topnav-areas">
        {AREAS.map((area) => (
          <button
            key={area.key}
            className={`topnav-area${area.key === activeKey ? ' active' : ''}`}
            onClick={() => navigate(area.basePath)}
          >
            {area.label}
          </button>
        ))}
      </div>
      <div className="topnav-spacer" />
      <Link to="/" className="topnav-help">How it works</Link>
    </div>
  );
}
