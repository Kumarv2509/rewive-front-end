// The loop — the contract the product's promise rests on. Findings demand a
// decision; each of the four A's has a distinct, observable consequence; every
// decision lands in the ledger the moment it is made; closure delivers the
// assessor's verdict; silence escalates with a delivery.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, INDUSTRIES, MUTATIONS, assertShape, assertEveryShape, en, opt, persona } from './_helpers.mjs';

const FINDING_SPEC = {
  id: 'string', title: 'string', summary: 'string',
  raisedByAgentId: 'string', raisedByAgentName: 'string',
  streamKey: opt('string'), // null = org-level finding
  linkedKpiNodeId: 'string',
  severity: en('low', 'medium', 'high', 'critical'),
  status: en('open', 'accepted', 'acting', 'acknowledged', 'abandoned', 'closed'),
  disposition: opt(en('accept', 'act', 'acknowledge', 'abandon')),
  impactPath: 'array', evidence: 'array',
  slaHoursRemaining: 'number', escalationLevel: 'number',
  detectedAt: 'string', persona,
};

test('findings: shape per industry', async () => {
  for (const ind of INDUSTRIES) {
    const { status, data } = await api(`/findings?industry=${ind}`);
    assert.equal(status, 200);
    assert.ok(data.length > 0, `${ind} should have findings`);
    assertEveryShape(data, FINDING_SPEC, `${ind} findings`);
  }
});

test('findings: persona filter returns only that role; team scope is a superset', async () => {
  for (const ind of INDUSTRIES) {
    const all = (await api(`/findings?industry=${ind}`)).data;
    const role = all[0].persona;
    const solo = (await api(`/findings?industry=${ind}&persona=${role}`)).data;
    assert.ok(solo.length > 0);
    // The solo lens shows what is this role's business: findings it owns PLUS
    // findings dotted-flagged to it as they escalated along the functional line.
    for (const f of solo) {
      assert.ok(f.persona === role || f.dottedPersona === role,
        `${ind}: solo lens leaked ${f.id} (persona=${f.persona}, dotted=${f.dottedPersona})`);
    }
    const team = (await api(`/findings?industry=${ind}&persona=${role}&scope=team`)).data;
    const teamIds = new Set(team.map((f) => f.id));
    for (const f of solo) assert.ok(teamIds.has(f.id), `${ind}: team scope should include the role's own ${f.id}`);
  }
});

test('finding detail matches the list row', async () => {
  const list = (await api(`/findings?industry=${INDUSTRIES[0]}`)).data;
  const { status, data } = await api(`/findings/${list[0].id}?industry=${INDUSTRIES[0]}`);
  assert.equal(status, 200);
  assert.equal(data.id, list[0].id);
  assertShape(data, FINDING_SPEC, 'finding detail');
});

// ---------------------------------------------------------------------------
// Mutations: each branch of the decision, exercised on findings discovered at
// run time (never seed ids — the suite must hold against any data set).
const used = new Set();
async function takeOpenFinding() {
  for (const ind of INDUSTRIES) {
    const open = (await api(`/findings?industry=${ind}`)).data
      .filter((f) => f.status === 'open' && !used.has(f.id));
    if (open.length) { used.add(open[0].id); return { ind, finding: open[0] }; }
  }
  return null;
}

async function ledgerRowFor(ind, findingId) {
  return (await api(`/decisions?industry=${ind}`)).data.find((d) => d.findingId === findingId);
}

const mut = { skip: !MUTATIONS && 'CONTRACT_MUTATIONS=0' };

test('Accept: recovery target created, ledger written, closure delivers the verdict', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  const { ind, finding } = pick;

  const { status, data: decided } = await api(`/findings/${finding.id}/disposition?industry=${ind}`, {
    method: 'POST', body: { disposition: 'accept' },
  });
  assert.equal(status, 200);
  assert.equal(decided.status, 'accepted');
  assert.ok(decided.closureKpiId, 'accept must mint a recovery target');

  const closure = (await api(`/closure-kpis?industry=${ind}`)).data.find((c) => c.id === decided.closureKpiId);
  assert.ok(closure, 'the recovery target must be watchable');
  assert.equal(closure.findingId, finding.id);
  assert.equal(closure.status, 'tracking');

  const row = await ledgerRowFor(ind, finding.id);
  assert.ok(row, 'the decision must land in the ledger the moment it is made');
  assert.ok(row.title.startsWith('Accept — '), `ledger title uses the UI verb (got "${row.title}")`);
  assert.equal(row.persona, finding.persona, 'the ledger row belongs to the deciding role');

  // Close the loop: the number is back → the finding closes with a verdict,
  // and the assessor upgrades the ledger row from "too early".
  const closed = await api(`/closure-kpis/${closure.id}/close?industry=${ind}`, { method: 'POST' });
  assert.equal(closed.data.status, 'closed');
  const after = (await api(`/findings/${finding.id}?industry=${ind}`)).data;
  assert.equal(after.status, 'closed');
  assert.equal(after.assessorVerdict?.verdict, 'worked');
  assert.equal((await ledgerRowFor(ind, finding.id)).verdict, 'worked');
});

test('Act: a fix is opened and linked back to the finding', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  const { ind, finding } = pick;
  const { data: decided } = await api(`/findings/${finding.id}/disposition?industry=${ind}`, {
    method: 'POST', body: { disposition: 'act' },
  });
  assert.equal(decided.status, 'acting');
  assert.ok(decided.solutionDesignId, 'act must open a solution design');
  const sol = await api(`/solutions/${decided.solutionDesignId}?industry=${ind}`);
  assert.equal(sol.status, 200);
  assert.equal(sol.data.signalId, finding.id, 'the fix must trace back to its finding');
  assert.ok((await ledgerRowFor(ind, finding.id)).title.startsWith('Act — '));
});

test('Park (acknowledge): carries a re-alert rule', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  const { ind, finding } = pick;
  const { data: decided } = await api(`/findings/${finding.id}/disposition?industry=${ind}`, {
    method: 'POST', body: { disposition: 'acknowledge' },
  });
  assert.equal(decided.status, 'acknowledged');
  assert.ok(decided.reAlertCondition, 'a parked finding must say when it comes back');
  assert.ok((await ledgerRowFor(ind, finding.id)).title.startsWith('Park — '));
});

test('Dismiss (abandon): refused without a reason — the reason tunes the agent', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  const { ind, finding } = pick;
  const refused = await api(`/findings/${finding.id}/disposition?industry=${ind}`, {
    method: 'POST', body: { disposition: 'abandon' },
  });
  assert.equal(refused.status, 400, 'dismiss without a reason must be refused');

  const { data: decided } = await api(`/findings/${finding.id}/disposition?industry=${ind}`, {
    method: 'POST', body: { disposition: 'abandon', reason: 'Contract suite: known seasonal dip, not drift' },
  });
  assert.equal(decided.status, 'abandoned');
  assert.ok(decided.dispositionReason);
  assert.ok((await ledgerRowFor(ind, finding.id)).title.startsWith('Dismiss — '));

  // A decided finding refuses a second decision — the ledger never forks.
  const again = await api(`/findings/${finding.id}/disposition?industry=${ind}`, {
    method: 'POST', body: { disposition: 'accept' },
  });
  assert.equal(again.status, 400);
});

test('Escalation walks ownership up and delivers to the new owner', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  const { ind, finding } = pick;
  const before = finding.escalationLevel;
  const { status, data: escalated } = await api(`/findings/${finding.id}/escalate?industry=${ind}`, { method: 'POST' });
  assert.equal(status, 200);
  assert.equal(escalated.escalationLevel, before + 1);
  const inbox = (await api(`/notifications?industry=${ind}&persona=${escalated.persona}`)).data;
  assert.ok(
    inbox.some((n) => n.findingId === finding.id),
    'the new owner must hear about it without having the product open',
  );
});

test('Finding actions: add, progress, and validate', mut, async (t) => {
  const anyFinding = (await api(`/findings?industry=${INDUSTRIES[0]}`)).data[0];
  if (!anyFinding) return t.skip('no findings');
  const created = await api(`/findings/${anyFinding.id}/actions?industry=${INDUSTRIES[0]}`, {
    method: 'POST', body: { title: 'Contract suite action', owner: 'Contract Suite' },
  });
  assert.equal(created.status, 201, 'creating a resource answers 201');
  assertShape(created.data, {
    id: 'string', findingId: 'string', title: 'string', owner: 'string',
    source: en('human', 'worker'), status: en('open', 'in_progress', 'blocked', 'done'),
  }, 'created action');

  const patched = await api(`/finding-actions/${created.data.id}?industry=${INDUSTRIES[0]}`, {
    method: 'PATCH', body: { status: 'in_progress' },
  });
  assert.equal(patched.data.status, 'in_progress');

  const bad = await api(`/finding-actions/${created.data.id}?industry=${INDUSTRIES[0]}`, {
    method: 'PATCH', body: { status: 'not-a-status' },
  });
  assert.equal(bad.status, 400);
});
