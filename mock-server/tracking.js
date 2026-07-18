// Store layer for live mandate tracking. One interface, two backends:
// Postgres when DATABASE_URL is set (the production path), an in-process
// memory store otherwise (so `npm run dev:all` needs zero setup). Only the
// live entities live here — seeded demo content stays in app.js state.
import { createHash, randomBytes } from 'node:crypto';
import { hasDb, query } from './db.js';
import { deviationPct, olsSlopePerDay } from './drift.js';

// ---------------------------------------------------------------------------
// Memory fallback (single-process dev mode)
// ---------------------------------------------------------------------------
const mem = {
  configs: new Map(), // nodeId -> config row (camelCase)
  points: new Map(), // nodeId -> [{ts, value, source}] asc
  keys: new Map(), // id -> {id, label, keyHash, createdAt, lastUsedAt, revokedAt}
  findings: new Map(), // id -> row {id, industry, nodeId, rule, status, authoredBy, finding, reAlert, slaDeadlineAt, sweepRunId}
  closures: new Map(), // id -> {id, industry, findingId, closure}
  sweeps: [], // newest first
  sweepLock: false,
};

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Display formatting — display strings stay derived from numbers.
// ---------------------------------------------------------------------------
export const CURRENCY_BY_INDUSTRY = { fmcg: 'AED', healthcare: 'USD', manufacturing: 'USD' };

export function formatValue(unit, format, value, industry) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const v = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, '');
  if (format) return format.replace('{v}', v);
  const cur = CURRENCY_BY_INDUSTRY[industry] ?? 'USD';
  switch (unit) {
    case 'pct': return `${v}%`;
    case 'currency_m': return `${cur} ${v}M`;
    case 'days': return `${v} days`;
    case 'ratio': return `${v}x`;
    default: return String(v);
  }
}

/**
 * Overlay live numeric truth onto a KPI brain at read time. Untracked nodes
 * pass through untouched, so seeded demo content is unaffected. Display
 * strings stay derived from the numbers.
 */
export async function overlayLiveTracking(brain) {
  const configs = (await listConfigs(brain.industry)).filter((c) => c.enabled);
  if (!configs.length) return brain;
  const seriesMap = await latestSeriesBatch(configs.map((c) => c.nodeId), 12);
  const configByNode = new Map(configs.map((c) => [c.nodeId, c]));
  const nodes = brain.nodes.map((node) => {
    const cfg = configByNode.get(node.id);
    const series = seriesMap.get(node.id);
    if (!cfg || !series?.length) return node;
    const latest = series[series.length - 1];
    const dev = deviationPct(latest.value, cfg.targetNumeric, cfg.direction);
    const slope = olsSlopePerDay(series);
    return {
      ...node,
      liveTracked: true,
      status: 'connected',
      currentNumeric: latest.value,
      targetNumeric: cfg.targetNumeric,
      unit: cfg.unit,
      currentValue: formatValue(cfg.unit, cfg.format, latest.value, brain.industry),
      targetValue: formatValue(cfg.unit, cfg.format, cfg.targetNumeric, brain.industry),
      health: dev < cfg.warnPct ? 'on_track' : dev < cfg.breachPct ? 'at_risk' : 'off_track',
      trend: series.length < 2 || Math.abs(slope) < 1e-9 ? 'flat' : slope > 0 ? 'up' : 'down',
      lastIngestAt: latest.ts,
      spark: series.map((p) => p.value),
    };
  });
  return { ...brain, nodes };
}

// ---------------------------------------------------------------------------
// Tracking configs
// ---------------------------------------------------------------------------
function configFromRow(r) {
  return {
    nodeId: r.node_id, industry: r.industry, unit: r.unit, format: r.format,
    direction: r.direction, targetNumeric: Number(r.target_numeric),
    warnPct: Number(r.warn_pct), breachPct: Number(r.breach_pct),
    sustainedPoints: r.sustained_points, minPoints: r.min_points,
    enabled: r.enabled, updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    latestValue: r.latest_value !== undefined && r.latest_value !== null ? Number(r.latest_value) : null,
    latestTs: r.latest_ts instanceof Date ? r.latest_ts.toISOString() : (r.latest_ts ?? null),
    pointCount: r.point_count !== undefined ? Number(r.point_count) : undefined,
  };
}

export async function listConfigs(industry) {
  if (hasDb()) {
    const { rows } = await query(
      `SELECT c.*, p.latest_value, p.latest_ts, p.point_count
         FROM tracking_configs c
         LEFT JOIN LATERAL (
           SELECT value AS latest_value, ts AS latest_ts,
                  (SELECT count(*) FROM metric_points WHERE node_id = c.node_id) AS point_count
             FROM metric_points WHERE node_id = c.node_id ORDER BY ts DESC LIMIT 1
         ) p ON true
        WHERE ($1::text IS NULL OR c.industry = $1)
        ORDER BY c.node_id`,
      [industry ?? null],
    );
    return rows.map(configFromRow);
  }
  return [...mem.configs.values()]
    .filter((c) => !industry || c.industry === industry)
    .map((c) => {
      const series = mem.points.get(c.nodeId) ?? [];
      const last = series[series.length - 1];
      return { ...c, latestValue: last?.value ?? null, latestTs: last?.ts ?? null, pointCount: series.length };
    });
}

export async function upsertConfig(cfg) {
  const row = {
    nodeId: cfg.nodeId, industry: cfg.industry, unit: cfg.unit ?? 'count', format: cfg.format ?? null,
    direction: cfg.direction === 'down_good' ? 'down_good' : 'up_good',
    targetNumeric: Number(cfg.targetNumeric),
    warnPct: Number(cfg.warnPct ?? 3), breachPct: Number(cfg.breachPct ?? 5),
    sustainedPoints: Number(cfg.sustainedPoints ?? 3), minPoints: Number(cfg.minPoints ?? 3),
    enabled: cfg.enabled !== false, updatedAt: nowIso(),
  };
  if (hasDb()) {
    await query(
      `INSERT INTO tracking_configs (node_id, industry, unit, format, direction, target_numeric,
                                     warn_pct, breach_pct, sustained_points, min_points, enabled, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (node_id) DO UPDATE SET
         industry=$2, unit=$3, format=$4, direction=$5, target_numeric=$6,
         warn_pct=$7, breach_pct=$8, sustained_points=$9, min_points=$10, enabled=$11, updated_at=now()`,
      [row.nodeId, row.industry, row.unit, row.format, row.direction, row.targetNumeric,
       row.warnPct, row.breachPct, row.sustainedPoints, row.minPoints, row.enabled],
    );
  } else {
    mem.configs.set(row.nodeId, row);
  }
  return row;
}

// ---------------------------------------------------------------------------
// Metric points
// ---------------------------------------------------------------------------
export async function insertPoints(points, ingestKeyId = null) {
  if (hasDb()) {
    for (const p of points) {
      await query(
        `INSERT INTO metric_points (node_id, ts, value, source, ingest_key_id)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (node_id, ts, source) DO UPDATE SET value = $3`,
        [p.nodeId, p.ts, p.value, p.source ?? 'api', ingestKeyId],
      );
    }
    return;
  }
  for (const p of points) {
    const series = mem.points.get(p.nodeId) ?? [];
    const source = p.source ?? 'api';
    const existing = series.find((x) => x.ts === p.ts && x.source === source);
    if (existing) existing.value = p.value;
    else series.push({ nodeId: p.nodeId, ts: p.ts, value: p.value, source });
    series.sort((a, b) => a.ts.localeCompare(b.ts));
    mem.points.set(p.nodeId, series);
  }
}

/** Ascending series for one node (last `limit` points). */
export async function latestSeries(nodeId, limit = 50) {
  if (hasDb()) {
    const { rows } = await query(
      `SELECT node_id, ts, value, source FROM metric_points WHERE node_id = $1 ORDER BY ts DESC LIMIT $2`,
      [nodeId, limit],
    );
    return rows.reverse().map((r) => ({ nodeId: r.node_id, ts: r.ts.toISOString(), value: Number(r.value), source: r.source }));
  }
  return (mem.points.get(nodeId) ?? []).slice(-limit);
}

/** Map of nodeId -> ascending series (last `limit` points each). */
export async function latestSeriesBatch(nodeIds, limit = 12) {
  const out = new Map();
  if (!nodeIds.length) return out;
  if (hasDb()) {
    const { rows } = await query(
      `SELECT node_id, ts, value FROM (
         SELECT node_id, ts, value, ROW_NUMBER() OVER (PARTITION BY node_id ORDER BY ts DESC) rn
           FROM metric_points WHERE node_id = ANY($1)
       ) t WHERE rn <= $2 ORDER BY node_id, ts ASC`,
      [nodeIds, limit],
    );
    for (const r of rows) {
      const list = out.get(r.node_id) ?? [];
      list.push({ ts: r.ts.toISOString(), value: Number(r.value) });
      out.set(r.node_id, list);
    }
    return out;
  }
  for (const id of nodeIds) {
    const series = mem.points.get(id) ?? [];
    if (series.length) out.set(id, series.slice(-limit).map(({ ts, value }) => ({ ts, value })));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ingest keys
// ---------------------------------------------------------------------------
const keyFromRow = (r) => ({
  id: r.id, label: r.label,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  lastUsedAt: r.last_used_at instanceof Date ? r.last_used_at.toISOString() : (r.last_used_at ?? null),
  revokedAt: r.revoked_at instanceof Date ? r.revoked_at.toISOString() : (r.revoked_at ?? null),
});

export async function createKey(label) {
  const plaintext = `rwv_${randomBytes(16).toString('hex')}`;
  const id = `ik-${Date.now()}`;
  const record = { id, label, keyHash: sha256(plaintext), createdAt: nowIso(), lastUsedAt: null, revokedAt: null };
  if (hasDb()) {
    await query(`INSERT INTO ingest_keys (id, label, key_hash) VALUES ($1,$2,$3)`, [id, label, record.keyHash]);
  } else {
    mem.keys.set(id, record);
  }
  return { id, label, key: plaintext, createdAt: record.createdAt, lastUsedAt: null, revokedAt: null };
}

export async function listKeys() {
  if (hasDb()) {
    const { rows } = await query(`SELECT id, label, created_at, last_used_at, revoked_at FROM ingest_keys ORDER BY created_at DESC`);
    return rows.map(keyFromRow);
  }
  return [...mem.keys.values()]
    .map(({ keyHash: _hash, ...rest }) => rest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function revokeKey(id) {
  if (hasDb()) {
    await query(`UPDATE ingest_keys SET revoked_at = now() WHERE id = $1`, [id]);
    return;
  }
  const k = mem.keys.get(id);
  if (k) k.revokedAt = nowIso();
}

/** Returns the key record if the raw key is valid and unrevoked, else null. */
export async function verifyKey(raw) {
  if (!raw) return null;
  const hash = sha256(raw);
  if (hasDb()) {
    const { rows } = await query(
      `UPDATE ingest_keys SET last_used_at = now() WHERE key_hash = $1 AND revoked_at IS NULL RETURNING id, label`,
      [hash],
    );
    return rows[0] ?? null;
  }
  const hit = [...mem.keys.values()].find((k) => k.keyHash === hash && !k.revokedAt);
  if (hit) hit.lastUsedAt = nowIso();
  return hit ?? null;
}

// ---------------------------------------------------------------------------
// Live findings / closures (Postgres is the source of truth; app.js hydrates)
// ---------------------------------------------------------------------------
const findingRowOut = (r) => ({
  id: r.id, industry: r.industry, nodeId: r.node_id, rule: r.rule, status: r.status,
  authoredBy: r.authored_by, finding: r.finding, reAlert: r.re_alert,
  slaDeadlineAt: r.sla_deadline_at instanceof Date ? r.sla_deadline_at.toISOString() : (r.sla_deadline_at ?? null),
  sweepRunId: r.sweep_run_id,
});

export async function loadLiveFindings() {
  if (hasDb()) {
    const { rows } = await query(`SELECT * FROM live_findings`);
    return rows.map(findingRowOut);
  }
  // Clone so memory mode behaves like Postgres: callers get fresh objects,
  // and only an explicit save mutates the store.
  return [...mem.findings.values()].map((r) => structuredClone(r));
}

/** Upsert; returns false when the partial-unique active-finding guard blocked an insert. */
export async function saveLiveFinding(row) {
  if (hasDb()) {
    const { rowCount } = await query(
      `INSERT INTO live_findings (id, industry, node_id, rule, status, authored_by, finding, re_alert, sla_deadline_at, sweep_run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         status=$5, finding=$7, re_alert=$8, sla_deadline_at=$9, updated_at=now()`,
      [row.id, row.industry, row.nodeId, row.rule, row.status, row.authoredBy,
       JSON.stringify(row.finding), row.reAlert ? JSON.stringify(row.reAlert) : null,
       row.slaDeadlineAt, row.sweepRunId]
    ).catch((err) => {
      if (err?.code === '23505') return { rowCount: 0 }; // active-finding guard fired
      throw err;
    });
    return rowCount > 0;
  }
  const isNew = !mem.findings.has(row.id);
  if (isNew) {
    const active = [...mem.findings.values()].find(
      (f) => f.nodeId === row.nodeId && ['open', 'acknowledged', 'accepted', 'acting'].includes(f.status),
    );
    if (active) return false;
  }
  mem.findings.set(row.id, { ...row });
  return true;
}

export async function loadLiveClosures() {
  if (hasDb()) {
    const { rows } = await query(`SELECT * FROM live_closure_kpis`);
    return rows.map((r) => ({ id: r.id, industry: r.industry, findingId: r.finding_id, closure: r.closure }));
  }
  return [...mem.closures.values()].map((r) => structuredClone(r));
}

export async function saveLiveClosure(row) {
  if (hasDb()) {
    await query(
      `INSERT INTO live_closure_kpis (id, industry, finding_id, closure) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET closure=$4, updated_at=now()`,
      [row.id, row.industry, row.findingId, JSON.stringify(row.closure)],
    );
    return;
  }
  mem.closures.set(row.id, { ...row });
}

// ---------------------------------------------------------------------------
// Sweep runs + overlap lock
// ---------------------------------------------------------------------------
const SWEEP_LOCK_KEY = 774921;

export async function tryAcquireSweepLock() {
  if (hasDb()) {
    const { rows } = await query(`SELECT pg_try_advisory_lock($1) AS ok`, [SWEEP_LOCK_KEY]);
    return rows[0]?.ok === true;
  }
  if (mem.sweepLock) return false;
  mem.sweepLock = true;
  return true;
}

export async function releaseSweepLock() {
  if (hasDb()) {
    await query(`SELECT pg_advisory_unlock($1)`, [SWEEP_LOCK_KEY]).catch(() => {});
    return;
  }
  mem.sweepLock = false;
}

const sweepRowOut = (r) => ({
  id: r.id, trigger: r.trigger,
  startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : r.started_at,
  finishedAt: r.finished_at instanceof Date ? r.finished_at.toISOString() : (r.finished_at ?? null),
  nodesEvaluated: r.nodes_evaluated, findingsRaised: r.findings_raised,
  reAlertsFired: r.re_alerts_fired, closuresProgressed: r.closures_progressed,
  authoredByClaude: r.authored_by_claude,
});

export async function insertSweepRun(run) {
  if (hasDb()) {
    await query(`INSERT INTO sweep_runs (id, trigger, started_at) VALUES ($1,$2,$3)`, [run.id, run.trigger, run.startedAt]);
    return;
  }
  mem.sweeps.unshift({ ...run, finishedAt: null, nodesEvaluated: 0, findingsRaised: 0, reAlertsFired: 0, closuresProgressed: 0, authoredByClaude: 0 });
}

export async function finishSweepRun(run) {
  if (hasDb()) {
    await query(
      `UPDATE sweep_runs SET finished_at=$2, nodes_evaluated=$3, findings_raised=$4,
              re_alerts_fired=$5, closures_progressed=$6, authored_by_claude=$7, errors=$8
        WHERE id=$1`,
      [run.id, run.finishedAt, run.nodesEvaluated, run.findingsRaised,
       run.reAlertsFired, run.closuresProgressed, run.authoredByClaude,
       run.errors?.length ? JSON.stringify(run.errors) : null],
    );
    return;
  }
  const idx = mem.sweeps.findIndex((s) => s.id === run.id);
  if (idx !== -1) mem.sweeps[idx] = { ...mem.sweeps[idx], ...run };
}

export async function listSweepRuns(limit = 20) {
  if (hasDb()) {
    const { rows } = await query(`SELECT * FROM sweep_runs ORDER BY started_at DESC LIMIT $1`, [limit]);
    return rows.map(sweepRowOut);
  }
  return mem.sweeps.slice(0, limit);
}
