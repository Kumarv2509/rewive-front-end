// Contract test harness (ARCH-GTM-001 P1.3): the mock server's REST contract
// as an executable spec. The mock is the reference implementation; a production
// API must pass this suite unchanged. Point it anywhere with CONTRACT_BASE_URL.
//
// Zero dependencies on purpose — node:test + built-in fetch — so the suite runs
// wherever node runs, including a CI job against a deployed target.
import assert from 'node:assert/strict';

export const BASE = process.env.CONTRACT_BASE_URL ?? 'http://localhost:4000/api/v1';

/** Industries the target is expected to serve. A production tenant serves one;
 * narrow the sweep with e.g. CONTRACT_INDUSTRIES=healthcare. */
export const INDUSTRIES = (process.env.CONTRACT_INDUSTRIES ?? 'fmcg,healthcare,hypermarket,manufacturing')
  .split(',').map((s) => s.trim()).filter(Boolean);

/** Mutation tests are on by default — the mock is in-memory and disposable.
 * Set CONTRACT_MUTATIONS=0 when pointing at a shared or production target. */
export const MUTATIONS = process.env.CONTRACT_MUTATIONS !== '0';

export async function api(path, { method = 'GET', body, token, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body is a legal 204/empty */ }
  return { status: res.status, data };
}

/** Sign in through the target's own login route — the suite never mints tokens
 * itself, so it works against any issuer that honours the login contract. */
export async function login({ email = 'contract@suite.test', tenantId = 'contract-suite', industry = 'fmcg', seat = 'all' } = {}) {
  const { status, data } = await api('/auth/login', { method: 'POST', body: { email, tenantId, industry, seat } });
  assert.equal(status, 200, `login should mint a token (got ${status}: ${JSON.stringify(data)})`);
  assert.equal(typeof data.token, 'string');
  return data.token;
}

// ---------------------------------------------------------------------------
// Tiny shape checker. Spec values are either a typeof shorthand
// ('string' | 'number' | 'boolean' | 'object' | 'array') or a predicate
// function. Compose with en(...) for enums and opt(...) for optional/nullable.
export const en = (...vals) => (v) => vals.includes(v);
export const opt = (inner) => (v) => v === undefined || v === null || matches(v, inner);

function matches(v, spec) {
  if (typeof spec === 'function') return spec(v);
  if (spec === 'array') return Array.isArray(v);
  return typeof v === spec && v !== null;
}

export function assertShape(obj, spec, label) {
  const missing = [];
  for (const [key, s] of Object.entries(spec)) {
    if (!matches(obj?.[key], s)) missing.push(`${key}=${JSON.stringify(obj?.[key])}`);
  }
  assert.equal(missing.length, 0, `${label}: fields off-contract → ${missing.join(', ')}`);
}

export function assertEveryShape(rows, spec, label) {
  assert.ok(Array.isArray(rows), `${label}: expected an array`);
  rows.forEach((row, i) => assertShape(row, spec, `${label}[${i}] (id=${row?.id})`));
}

/** Every collection item carries exactly one persona — roles partition the
 * data. This is a product invariant, so the harness asserts it everywhere. */
export const persona = (v) => typeof v === 'string' && v.length > 0;
