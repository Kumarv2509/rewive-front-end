// The front door: server-side organization resolution. An onboarded org exists
// only in the browser that created it, so a second browser used to dead-end at
// /login — or resolve the typed name to the nearest *seeded* org and sign the
// user into the wrong company. This route is how the server answers for the
// orgs the client cannot know statically.
//
// Two rules it must never break: it answers for runtime orgs only, and it never
// enumerates (a multi-tenant product doesn't show one customer the others).
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, assertEveryShape } from './_helpers.mjs';

/** The runtime org, if this target has one. Discovery-driven: the suite never
 * commits an org — that would replace whatever the target is demoing. */
async function runtimeOrg() {
  const { data } = await api('/industries');
  const row = Array.isArray(data) ? data.find((i) => i.id === 'custom') : null;
  return row?.name ?? null;
}

test('GET /tenants/resolve: an empty query resolves nothing', async () => {
  for (const path of ['/tenants/resolve', '/tenants/resolve?q=', '/tenants/resolve?q=%20%20']) {
    const { status, data } = await api(path);
    assert.equal(status, 200, path);
    assert.deepEqual(data.tenants, [], `${path} must not resolve an org`);
  }
});

test('GET /tenants/resolve never enumerates — an unknown name gets nothing', async () => {
  const { status, data } = await api('/tenants/resolve?q=zzz-no-such-organization');
  assert.equal(status, 200);
  assert.deepEqual(data.tenants, []);
});

test('GET /tenants/resolve answers for runtime orgs only, not the seeded tenants', async () => {
  // The four demo tenants are a front-end asset (findTenants in src/tenants.ts).
  // If the server started answering for them too, the front door would resolve
  // each org twice and read every match as ambiguous.
  const org = await runtimeOrg();
  for (const q of ['medcare', 'gulfmart', 'gulf precision']) {
    if (org && org.toLowerCase().includes(q.split(' ')[0])) continue; // the runtime org owns that name
    const { data } = await api(`/tenants/resolve?q=${encodeURIComponent(q)}`);
    assert.deepEqual(data.tenants, [], `seeded tenant "${q}" must not come from the server`);
  }
});

test('GET /tenants/resolve finds the runtime org by name, id and punctuation-blind', async (t) => {
  const org = await runtimeOrg();
  if (!org) return t.skip('no onboarded organization on this target');

  const shape = {
    id: 'string', name: 'string', mark: 'string', industry: 'string',
    industryLabel: 'string', accent: 'string', domain: 'string',
    tagline: 'string', proofPoints: 'array', labelOverrides: 'object',
  };

  const byName = await api(`/tenants/resolve?q=${encodeURIComponent(org)}`);
  assert.equal(byName.status, 200);
  assert.equal(byName.data.tenants.length, 1, `resolving "${org}" should find exactly it`);
  assertEveryShape(byName.data.tenants, shape, 'resolved tenant');
  const tenant = byName.data.tenants[0];
  assert.equal(tenant.name, org);
  assert.equal(tenant.industry, 'custom');

  // The id is what an invite-style ?org= deep link carries.
  const byId = await api(`/tenants/resolve?q=${encodeURIComponent(tenant.id)}`);
  assert.equal(byId.data.tenants.length, 1, 'the org resolves by its workspace id');
  assert.equal(byId.data.tenants[0].id, tenant.id);

  // People don't retype punctuation the way it was seeded.
  const squashed = org.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const bySpaces = await api(`/tenants/resolve?q=${encodeURIComponent(squashed.toUpperCase())}`);
  assert.equal(bySpaces.data.tenants.length, 1, `"${squashed.toUpperCase()}" should still find the org`);

  // A work email on the org's own domain finds it too.
  const byEmail = await api(`/tenants/resolve?q=${encodeURIComponent(`someone@${tenant.domain}`)}`);
  assert.equal(byEmail.data.tenants.length, 1, 'a work email on the org domain resolves the org');
});
