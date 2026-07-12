import { NavLink, useLocation, useParams } from 'react-router-dom';
import { Avatar } from '../shared/Avatar';
import { usePendingDecisions } from '../../api/dashboard';
import { useWorkflows } from '../../api/agentStudio';
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
  const area = getArea(getAreaKeyFromPath(pathname));
  const { data: pendingDecisions } = usePendingDecisions();
  const pendingCount = pendingDecisions ? Math.min(pendingDecisions.length, 9) : undefined;

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
        <Avatar initials="KV" background="#4F46E5" />
        <div>
          <div className="who">Kumara Vijayan</div>
          <div className="role">Co-founder · Admin</div>
        </div>
      </div>
    </aside>
  );
}
