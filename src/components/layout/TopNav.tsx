import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOrgProfile } from '../../api/shadowOrg';
import { useCurrentUser } from '../../api/dashboard';
import { clearActiveTenant, getActiveTenant, tenantForIndustry } from '../../tenants';
import { Avatar } from '../shared/Avatar';
import { LensMenu } from './LensMenu';
import { ThemeMenu } from './ThemeMenu';
import { NotificationsBell } from './NotificationsBell';
import { useCommandPalette } from './CommandPalette';

// The one top bar: identity on the left, command bar in the middle, the
// lens + help + you on the right. Page titles live on the screens themselves.
export function TopNav() {
  const navigate = useNavigate();
  // Subscribing to the org profile keeps the chip live when the industry is
  // switched in-app; the stored tenant covers the first render.
  const { data: profile } = useOrgProfile();
  const { data: user } = useCurrentUser();
  const tenant = tenantForIndustry(profile?.industry ?? null) ?? getActiveTenant();
  const [orgOpen, setOrgOpen] = useState(false);
  const orgRef = useRef<HTMLDivElement>(null);
  const { open: openPalette } = useCommandPalette();

  useEffect(() => {
    if (!orgOpen) return;
    const onDown = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setOrgOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOrgOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [orgOpen]);

  const switchOrg = () => {
    clearActiveTenant();
    // Land on "find your organization" — the front door doesn't list tenants,
    // so there is no picker to preselect the old org in.
    navigate('/login');
  };

  return (
    <div className="topnav">
      <Link to="/command" className="topnav-logo">
        <div className="logo-mark">R</div>
        <div className="logo-name">Rewive</div>
      </Link>
      {tenant && (
        <div className="org-wrap" ref={orgRef}>
          <button
            type="button"
            className="topnav-tenant as-btn"
            aria-expanded={orgOpen}
            title={`Signed in to ${tenant.name}`}
            onClick={() => setOrgOpen((o) => !o)}
          >
            <span className="topnav-tenant-chip" style={{ background: tenant.accent }}>{tenant.mark}</span>
            <span className="topnav-tenant-name">{tenant.name}</span>
            <span className="topnav-tenant-ind">{tenant.industryLabel}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l4 4 4-4" />
            </svg>
          </button>
          {orgOpen && (
            <div className="menu left" role="menu">
              <button type="button" className="menu-item" onClick={switchOrg}>
                Switch organization…
              </button>
            </div>
          )}
        </div>
      )}
      <div className="topnav-spacer" />
      <button type="button" className="cmdbar" onClick={openPalette}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="cmdbar-label">Ask Rewive to do something…</span> <span className="kbd">⌘K</span>
      </button>
      <div className="topnav-spacer" />
      <div className="top-actions">
        <LensMenu />
        <ThemeMenu />
        <Link to="/guide" className="topnav-help">Help</Link>
        <NotificationsBell />
        {user && (
          <span title={`${user.name} · ${user.role}`} style={{ display: 'inline-flex' }}>
            <Avatar initials={user.initials} background={user.avatarBg} />
          </span>
        )}
      </div>
    </div>
  );
}
