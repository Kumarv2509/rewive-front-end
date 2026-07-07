import { NavLink, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Avatar } from '../shared/Avatar';
import { useDashboard } from '../../api/dashboard';
import { useWorkflows } from '../../api/agentStudio';
import { useAuth } from '../../context/AuthContext';
import { getArea, getAreaKeyFromPath } from './areas';
import { NavIcon } from './NavIcon';

const navClass = ({ isActive }: { isActive: boolean }) => `nav-item${isActive ? ' active' : ''}`;
const subClass = ({ isActive }: { isActive: boolean }) => `nav-subitem${isActive ? ' active' : ''}`;

function WorkflowSublist() {
  const { data: workflows } = useWorkflows();
  const { workflowId: activeId } = useParams();

  if (!workflows?.length) return null;

  return (
    <div className="nav-sublist">
      {[...workflows].reverse().map((wf) => (
        <NavLink key={wf.id} to={`/build/studio/${wf.id}`} className={() => subClass({ isActive: wf.id === activeId })}>
          {wf.name || 'Untitled workflow'} {wf.status === 'draft' ? `· draft v${wf.version}` : '· published'}
        </NavLink>
      ))}
    </div>
  );
}

export function AreaSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const area = getArea(getAreaKeyFromPath(pathname));
  const { data: dashboard } = useDashboard();
  const pendingCount = dashboard?.analytics_agent_approvals?.rows
    ? Math.min(dashboard.analytics_agent_approvals.rows.length, 9)
    : undefined;
  const { logout, userName } = useAuth();

  return (
    <aside className="side area-side">
      <div className="nav-label">{area.label}</div>
      <nav className="nav">
        {area.items.map((item) => (
          <div key={item.to}>
            <NavLink to={item.to} className={navClass} end={item.end}>
              <NavIcon icon={item.icon} />
              {item.label}
              {item.badgeKey === 'pendingDecisions' && !!pendingCount && (
                <span className="nav-badge">{pendingCount}</span>
              )}
            </NavLink>
            {item.to === '/build/studio' && <WorkflowSublist />}
          </div>
        ))}
      </nav>
      <div className="side-foot">
        <Avatar initials={userName?.slice(0, 2).toUpperCase() ?? 'U'} background="#4F46E5" />
        <div>
          <div className="who">{userName ?? 'User'}</div>
          <button className="side-logout" onClick={() => { logout(); navigate('/login'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
