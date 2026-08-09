// The control plane (P1.4): tenant catalog, per-tenant store provisioning,
// migration fan-out. The catalog is the worklist that makes DB-per-customer
// operable — provisioning is idempotent-per-tenant, fan-out converges every
// store to the latest version, and seed tenants cannot be deprovisioned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, MUTATIONS, assertEveryShape, en } from './_helpers.mjs';

const mut = { skip: !MUTATIONS && 'CONTRACT_MUTATIONS=0' };

test('GET /control-plane/migrations lists the tenant-store series in order', async () => {
  const { status, data } = await api('/control-plane/migrations');
  assert.equal(status, 200);
  assert.ok(data.length >= 2, 'the series should have at least core + ledger');
  assertEveryShape(data, { version: 'number', name: 'string', tables: 'array' }, 'migrations');
  for (let i = 1; i < data.length; i++) assert.ok(data[i].version > data[i - 1].version, 'versions ascend');
  assert.ok(data.every((m) => m.tables.length > 0), 'each migration should create tables');
});

test('GET /control-plane/tenants: the demo orgs are provisioned and current', async () => {
  const { status, data } = await api('/control-plane/tenants');
  assert.equal(status, 200);
  assert.ok(['postgres-schema', 'memory'].includes(data.storeMode));
  assert.equal(typeof data.latestVersion, 'number');
  assertEveryShape(data.tenants, {
    id: 'string', name: 'string', template: 'string',
    origin: en('seed', 'onboarding', 'api'),
    status: en('provisioning', 'ready', 'error'),
    migrationVersion: 'number',
  }, 'catalog');
  for (const id of ['americana', 'medcare-uae', 'gulfmart', 'gulf-precision']) {
    const row = data.tenants.find((t) => t.id === id);
    assert.ok(row, `seed tenant ${id} should be in the catalog`);
    assert.equal(row.status, 'ready');
    assert.equal(row.migrationVersion, data.latestVersion, `${id} should be at the latest version`);
  }
});

test('provisioning: validates, creates at latest, refuses duplicates', mut, async () => {
  await api('/control-plane/tenants/contract-cp', { method: 'DELETE' }); // clean slate for re-runs

  assert.equal((await api('/control-plane/tenants', { method: 'POST', body: { id: 'Bad Slug!', name: 'x', template: 'fmcg' } })).status, 400);
  assert.equal((await api('/control-plane/tenants', { method: 'POST', body: { id: 'contract-cp', name: 'x', template: 'not-a-template' } })).status, 400);

  const created = await api('/control-plane/tenants', { method: 'POST', body: { id: 'contract-cp', name: 'Contract CP Test', template: 'fmcg' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.status, 'ready');
  const latest = (await api('/control-plane/tenants')).data.latestVersion;
  assert.equal(created.data.migrationVersion, latest, 'a new tenant is born at the latest version');

  assert.equal((await api('/control-plane/tenants', { method: 'POST', body: { id: 'contract-cp', name: 'Again', template: 'fmcg' } })).status, 409);
});

test('migration fan-out converges every tenant store and is idempotent', mut, async () => {
  const first = await api('/control-plane/migrate', { method: 'POST' });
  assert.equal(first.status, 200);
  const { latestVersion, results } = first.data;
  const tenantCount = (await api('/control-plane/tenants')).data.tenants.length;
  assert.equal(results.length, tenantCount, 'fan-out walks the whole catalog');
  for (const r of results) {
    assert.ok(!r.error, `tenant ${r.id} should migrate cleanly (${r.error ?? ''})`);
    assert.equal(r.to, latestVersion, `tenant ${r.id} should land on v${latestVersion}`);
  }
  const second = await api('/control-plane/migrate', { method: 'POST' });
  for (const r of second.data.results) {
    assert.equal(r.from, r.to, `second run should be a no-op for ${r.id}`);
  }
});

test('deprovisioning: contract tenants go, seed tenants refuse, unknowns 404', mut, async () => {
  assert.equal((await api('/control-plane/tenants/contract-cp', { method: 'DELETE' })).status, 200);
  assert.ok(!(await api('/control-plane/tenants')).data.tenants.some((t) => t.id === 'contract-cp'));
  assert.equal((await api('/control-plane/tenants/americana', { method: 'DELETE' })).status, 400, 'seed tenants are furniture');
  assert.equal((await api('/control-plane/tenants/never-existed', { method: 'DELETE' })).status, 404);
});
