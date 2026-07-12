import { useLocation, useNavigate } from 'react-router-dom';
import { getAreaKeyFromPath, getArea } from './areas';

function titleFor(pathname: string) {
  const area = getArea(getAreaKeyFromPath(pathname));
  const item = area.items.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));
  const screenLabel =
    item?.label ??
    (pathname.startsWith('/insights/signals')
      ? 'Signal Studio'
      : pathname.startsWith('/build/agent-studio')
        ? 'Unified Agent Studio'
        : pathname.startsWith('/build/solutions')
          ? 'Solution Design'
          : 'Rewive');
  if (area.key === 'operate' && pathname === '/') return screenLabel;
  return `${area.label} / ${screenLabel}`;
}

export function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div className="crumb">{titleFor(pathname)}</div>
      <div className="cmdbar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        Ask Rewive to do something… <span className="kbd">⌘K</span>
      </div>
      <div className="top-actions">
        <div className="bell">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 01-3.4 0" />
          </svg>
          <span className="dot"></span>
        </div>
        <button className="btn primary sm" onClick={() => navigate('/build/create')}>
          + New Agent
        </button>
      </div>
    </div>
  );
}
