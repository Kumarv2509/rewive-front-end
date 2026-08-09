// The auth seam (ARCH-GTM-001, Phase 1). Demo-grade credentials, production-grade
// shape: sign-in mints a real signed JWT carrying tenant + industry + seat claims,
// and the API treats a valid token as more authoritative than query params. When
// Entra OIDC lands, only the issuer/verifier swaps (HS256 dev secret → JWKS);
// the claim names and the middleware contract stay.
//
// HS256 via node crypto — deliberately no new dependency for the dev issuer.
import crypto from 'crypto';

const SECRET = process.env.REWIVE_AUTH_SECRET ?? 'rewive-dev-secret-not-for-production';
const TOKEN_TTL_SECONDS = 12 * 60 * 60;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function hmac(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function signToken({ email, tenantId, industry, seat }) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: 'rewive-dev',
    sub: email,
    tid: tenantId,
    industry,
    seat,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  }));
  return `${header}.${payload}.${hmac(`${header}.${payload}`)}`;
}

/** Returns the claims object, or null for anything invalid or expired. */
export function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = hmac(`${header}.${payload}`);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

/** True when a bearer value is JWT-shaped (three dot-separated segments). The
 * API's other bearers — CRON_SECRET on /agent-sweep, hashed ingest keys on
 * /metrics — are single opaque strings and must pass through untouched. */
function looksLikeJwt(value) {
  return value.split('.').length === 3;
}

/** Validates JWT-shaped Authorization headers. Valid → req.auth = claims.
 * JWT-shaped but invalid/expired → 401 (a client that sent a token expects it
 * honoured, not silently downgraded). No header, or a non-JWT bearer → legacy
 * demo mode: routes fall back to ?industry= exactly as before. */
export function authMiddleware(req, res, next) {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) return next();
  const token = header.slice(7).trim();
  if (!looksLikeJwt(token)) return next();
  const claims = verifyToken(token);
  if (!claims) return res.status(401).json({ message: 'Invalid or expired session token — sign in again.' });
  req.auth = claims;
  return next();
}

export function registerAuthRoutes(app, { isKnownIndustry }) {
  // Demo parity: any password works. What changes is that the session is now a
  // signed, expiring token instead of bare localStorage trust.
  app.post('/api/v1/auth/login', (req, res) => {
    const { email, tenantId, industry, seat } = req.body ?? {};
    if (!email || !tenantId || !industry) {
      return res.status(400).json({ message: 'email, tenantId and industry are required' });
    }
    if (!isKnownIndustry(industry)) {
      return res.status(400).json({ message: 'Unknown industry' });
    }
    const claims = { email, tenantId, industry, seat: seat || 'all' };
    res.json({ token: signToken(claims), expiresInSeconds: TOKEN_TTL_SECONDS });
  });
}
