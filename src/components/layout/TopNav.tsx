import { Link, useNavigate } from 'react-router-dom';
import { useOrgProfile } from '../../api/shadowOrg';
import { clearActiveTenant, getActiveTenant, tenantForIndustry } from '../../tenants';

export function TopNav() {
  const navigate = useNavigate();
  // Subscribing to the org profile keeps the chip live when the industry is
  // switched in-app; the stored tenant covers the first render.
  const { data: profile } = useOrgProfile();
  const tenant = tenantForIndustry(profile?.industry ?? null) ?? getActiveTenant();

  const switchOrg = () => {
    clearActiveTenant();
    navigate(tenant ? `/login?org=${tenant.id}` : '/login');
  };

  return (
    <div className="topnav">
      <Link to="/command" className="topnav-logo">
        <div className="logo-mark">R</div>
        <div>
          <div className="logo-name">Rewive</div>
          <div className="logo-tag">Accountability Layer</div>
        </div>
      </Link>
      {tenant && (
        <div className="topnav-tenant" title={`Signed in to ${tenant.name}`}>
          <span className="topnav-tenant-chip" style={{ background: tenant.accent }}>{tenant.mark}</span>
          <span className="topnav-tenant-name">{tenant.name}</span>
          <span className="topnav-tenant-ind">{tenant.industryLabel}</span>
        </div>
      )}
      <div className="topnav-spacer" />
      <button type="button" className="topnav-switch" onClick={switchOrg}>
        Switch organization
      </button>
      <Link to="/guide" className="topnav-help">Help · step by step</Link>
    </div>
  );
}
