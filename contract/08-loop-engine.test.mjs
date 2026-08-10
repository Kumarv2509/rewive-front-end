// The loop engine (P1.5): durable wall-clock timers behind the promise that
// the loop runs whether or not anyone is watching. Timers are wake-ups, not
// truth — the executor re-reads the live row before acting.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, MUTATIONS, assertEveryShape, en } from './_helpers.mjs';

test('GET /loop-timers lists the timer queue', async () => {
  const { status, data } = await api('/loop-timers');
  assert.equal(status, 200);
  assert.ok(['postgres', 'memory'].includes(data.storeMode));
  assertEveryShape(data.timers, {
    id: 'string',
    kind: en('sla_escalation', 're_alert_window'),
    subjectId: 'string', industry: 'string', fireAt: 'string',
    status: en('pending', 'fired', 'cancelled'),
  }, 'timers');
});

test('POST /loop-engine/tick claims due timers and reports what it did', { skip: !MUTATIONS && 'CONTRACT_MUTATIONS=0' }, async () => {
  const { status, data } = await api('/loop-engine/tick', { method: 'POST', body: {} });
  assert.equal(status, 200);
  assert.equal(typeof data.claimed, 'number');
  assert.ok(Array.isArray(data.results));
});

test('a sweep-raised finding is born with an armed SLA wake-up', { skip: process.env.CONTRACT_SWEEP !== '1' && 'set CONTRACT_SWEEP=1 (slow)' }, async (t) => {
  await api('/agent-sweep', { method: 'POST' });
  const industries = ['fmcg', 'healthcare', 'hypermarket', 'manufacturing'];
  let checked = 0;
  for (const ind of industries) {
    const live = (await api(`/findings?industry=${ind}`)).data.filter((f) => f.id.startsWith('live-') && f.status === 'open');
    if (!live.length) continue;
    const timers = (await api('/loop-timers')).data.timers;
    for (const f of live) {
      assert.ok(
        timers.some((tm) => tm.subjectId === f.id && tm.kind === 'sla_escalation' && tm.status === 'pending'),
        `live finding ${f.id} should have a pending SLA wake-up`,
      );
      checked += 1;
    }
  }
  if (!checked) t.skip('no open live findings after the sweep');
});

test('Park phrasing becomes the clock: "after 2 weeks" arms a ~14-day window', { skip: process.env.CONTRACT_SWEEP !== '1' && 'set CONTRACT_SWEEP=1 (slow)' }, async (t) => {
  await api('/agent-sweep', { method: 'POST' });
  let pick = null;
  for (const ind of ['fmcg', 'healthcare', 'hypermarket', 'manufacturing']) {
    const live = (await api(`/findings?industry=${ind}`)).data.filter((f) => f.id.startsWith('live-') && f.status === 'open');
    if (live.length) { pick = { ind, finding: live[0] }; break; }
  }
  if (!pick) return t.skip('no open live finding to park');
  await api(`/findings/${pick.finding.id}/disposition?industry=${pick.ind}`, {
    method: 'POST', body: { disposition: 'acknowledge', reAlertCondition: 'known issue — review after 2 weeks' },
  });
  const timer = (await api('/loop-timers')).data.timers
    .find((tm) => tm.subjectId === pick.finding.id && tm.kind === 're_alert_window' && tm.status === 'pending');
  assert.ok(timer, 'parking must arm a re-alert window');
  const days = (new Date(timer.fireAt).getTime() - Date.now()) / 86_400_000;
  assert.ok(days > 13 && days < 15, `"after 2 weeks" must be a ~14-day clock, got ${days.toFixed(1)}d — an unparsed phrase silently becoming the default is a wrong clock`);
});
