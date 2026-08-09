import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSetIndustry } from '../../api/shadowOrg';
import { useLogin } from '../../api/auth';
import { usePersonaLens, type PersonaLens } from '../../components/layout/personaLens';
import { personaLabel, personaGroupsForIndustry, lensOfferedForIndustry } from '../CommandCenter/personas';
import { ErrorMessage } from '../../components/shared/StateMessage';
import { findTenants, setActiveTenantId, tenantById, type Tenant } from '../../tenants';

// Organization sign-in: the SaaS front door. Tenants are never listed — a
// multi-tenant product doesn't show one customer the others — so step 1 finds
// your organization from what you know (name or work email) and step 2 is that
// org's branded sign-in. An ?org=<id> deep link (invite-style; nothing in the
// app mints one today) skips straight to step 2.
export function LoginScreen() {
  const navigate = useNavigate();
  const login = useLogin();
  const setIndustry = useSetIndustry();
  const { setLens, setHierarchy } = usePersonaLens();
  const [params, setParams] = useSearchParams();

  const [tenant, setTenant] = useState<Tenant | null>(() => tenantById(params.get('org')));
  const [orgQuery, setOrgQuery] = useState('');
  const [orgError, setOrgError] = useState<string | null>(null);
  const [role, setRole] = useState<PersonaLens>('all');
  const [email, setEmail] = useState(() => (tenant ? `you@${tenant.domain}` : ''));
  const [emailEdited, setEmailEdited] = useState(false);
  const [password, setPassword] = useState('');

  const roleGroups = useMemo(
    () => (tenant ? personaGroupsForIndustry(tenant.industry) : []),
    [tenant],
  );

  const findOrg = (e: FormEvent) => {
    e.preventDefault();
    const matches = findTenants(orgQuery);
    if (matches.length === 1) {
      const t = matches[0];
      setTenant(t);
      setOrgError(null);
      // A work email both finds the org and is the email to sign in with — but
      // only a full mailbox address; a "@acme.com"-style domain query isn't one.
      if (!emailEdited) {
        const q = orgQuery.trim();
        setEmail(/^[^@\s]+@[^@\s]+$/.test(q) ? q : `you@${t.domain}`);
      }
      if (!lensOfferedForIndustry(role, t.industry)) setRole('all');
      // Write the org back to the URL so step 2 survives a refresh.
      const next = new URLSearchParams(params);
      next.set('org', t.id);
      setParams(next, { replace: true });
    } else if (matches.length > 1) {
      setOrgError('More than one organization matches — try the full name or your work email.');
    } else {
      setOrgError("We can't find that organization. Check the name — or set up a new one below.");
    }
  };

  const changeOrg = () => {
    setTenant(null);
    setOrgQuery('');
    setOrgError(null);
    // Reset the credentials too: the previous org's email/password must not
    // carry into the next org's sign-in, and emailEdited must re-arm so the
    // next find prefills fresh.
    setEmail('');
    setEmailEdited(false);
    setPassword('');
    // A failed sign-in's error must not follow the user to the next org.
    login.reset();
    setIndustry.reset();
    // Drop only the ?org= param so a refresh doesn't resurrect the org just
    // left — any other params (?next=, ?invite=) must survive.
    if (params.get('org')) {
      const next = new URLSearchParams(params);
      next.delete('org');
      setParams(next, { replace: true });
    }
  };

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    // Two server steps, session persisted only after both: mint the token
    // (auth seam — its claims now outrank ?industry= on every request), then
    // switch the server context under that token. Navigating on failure landed
    // the user on /command with the new org's chrome over the old org's data.
    login.mutate(
      { email, tenantId: tenant.id, industry: tenant.industry, seat: role },
      {
        onSuccess: () => {
          setIndustry.mutate(tenant.industry, {
            onSuccess: () => {
              setActiveTenantId(tenant.id);
              setLens(role);
              // Clear rather than force off: a role with reports should land
              // on its team view, which is the job. Forcing false here hid
              // team scope on every sign-in regardless of role.
              setHierarchy(null);
              navigate('/command');
            },
          });
        },
      },
    );
  };

  // One footer for both steps — they had drifted apart in wording and order.
  const foot = (
    <div className="login-foot">
      {tenant && <>Demo build — any password works.<br /></>}
      New here? <Link to="/onboard">Set up a new organization →</Link>
      <br />
      <Link to="/">Back to rewive.com</Link>
    </div>
  );

  return (
    <div className="login" style={tenant ? { ['--tenant-accent' as string]: tenant.accent } : undefined}>
      <div className="login-brand">
        <div className="login-brand-top">
          <div className="logo-mark login-rewive-mark">R</div>
          <span>Rewive · Accountability Layer</span>
        </div>
        <div className="login-brand-main">
          <div className="login-org-mark">{tenant?.mark ?? 'R'}</div>
          <div className="login-eyebrow">
            {tenant ? `Operating context · ${tenant.industryLabel}` : 'The Decision Accountability Layer'}
          </div>
          <h1>{tenant?.name ?? 'Welcome back.'}</h1>
          <p className="login-tagline">
            {tenant?.tagline ?? "Every number has two owners — a person and an agent. Sign in to see what's waiting on you."}
          </p>
          {tenant && (
            <ul className="login-proof">
              {tenant.proofPoints.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
        </div>
        <div className="login-brand-foot">“Nothing drifts unanswered.”</div>
      </div>

      <div className="login-auth">
        {!tenant ? (
          <form className="login-card" onSubmit={findOrg}>
            <div className="login-eyebrow">Organization sign-in</div>
            <h2>Find your organization</h2>

            <label className="login-field">
              <span className="login-field-label">Organization name or work email</span>
              <input
                value={orgQuery}
                onChange={(e) => { setOrgQuery(e.target.value); setOrgError(null); }}
                placeholder="e.g. Acme Foods — or you@acme.com"
                autoFocus
                required
              />
            </label>
            {orgError && <ErrorMessage message={orgError} />}

            <button className="btn primary login-submit" type="submit">Continue</button>

            {foot}
          </form>
        ) : (
          <form className="login-card" onSubmit={signIn}>
            <div className="login-eyebrow">Organization sign-in</div>
            <h2>Sign in to your workspace</h2>

            <div className="login-field-label">Organization</div>
            <div className="login-found">
              <span className="login-org-chip" style={{ background: tenant.accent }}>{tenant.mark}</span>
              <span className="login-org-text">
                <span className="login-org-name">{tenant.name}</span>
                <span className="login-org-ind">{tenant.industryLabel}</span>
              </span>
              <button type="button" className="login-change" onClick={changeOrg}>Change</button>
            </div>

            <label className="login-field">
              <span className="login-field-label">Work email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailEdited(true); }}
                required
              />
            </label>

            <label className="login-field">
              <span className="login-field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <label className="login-field">
              <span className="login-field-label">Sign in as</span>
              <select value={role} onChange={(e) => setRole(e.target.value as PersonaLens)}>
                <option value="all">Admin · all lenses</option>
                {roleGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.roles.map((p) => <option key={p} value={p}>{personaLabel(p, tenant.industry)}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>

            {(login.isError || setIndustry.isError) && <ErrorMessage message="Couldn't reach the server — check that it's running and try again." />}

            <button className="btn primary login-submit" type="submit" disabled={login.isPending || setIndustry.isPending}>
              {login.isPending || setIndustry.isPending ? 'Signing in…' : `Sign in to ${tenant.name}`}
            </button>

            {foot}
          </form>
        )}
      </div>
    </div>
  );
}
