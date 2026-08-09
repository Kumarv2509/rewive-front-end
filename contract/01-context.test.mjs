// Operating context: industries, org profile, and ?industry= scoping — the
// contract that lets one frontend serve any org.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, INDUSTRIES, MUTATIONS, assertShape, assertEveryShape } from './_helpers.mjs';

test('GET /industries lists the operating contexts', async () => {
  const { status, data } = await api('/industries');
  assert.equal(status, 200);
  assertEveryShape(data, { id: 'string', name: 'string' }, 'industries');
  for (const ind of INDUSTRIES) {
    assert.ok(data.some((o) => o.id === ind), `industry ${ind} should be offered`);
  }
});

test('GET /org-profile returns the active context', async () => {
  const { status, data } = await api('/org-profile');
  assert.equal(status, 200);
  assertShape(data, { industry: 'string', orgName: 'string' }, 'org-profile');
});

test('?industry= scopes the org profile per request', async () => {
  for (const ind of INDUSTRIES) {
    const { data } = await api(`/org-profile?industry=${ind}`);
    assert.equal(data.industry, ind, `org-profile should follow ?industry=${ind}`);
    assert.ok(data.orgName, `org ${ind} should have a name`);
  }
});

test('PUT /org-profile switches the stored context', { skip: !MUTATIONS && 'CONTRACT_MUTATIONS=0' }, async () => {
  const before = (await api('/org-profile')).data.industry;
  const target = INDUSTRIES.find((i) => i !== before) ?? before;
  const { status, data } = await api('/org-profile', { method: 'PUT', body: { industry: target } });
  assert.equal(status, 200);
  assert.equal(data.industry, target);
  await api('/org-profile', { method: 'PUT', body: { industry: before } }); // restore
});
