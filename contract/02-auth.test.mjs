// The auth seam (P1.1): sign-in mints a JWT, signed claims outrank query
// params, opaque bearers pass through, invalid JWTs are refused loudly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, login, INDUSTRIES } from './_helpers.mjs';

test('POST /auth/login mints a JWT-shaped token with a TTL', async () => {
  const { status, data } = await api('/auth/login', {
    method: 'POST',
    body: { email: 'a@b.test', tenantId: 't1', industry: INDUSTRIES[0], seat: 'all' },
  });
  assert.equal(status, 200);
  assert.equal(data.token.split('.').length, 3, 'token should be a three-segment JWT');
  assert.ok(data.expiresInSeconds > 0);
});

test('login rejects missing fields and unknown industries', async () => {
  assert.equal((await api('/auth/login', { method: 'POST', body: { email: 'a@b.test' } })).status, 400);
  assert.equal(
    (await api('/auth/login', { method: 'POST', body: { email: 'a@b.test', tenantId: 't1', industry: 'nope' } })).status,
    400,
  );
});

test('signed claims outrank ?industry=', { skip: INDUSTRIES.length < 2 && 'needs two industries' }, async () => {
  const [a, b] = INDUSTRIES;
  const token = await login({ industry: b });
  const profile = await api(`/org-profile?industry=${a}`, { token });
  assert.equal(profile.data.industry, b, 'claims should beat the query param on org-profile');
  const findings = await api(`/findings?industry=${a}`, { token });
  assert.equal(findings.status, 200);
  // Cross-check content, not just the label: the served rows must belong to
  // the claimed industry's world, not the query param's.
  const brainIds = new Set((await api(`/kpi-brain?industry=${b}`)).data.nodes.map((n) => n.id));
  for (const f of findings.data) {
    assert.ok(brainIds.has(f.linkedKpiNodeId), `finding ${f.id} should link into the claimed industry's brain`);
  }
});

test('a JWT-shaped but invalid bearer is refused with 401', async () => {
  const { status } = await api('/org-profile', { token: 'aaa.bbb.ccc' });
  assert.equal(status, 401);
});

test('an opaque (non-JWT) bearer passes through as tokenless demo mode', async () => {
  const ind = INDUSTRIES[0];
  const { status, data } = await api(`/org-profile?industry=${ind}`, { token: 'opaque-ingest-or-cron-secret' });
  assert.equal(status, 200, 'single-segment bearers must not be treated as sessions');
  assert.equal(data.industry, ind);
});
