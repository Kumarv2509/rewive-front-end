// Default live-tracked mandates, so a fresh boot has something real for the
// sweep to walk — the Findings live analysis strip and the Connectors screen
// are both blank until at least one mandate carries a metric series.
//
// The numbers are NOT invented here: target and latest value are parsed off
// the KPI brain's own `targetValue` / `currentValue` for each node. That keeps
// live tracking consistent with the seeded demo copy in both directions —
// overlayLiveTracking() writes these series back over the same fields, so the
// Operating Picture keeps showing the number it always showed.
//
// Each industry gets two mandates trending back toward target (they read
// `clear` in the strip) and at least two drifting away (they raise a finding
// on the first sweep). Healthcare carries two extra worsening cash mandates —
// days in AR and point-of-service collections — because the CFO story is the
// one that gets walked through live. Thresholds are per-mandate because real
// tolerances differ: bed occupancy is allowed to wander further than a
// food-safety audit score.
import * as tracking from './tracking.js';

const POINTS = 30; // one per day, ~a month of history — enough for every rule

/**
 * shape: 'worsening' walks from target down to today's value (this is what
 * raises); 'improving' walks from twice the current gap back up to it, so the
 * slope points at target and the trend rules stay quiet.
 */
const MANDATES = [
  // ---- FMCG ----
  { nodeId: 'fmcg-k-yield', entity: 'KSA Manufacturing Co.', region: 'KSA', direction: 'up_good',   unit: 'pct', warnPct: 2, breachPct: 4, shape: 'improving' },
  { nodeId: 'fmcg-k-audit', entity: 'UAE Trading Co.', region: 'UAE', direction: 'up_good',   unit: 'count', warnPct: 2, breachPct: 3, shape: 'improving' },
  { nodeId: 'fmcg-k-fill', entity: 'UAE Trading Co.', region: 'UAE',  direction: 'up_good',   unit: 'pct', warnPct: 3, breachPct: 5, shape: 'worsening' },
  { nodeId: 'fmcg-k-cpc', entity: 'Gulf Distribution Co.', region: 'UAE',   direction: 'down_good', unit: 'currency', format: 'AED {v}', warnPct: 3, breachPct: 5, shape: 'worsening' },
  // ---- Healthcare ----
  { nodeId: 'hc-k-bed', entity: 'Medcare Hospital Al Safa', region: 'Dubai',                          direction: 'up_good',   unit: 'pct', warnPct: 5, breachPct: 8, shape: 'improving' },
  { nodeId: 'hc-k-generic', entity: 'Medcare Hospital Al Safa', region: 'Dubai',                      direction: 'up_good',   unit: 'pct', warnPct: 6, breachPct: 9, shape: 'improving' },
  { nodeId: 'hc-k-cleanclaim', entity: 'Medcare Hospital Al Safa', region: 'Dubai',                   direction: 'up_good',   unit: 'pct', warnPct: 3, breachPct: 5, shape: 'worsening' },
  { nodeId: 'hc-k-denial', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates', direction: 'down_good', unit: 'pct', warnPct: 5, breachPct: 10, shape: 'worsening' },
  // The CFO's cash mandates — these are what a CFO wants watched live.
  { nodeId: 'hc-k-ar', entity: 'Medcare Medical Centre — Abu Dhabi', region: 'Abu Dhabi',             direction: 'down_good', unit: 'count', format: '{v} days', warnPct: 6, breachPct: 12, shape: 'worsening' },
  { nodeId: 'hc-k-poscash', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates', direction: 'up_good', unit: 'pct', warnPct: 5, breachPct: 9, shape: 'worsening' },
  // ---- Manufacturing ----
  { nodeId: 'mfg-k-throughput', entity: 'Plant 1 — Jebel Ali', region: 'UAE', direction: 'up_good',   unit: 'pct', warnPct: 8, breachPct: 12, shape: 'improving' },
  { nodeId: 'mfg-k-fpy', entity: 'Plant 1 — Jebel Ali', region: 'UAE',        direction: 'up_good',   unit: 'pct', warnPct: 3, breachPct: 5, shape: 'improving' },
  { nodeId: 'mfg-k-supotd', entity: 'Plant 2 — Dammam', region: 'KSA',     direction: 'up_good',   unit: 'pct', warnPct: 3, breachPct: 6, shape: 'worsening' },
  { nodeId: 'mfg-k-unplanned', entity: 'Plant 2 — Dammam', region: 'KSA',  direction: 'down_good', unit: 'count', format: '{v} h/wk', warnPct: 5, breachPct: 10, shape: 'worsening' },
];

/** "AED 3.90" → 3.9, "< 1.0" → 1, "$1,240" → 1240, "22 h/wk" → 22. */
function parseNumber(display) {
  if (typeof display !== 'string') return null;
  const match = display.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/**
 * A deterministic series — no Math.random, so every demo boot tells the same
 * story and a screenshot taken today still matches one taken tomorrow.
 */
function buildSeries(nodeId, from, to, target) {
  const wobble = Math.abs(target) * 0.004;
  // Snapped to midnight UTC: metric_points is unique on (node_id, ts, source),
  // so a re-seed updates the same 30 rows instead of laying down a second,
  // slightly-offset series. Two instances cold-starting at once is otherwise a
  // real way to corrupt the history.
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const points = [];
  for (let i = POINTS - 1; i >= 0; i -= 1) {
    const t = (POINTS - 1 - i) / (POINTS - 1);
    const value = from + (to - from) * t + Math.sin(i * 1.7) * wobble;
    points.push({
      nodeId,
      value: Number(value.toFixed(2)),
      ts: new Date(midnight.getTime() - i * 86_400_000).toISOString(),
      source: 'seed',
    });
  }
  return points;
}

/**
 * Idempotent: seeds only when no tracking config exists at all, so it never
 * stomps mandates configured on the Connectors screen or held in Postgres.
 * Returns the number of mandates seeded.
 */
export async function seedTrackingIfEmpty(getBrains) {
  const existing = await tracking.listConfigs(null);
  if (existing.length) return 0;

  const nodes = new Map();
  for (const brain of Object.values(getBrains())) {
    for (const node of brain.nodes) nodes.set(node.id, { node, industry: brain.industry });
  }

  let seeded = 0;
  for (const m of MANDATES) {
    const hit = nodes.get(m.nodeId);
    if (!hit) continue;
    const target = parseNumber(hit.node.targetValue);
    const current = parseNumber(hit.node.currentValue);
    if (!Number.isFinite(target) || !Number.isFinite(current) || target === 0) continue;

    await tracking.upsertConfig({
      nodeId: m.nodeId,
      industry: hit.industry,
      unit: m.unit,
      format: m.format ?? null,
      direction: m.direction,
      targetNumeric: target,
      warnPct: m.warnPct,
      breachPct: m.breachPct,
      entity: m.entity,
      region: m.region,
      enabled: true,
    });

    // Improving mandates start at twice today's gap and close it; worsening
    // ones start on target and walk off it.
    const from = m.shape === 'improving' ? current - (target - current) : target;
    await tracking.insertPoints(buildSeries(m.nodeId, from, current, target));
    seeded += 1;
  }
  return seeded;
}
