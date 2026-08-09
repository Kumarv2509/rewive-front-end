// Durable loop timers (ARCH-GTM-001 P1.5): the wall-clock half of the loop
// engine. A timer is a WAKE-UP, never the truth — the executor re-reads the
// live row when a timer fires and acts only if the state still warrants it,
// so a stale or duplicate wake-up is harmless by construction.
//
// Postgres mode is the real pattern the target keeps: a `loop_timers` queue
// claimed with FOR UPDATE SKIP LOCKED — multiple workers can tick without
// double-claiming, and timers survive worker death because they were never in
// the worker. Memory mode mirrors the exact semantics in-process (dev:all
// zero-setup); memory timers die with the process, same as memory-mode live
// findings, and are deliberately NOT in the KV snapshot (live-* convention).
//
// The clock half lives here; the DATA half (trip-wire worsening, recovery
// progress) stays with the sweep — those are events from metrics, not clocks.
import { hasDb, query } from './db.js';

export const TIMER_KINDS = ['sla_escalation', 're_alert_window'];

export const timerStoreMode = () => (hasDb() ? 'postgres' : 'memory');

let memoryTimers = []; // {id, kind, subjectId, industry, fireAt, status, createdAt, firedAt}
let seq = 0;
let tableReady = false;

async function ensureTable() {
  if (tableReady || !hasDb()) return;
  // Same DDL as migrations/003-loop-timers.sql — ensured lazily so the shared
  // store works even before `npm run migrate` has been re-run.
  await query(`CREATE TABLE IF NOT EXISTS loop_timers (
    id         bigserial PRIMARY KEY,
    kind       text NOT NULL,
    subject_id text NOT NULL,
    industry   text NOT NULL,
    fire_at    timestamptz NOT NULL,
    status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fired', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    fired_at   timestamptz
  )`);
  await query(`CREATE INDEX IF NOT EXISTS loop_timers_due ON loop_timers (status, fire_at)`);
  tableReady = true;
}

/** One pending timer per (kind, subject): scheduling replaces any pending
 * sibling, so a moved deadline never leaves two wake-ups racing. */
export async function scheduleTimer({ kind, subjectId, industry, fireAt }) {
  if (hasDb()) {
    await ensureTable();
    await query(`UPDATE loop_timers SET status='cancelled' WHERE status='pending' AND kind=$1 AND subject_id=$2`, [kind, subjectId]);
    await query(`INSERT INTO loop_timers (kind, subject_id, industry, fire_at) VALUES ($1,$2,$3,$4)`, [kind, subjectId, industry, fireAt]);
  } else {
    memoryTimers = memoryTimers.map((t) =>
      t.status === 'pending' && t.kind === kind && t.subjectId === subjectId ? { ...t, status: 'cancelled' } : t);
    memoryTimers.push({
      id: `mt-${++seq}`, kind, subjectId, industry, fireAt,
      status: 'pending', createdAt: new Date().toISOString(), firedAt: null,
    });
  }
}

export async function cancelTimers(subjectId, kind = null) {
  if (hasDb()) {
    await ensureTable();
    if (kind) await query(`UPDATE loop_timers SET status='cancelled' WHERE status='pending' AND subject_id=$1 AND kind=$2`, [subjectId, kind]);
    else await query(`UPDATE loop_timers SET status='cancelled' WHERE status='pending' AND subject_id=$1`, [subjectId]);
  } else {
    memoryTimers = memoryTimers.map((t) =>
      t.status === 'pending' && t.subjectId === subjectId && (!kind || t.kind === kind) ? { ...t, status: 'cancelled' } : t);
  }
}

/** Claim up to `limit` due timers — atomically flipped to 'fired' so a second
 * concurrent tick cannot claim them (SKIP LOCKED in Postgres, synchronous
 * mutation in memory). Returns the claimed rows for execution. */
export async function claimDueTimers(limit = 20, asOf = Date.now()) {
  if (hasDb()) {
    await ensureTable();
    const { rows } = await query(
      `UPDATE loop_timers SET status='fired', fired_at=now()
       WHERE id IN (
         SELECT id FROM loop_timers
         WHERE status='pending' AND fire_at <= $1
         ORDER BY fire_at
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, kind, subject_id, industry, fire_at`,
      [new Date(asOf).toISOString(), limit],
    );
    return rows.map((r) => ({
      id: String(r.id), kind: r.kind, subjectId: r.subject_id, industry: r.industry,
      fireAt: r.fire_at instanceof Date ? r.fire_at.toISOString() : r.fire_at,
    }));
  }
  const due = memoryTimers
    .filter((t) => t.status === 'pending' && new Date(t.fireAt).getTime() <= asOf)
    .sort((a, b) => new Date(a.fireAt) - new Date(b.fireAt))
    .slice(0, limit);
  const now = new Date().toISOString();
  for (const t of due) { t.status = 'fired'; t.firedAt = now; }
  return due.map(({ id, kind, subjectId, industry, fireAt }) => ({ id, kind, subjectId, industry, fireAt }));
}

export async function listTimers(industry = null) {
  if (hasDb()) {
    await ensureTable();
    const { rows } = industry
      ? await query(`SELECT * FROM loop_timers WHERE industry=$1 ORDER BY fire_at LIMIT 200`, [industry])
      : await query(`SELECT * FROM loop_timers ORDER BY fire_at LIMIT 200`);
    return rows.map((r) => ({
      id: String(r.id), kind: r.kind, subjectId: r.subject_id, industry: r.industry,
      fireAt: r.fire_at instanceof Date ? r.fire_at.toISOString() : r.fire_at,
      status: r.status,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      firedAt: r.fired_at instanceof Date ? r.fired_at.toISOString() : r.fired_at,
    }));
  }
  return memoryTimers.filter((t) => !industry || t.industry === industry).slice(0, 200);
}
