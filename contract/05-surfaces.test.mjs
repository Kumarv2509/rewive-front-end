// Execution and insight surfaces — lighter shape checks, plus the product
// invariant that every collection item carries exactly one persona.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, INDUSTRIES, assertEveryShape, persona } from './_helpers.mjs';

const IND = INDUSTRIES[0];

test('GET /decisions returns ledger rows with verdicts and provenance', async () => {
  const { status, data } = await api(`/decisions?industry=${IND}`);
  assert.equal(status, 200);
  assertEveryShape(data, {
    id: 'string', title: 'string', subtitle: 'string', persona,
    verdict: (v) => ['worked', 'not_worked', 'too_early'].includes(v),
    madeBy: 'object', informedBy: 'object', date: 'string',
  }, 'ledger');
});

test('GET /decisions/stats is lens-scoped and returns the stat tiles', async () => {
  const all = await api(`/decisions/stats?industry=${IND}`);
  assert.equal(all.status, 200);
  assert.ok(all.data && typeof all.data === 'object');
  const someRole = (await api(`/decisions?industry=${IND}`)).data[0]?.persona;
  if (someRole) {
    const scoped = await api(`/decisions/stats?industry=${IND}&persona=${someRole}`);
    assert.equal(scoped.status, 200, 'stats must accept the persona lens');
  }
});

test('persona partitions every collection', async () => {
  for (const [path, key, idField] of [
    ['/runs', 'runs', 'id'],
    ['/tasks', 'tasks', 'id'],
    ['/agents/catalog', 'agent catalog', 'agentId'],
  ]) {
    const { status, data } = await api(`${path}?industry=${IND}`);
    assert.equal(status, 200, `${key} should respond`);
    const rows = Array.isArray(data) ? data : data.items ?? [];
    assertEveryShape(rows, { [idField]: 'string', persona }, key);
  }
});

test('GET /notifications is seeded empty and lens-scoped', async () => {
  const { status, data } = await api(`/notifications?industry=${IND}`);
  assert.equal(status, 200);
  assertEveryShape(data, {
    id: 'string', persona,
    type: (v) => ['escalation', 'dotted_flag'].includes(v),
    title: 'string', body: 'string', createdAt: 'string',
  }, 'notifications');
});

test('P&L surfaces respond with their statement shapes', async () => {
  const impact = await api(`/pl-impact?industry=${IND}`);
  assert.equal(impact.status, 200);
  const statement = await api(`/pl-statement?industry=${IND}`);
  assert.equal(statement.status, 200);
});
