import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSetIndustry } from '../../api/shadowOrg';
import { usePersonaLens, type PersonaLens } from '../../components/layout/personaLens';
import { personaLabel, personaGroupsForIndustry } from '../CommandCenter/personas';
import { TENANTS, setActiveTenantId, tenantById, type Tenant } from '../../tenants';

// Organization sign-in: the SaaS front door. Each tenant is a workspace mapped
// to an industry pack; the brand panel takes the org's identity, and the role
// picked here becomes the persona lens — so each team lands in its own view.
export function LoginScreen() {
  const navigate = useNavigate();
  const setIndustry = useSetIndustry();
  const { setLens, setHierarchy } = usePersonaLens();
  const [params] = useSearchParams();

  const [tenant, setTenant] = useState<Tenant>(() => tenantById(params.get('org')) ?? TENANTS[0]);
  const [role, setRole] = useState<PersonaLens>('all');
  const [email, setEmail] = useState(() => `you@${(tenantById(params.get('org')) ?? TENANTS[0]).domain}`);
  const [emailEdited, setEmailEdited] = useState(false);
  const [password, setPassword] = useState('');

  const roleGroups = useMemo(() => personaGroupsForIndustry(tenant.industry), [tenant.industry]);

  const pickTenant = (t: Tenant) => {
    setTenant(t);
    if (!emailEdited) setEmail(`you@${t.domain}`);
    // Role sets differ per industry — reset a pick the new org doesn't offer.
    if (role !== 'all' && !personaGroupsForIndustry(t.industry).some((g) => g.roles.includes(role as Exclude<PersonaLens, 'all'>))) {
      setRole('all');
    }
  };

  const signIn = (e: FormEvent) => {
    e.preventDefault();
    setActiveTenantId(tenant.id);
    setLens(role);
    setHierarchy(false);
    setIndustry.mutate(tenant.industry, { onSettled: () => navigate('/command') });
  };

  return (
    <div className="login" style={{ ['--tenant-accent' as string]: tenant.accent }}>
      <div className="login-brand">
        <div className="login-brand-top">
          <div className="logo-mark login-rewive-mark">R</div>
          <span>Rewive · Accountability Layer</span>
        </div>
        <div className="login-brand-main">
          <div className="login-org-mark">{tenant.mark}</div>
          <div className="login-eyebrow">Operating context · {tenant.industryLabel}</div>
          <h1>{tenant.name}</h1>
          <p className="login-tagline">{tenant.tagline}</p>
          <ul className="login-proof">
            {tenant.proofPoints.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
        <div className="login-brand-foot">“Every mandate, held twice.”</div>
      </div>

      <div className="login-auth">
        <form className="login-card" onSubmit={signIn}>
          <div className="login-eyebrow">Organization sign-in</div>
          <h2>Sign in to your workspace</h2>

          <div className="login-field-label">Organization</div>
          <div className="login-orgs">
            {TENANTS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`login-org${t.id === tenant.id ? ' on' : ''}`}
                onClick={() => pickTenant(t)}
              >
                <span className="login-org-chip" style={{ background: t.accent }}>{t.mark}</span>
                <span className="login-org-text">
                  <span className="login-org-name">{t.name}</span>
                  <span className="login-org-ind">{t.industryLabel}</span>
                </span>
                <span className="login-org-dot" aria-hidden />
              </button>
            ))}
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

          <button className="btn primary login-submit" type="submit" disabled={setIndustry.isPending}>
            {setIndustry.isPending ? 'Signing in…' : `Sign in to ${tenant.name}`}
          </button>

          <div className="login-foot">
            Demo build — any password works. <Link to="/">Back to rewive.com</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
