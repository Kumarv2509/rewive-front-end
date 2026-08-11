// The append-only ledger (ARCH-GTM-001 P1.6): the durable evidence layer
// under the Decision Ledger screen. Three event kinds — a decision made, a
// verdict delivered, an ownership transfer — each hash-chained to the one
// before it, so tampering with history breaks every hash after the edit.
//
// Demo-grade honesty:
// - Postgres mode writes ledger_events (migration 004), whose immutability is
//   enforced by a BEFORE UPDATE OR DELETE trigger — stronger than revoked
//   grants (it binds the table owner too). Grant hygiene per role is an Azure
//   target concern; the trigger is the in-repo enforcement.
// - Memory mode keeps the same chain in-process and rides the KV snapshot.
//   Unlike live-* rows, events are history, not re-raisable state — they are
//   never stripped, and a findingId pointing at a vanished live finding is an
//   honest fact about the past, not a bug.
// - The screen's ledger (decisionLedgerState) stays the display surface; this
//   module is the audit substrate. The anchor is the externalizable head hash
//   (at the target: notarized out of the tenant's blast radius).
import crypto from 'node:crypto';
import { hasDb, query } from './db.js';

const GENESIS = 'rewive-ledger-genesis';

let memoryEvents = []; // {seq, id, kind, industry, persona, findingId, actor, at, payload, prevHash, hash}
let memoryAnchors = [];
let tablesReady = false;

export const ledgerStoreMode = () => (hasDb() ? 'postgres' : 'memory');

function hashEvent(prevHash, evt) {
  return crypto.createHash('sha256')
    .update(prevHash)
    .update(JSON.stringify([evt.id, evt.kind, evt.industry, evt.persona, evt.findingId, evt.actor, evt.at, evt.payload]))
    .digest('hex');
}

async function ensureTables() {
  if (tablesReady || !hasDb()) return;
  // Mirrors migrations/004-ledger-events.sql (lazily ensured, same pattern as
  // loop_timers) — including the append-only trigger.
  await query(`CREATE TABLE IF NOT EXISTS ledger_events (
    seq        bigserial PRIMARY KEY,
    id         text NOT NULL UNIQUE,
    kind       text NOT NULL CHECK (kind IN ('decision', 'verdict', 'transfer')),
    industry   text NOT NULL,
    persona    text,
    finding_id text,
    actor      text NOT NULL,
    at         timestamptz NOT NULL,
    payload    jsonb NOT NULL,
    prev_hash  text NOT NULL,
    hash       text NOT NULL
  )`);
  await query(`CREATE TABLE IF NOT EXISTS ledger_anchors (
    seq         bigint NOT NULL,
    head_hash   text NOT NULL,
    anchored_at timestamptz NOT NULL DEFAULT now()
  )`);
  await query(`CREATE OR REPLACE FUNCTION ledger_events_immutable() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'ledger_events is append-only'; END
    $$ LANGUAGE plpgsql`);
  await query(`DROP TRIGGER IF EXISTS ledger_events_no_rewrite ON ledger_events;
    CREATE TRIGGER ledger_events_no_rewrite BEFORE UPDATE OR DELETE ON ledger_events
    FOR EACH ROW EXECUTE FUNCTION ledger_events_immutable()`);
  tablesReady = true;
}

async function headOf() {
  if (hasDb()) {
    await ensureTables();
    const { rows } = await query('SELECT seq, hash FROM ledger_events ORDER BY seq DESC LIMIT 1');
    return rows[0] ? { seq: Number(rows[0].seq), hash: rows[0].hash } : { seq: 0, hash: GENESIS };
  }
  const last = memoryEvents[memoryEvents.length - 1];
  return last ? { seq: last.seq, hash: last.hash } : { seq: 0, hash: GENESIS };
}

/** Append one event to the chain — serialized inside this module.
 *
 * Read-head-then-insert is only atomic if nothing interleaves between the two,
 * and the request-level liveLock does not deliver that: two of the three call
 * sites append fire-and-forget (the verdict pass, escalation transfers), so
 * their promises outlive the request that started them. A heartbeat escalating
 * three findings in one tick had all three appends read the same head, land on
 * the same seq, and break the chain at the second one — an honest chain
 * reporting itself tampered because the writer, not history, was wrong.
 *
 * The queue makes the pairing atomic whether or not the caller awaits. Across
 * processes (Postgres, multiple instances) ordering would need a transaction
 * with an advisory lock; that belongs with the production API, and `bigserial`
 * already keeps seq unique there.
 */
let appendQueue = Promise.resolve();

export function appendEvent(input) {
  const run = appendQueue.then(() => appendOne(input), () => appendOne(input));
  // A rejected append must not poison the queue for the next writer.
  appendQueue = run.then(() => undefined, () => undefined);
  return run;
}

async function appendOne({ kind, industry, persona = null, findingId = null, actor, payload }) {
  const head = await headOf();
  const evt = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind, industry, persona, findingId, actor,
    at: new Date().toISOString(),
    payload,
  };
  const hash = hashEvent(head.hash, evt);
  if (hasDb()) {
    await query(
      `INSERT INTO ledger_events (id, kind, industry, persona, finding_id, actor, at, payload, prev_hash, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [evt.id, evt.kind, evt.industry, evt.persona, evt.findingId, evt.actor, evt.at, JSON.stringify(evt.payload), head.hash, hash],
    );
  } else {
    memoryEvents.push({ seq: head.seq + 1, ...evt, prevHash: head.hash, hash });
  }
  return { seq: head.seq + 1, hash };
}

export async function listEvents(industry = null, limit = 200) {
  if (hasDb()) {
    await ensureTables();
    const { rows } = industry
      ? await query('SELECT * FROM ledger_events WHERE industry=$1 ORDER BY seq LIMIT $2', [industry, limit])
      : await query('SELECT * FROM ledger_events ORDER BY seq LIMIT $1', [limit]);
    return rows.map((r) => ({
      seq: Number(r.seq), id: r.id, kind: r.kind, industry: r.industry, persona: r.persona,
      findingId: r.finding_id, actor: r.actor,
      at: r.at instanceof Date ? r.at.toISOString() : r.at,
      payload: r.payload, prevHash: r.prev_hash, hash: r.hash,
    }));
  }
  return (industry ? memoryEvents.filter((e) => e.industry === industry) : memoryEvents).slice(0, limit);
}

/** Walk the whole chain and recompute every hash. Any edit to any historical
 * event breaks the chain at that seq — that is the tamper evidence. */
export async function verifyChain() {
  const events = await listEvents(null, 100_000);
  let prev = GENESIS;
  for (const e of events) {
    if (e.prevHash !== prev || hashEvent(prev, e) !== e.hash) {
      return { ok: false, checked: events.length, brokenAt: e.seq };
    }
    prev = e.hash;
  }
  return { ok: true, checked: events.length, headHash: prev };
}

/** The periodic anchor: record the current head so later verification can
 * prove nothing before it changed. At the target this hash leaves the
 * tenant's blast radius (object storage / notary); here it is stored and
 * returned for the caller to externalize. */
export async function anchorHead() {
  const check = await verifyChain();
  if (!check.ok) {
    const err = new Error(`chain broken at seq ${check.brokenAt} — refusing to anchor a tampered ledger`);
    err.status = 409;
    throw err;
  }
  const anchor = { seq: check.checked, headHash: check.headHash, anchoredAt: new Date().toISOString() };
  if (hasDb()) {
    await ensureTables();
    await query('INSERT INTO ledger_anchors (seq, head_hash, anchored_at) VALUES ($1,$2,$3)', [anchor.seq, anchor.headHash, anchor.anchoredAt]);
  } else {
    memoryAnchors.push(anchor);
  }
  return anchor;
}

export async function listAnchors() {
  if (hasDb()) {
    await ensureTables();
    const { rows } = await query('SELECT * FROM ledger_anchors ORDER BY anchored_at DESC LIMIT 50');
    return rows.map((r) => ({
      seq: Number(r.seq), headHash: r.head_hash,
      anchoredAt: r.anchored_at instanceof Date ? r.anchored_at.toISOString() : r.anchored_at,
    }));
  }
  return [...memoryAnchors].reverse().slice(0, 50);
}

// KV snapshot round-trip (memory mode). Events are history — never stripped.
export function exportLedger() {
  return { events: memoryEvents, anchors: memoryAnchors };
}

export function importLedger(blob) {
  if (!blob) return;
  memoryEvents = blob.events ?? [];
  memoryAnchors = blob.anchors ?? [];
}
