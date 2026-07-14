import { Link } from 'react-router-dom';

export function TopNav() {
  return (
    <div className="topnav">
      <Link to="/command" className="topnav-logo">
        <div className="logo-mark">R</div>
        <div>
          <div className="logo-name">Rewive</div>
          <div className="logo-tag">Accountability Layer</div>
        </div>
      </Link>
      <div className="topnav-spacer" />
      <Link to="/guide" className="topnav-help">Help · step by step</Link>
    </div>
  );
}
