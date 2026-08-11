// The append-only ledger (P1.6): the evidence layer under the Decision Ledger
// screen. Decisions, verdicts and ownership transfers are hash-chained events;
// verification recomputes the whole chain; the anchor records the head.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, INDUSTRIES, MUTATIONS, assertEveryShape, en } from './_helpers.mjs';

const mut = { skip: !MUTATIONS && 'CONTRACT_MUTATIONS=0' };

const used = new Set();
async function takeOpenFinding() {
  for (const ind of INDUSTRIES) {
    const open = (await api(`/findings?industry=${ind}`)).data
      .filter((f) => f.status === 'open' && !used.has(f.id));
    if (open.length) { used.add(open[0].id); return { ind, finding: open[0] }; }
  }
  return null;
}

test('GET /ledger/events: hash-chained, seq-ordered', async () => {
  const { status, data } = await api('/ledger/events');
  assert.equal(status, 200);
  assert.ok(['postgres', 'memory'].includes(data.storeMode));
  assertEveryShape(data.events, {
    seq: 'number', id: 'string',
    kind: en('decision', 'verdict', 'transfer'),
    industry: 'string', actor: 'string', at: 'string',
    payload: 'object', prevHash: 'string', hash: 'string',
  }, 'ledger events');
  for (let i = 1; i < data.events.length; i++) {
    assert.ok(data.events[i].seq > data.events[i - 1].seq, 'seq ascends');
    assert.equal(data.events[i].prevHash, data.events[i - 1].hash, `event ${data.events[i].seq} chains to its predecessor`);
  }
});

test('a decision lands in the evidence layer, chained to the head', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  const before = (await api('/ledger/events')).data.events;
  const head = before[before.length - 1];

  await api(`/findings/${pick.finding.id}/disposition?industry=${pick.ind}`, {
    method: 'POST', body: { disposition: 'abandon', reason: 'Contract suite: evidence-layer check' },
  });

  const after = (await api('/ledger/events')).data.events;
  const evt = after.find((e) => e.kind === 'decision' && e.findingId === pick.finding.id);
  assert.ok(evt, 'the decision must be in the evidence layer');
  assert.ok(evt.actor, 'every event carries its actor');
  if (head) assert.ok(evt.seq > head.seq, 'appended after the previous head');
});

test('an escalation is an ownership-transfer event', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  await api(`/findings/${pick.finding.id}/escalate?industry=${pick.ind}`, { method: 'POST' });
  const events = (await api('/ledger/events')).data.events;
  const evt = events.find((e) => e.kind === 'transfer' && e.findingId === pick.finding.id);
  assert.ok(evt, 'the transfer must be in the evidence layer');
  assert.ok(evt.payload.from && evt.payload.to, 'a transfer names who held it and who holds it now');
});

test('the assessor verdict arrives as an event, not an edit', mut, async (t) => {
  const pick = await takeOpenFinding();
  if (!pick) return t.skip('no open finding available');
  const { data: decided } = await api(`/findings/${pick.finding.id}/disposition?industry=${pick.ind}`, {
    method: 'POST', body: { disposition: 'accept' },
  });
  await api(`/closure-kpis/${decided.closureKpiId}/close?industry=${pick.ind}`, { method: 'POST' });
  await api(`/decisions?industry=${pick.ind}`); // ledger read runs the assessor pass
  const events = (await api('/ledger/events')).data.events;
  const evt = events.find((e) => e.kind === 'verdict' && e.findingId === pick.finding.id);
  assert.ok(evt, 'the verdict must be in the evidence layer');
  assert.equal(evt.payload.verdict, 'worked');
  assert.equal(evt.actor, 'Assessor agent');
});

test('concurrent writers cannot break the chain', mut, async (t) => {
  // Appending is read-head-then-insert. If two writers interleave between the
  // two halves they land on the same seq and every reader after them sees a
  // ledger reporting itself tampered — the chain has to be right because the
  // writer was serialized, not because callers happened to take turns. (The
  // real trigger was a heartbeat escalating several findings in one tick, each
  // appending without awaiting; this is the contract-visible version.)
  // The assessor pass is the sharp case: one ledger read delivers a verdict for
  // every closure that came back, appending each without awaiting it. Two
  // verdicts in one pass is two writers in the same turn.
  const picks = [];
  for (let i = 0; i < 2; i++) {
    const pick = await takeOpenFinding();
    if (pick) picks.push(pick);
  }
  if (picks.length < 2) return t.skip('need at least two open findings');

  for (const p of picks) {
    const { data: decided } = await api(`/findings/${p.finding.id}/disposition?industry=${p.ind}`, {
      method: 'POST', body: { disposition: 'accept' },
    });
    await api(`/closure-kpis/${decided.closureKpiId}/close?industry=${p.ind}`, { method: 'POST' });
  }
  // One read, both verdicts.
  await api(`/decisions?industry=${picks[0].ind}`);

  const verify = await api('/ledger/verify');
  assert.equal(verify.data.ok, true, `chain must survive writers in one pass (broken at ${verify.data.brokenAt})`);

  const events = (await api('/ledger/events')).data.events;
  const seqs = events.map((e) => e.seq);
  assert.equal(new Set(seqs).size, seqs.length, 'every event holds its own position in the chain');
  for (const p of picks) {
    assert.ok(events.some((e) => e.kind === 'verdict' && e.findingId === p.finding.id), `${p.finding.id}'s verdict was recorded`);
  }
});

test('verify recomputes the chain; anchor records the verified head', mut, async () => {
  const verify = await api('/ledger/verify');
  assert.equal(verify.status, 200);
  assert.equal(verify.data.ok, true, `chain must verify (broken at ${verify.data.brokenAt})`);
  assert.equal(typeof verify.data.checked, 'number');

  const anchor = await api('/ledger/anchor', { method: 'POST' });
  assert.equal(anchor.status, 201);
  // The anchor re-verifies internally before recording; its head must be a
  // chain position at or after the one just verified (background sweeps may
  // append between the two calls).
  assert.ok(anchor.data.seq >= verify.data.checked, 'the anchor head is at or after the verified head');
  assert.ok(anchor.data.headHash);
  const anchors = (await api('/ledger/anchors')).data;
  assert.ok(anchors.some((a) => a.headHash === anchor.data.headHash));
});
