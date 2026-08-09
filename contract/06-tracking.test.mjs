// Live mandate tracking — the one real pipeline. Configs, metric history,
// ingest keys, and the sweep's audit trail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, INDUSTRIES, MUTATIONS, assertEveryShape, en, opt } from './_helpers.mjs';

const mut = { skip: !MUTATIONS && 'CONTRACT_MUTATIONS=0' };

test('GET /tracking-configs lists live-tracked mandates with drift rules', async () => {
  const { status, data } = await api('/tracking-configs');
  assert.equal(status, 200);
  assertEveryShape(data, {
    nodeId: 'string', industry: 'string',
    direction: en('up_good', 'down_good'),
    targetNumeric: 'number', warnPct: 'number', breachPct: 'number',
    enabled: 'boolean',
  }, 'tracking configs');
});

test('GET /metrics/:nodeId returns the point history for a tracked mandate', async (t) => {
  const configs = (await api('/tracking-configs')).data;
  if (!configs.length) return t.skip('no tracking configs on this target');
  const { status, data } = await api(`/metrics/${configs[0].nodeId}`);
  assert.equal(status, 200);
  assertEveryShape(data.points ?? data, { nodeId: 'string', ts: 'string', value: 'number' }, 'metric points');
});

test('ingest keys: minted once in plaintext, then revocable', mut, async () => {
  const created = await api('/ingest-keys', { method: 'POST', body: { label: 'contract-suite' } });
  assert.equal(created.status, 201, 'creating a resource answers 201');
  assert.ok(created.data.key, 'the plaintext key is returned exactly once');
  assert.ok(created.data.id);
  const listed = (await api('/ingest-keys')).data;
  const row = listed.find((k) => k.id === created.data.id);
  assert.ok(row, 'the key should be listed');
  assert.ok(!row.key, 'the plaintext key must never be listed again');
  const revoked = await api(`/ingest-keys/${created.data.id}`, { method: 'DELETE' });
  assert.equal(revoked.status, 200);
});

test('sweep history and live progress respond', async () => {
  assert.equal((await api('/sweep-runs')).status, 200);
  assert.equal((await api(`/sweep-progress?industry=${INDUSTRIES[0]}`)).status, 200);
});

test('POST /agent-sweep runs the loop end-to-end', { skip: process.env.CONTRACT_SWEEP !== '1' && 'set CONTRACT_SWEEP=1 (slow)' }, async () => {
  const { status, data } = await api('/agent-sweep', { method: 'POST' });
  assert.equal(status, 200);
  assert.ok(typeof data.nodesEvaluated === 'number' || typeof data.findingsRaised === 'number' || data.ok, 'sweep should report what it did');
});
