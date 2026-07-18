// Deterministic drift rules — pure functions, no I/O. These decide WHEN a
// counterpart raises a finding; the authoring module decides how it reads.
//
// Deviation is normalized so positive = bad regardless of direction:
//   up_good  (e.g. fill rate): below target is bad
//   down_good (e.g. cost/case): above target is bad

export function deviationPct(value, target, direction) {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target === 0) return 0;
  const raw = ((value - target) / Math.abs(target)) * 100;
  return direction === 'up_good' ? -raw : raw;
}

/** Ordinary least squares slope of value against time (units per day). */
export function olsSlopePerDay(series) {
  if (series.length < 2) return 0;
  const t0 = new Date(series[0].ts).getTime();
  const xs = series.map((p) => (new Date(p.ts).getTime() - t0) / 86_400_000);
  const ys = series.map((p) => p.value);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Evaluate one live-tracked mandate against its series (ascending, real points).
 * Returns null when there is not enough data; otherwise:
 *   { triggered: DriftRule[], dev, devs, slopePerDay, projectedDev14d, severity }
 */
export function evaluateNode(config, series) {
  if (!Array.isArray(series) || series.length < config.minPoints) return null;
  const { targetNumeric: target, direction, warnPct, breachPct, sustainedPoints } = config;

  const devs = series.map((p) => deviationPct(p.value, target, direction));
  const dev = devs[devs.length - 1];
  const window = series.slice(-Math.max(6, sustainedPoints * 2));
  const slopePerDay = olsSlopePerDay(window);
  // Slope in "bad units": positive = drifting away from target.
  const badSlope = direction === 'up_good' ? -slopePerDay : slopePerDay;
  const projectedDev14d = dev + (badSlope / Math.abs(target)) * 100 * 14;

  const triggered = [];
  if (dev >= breachPct) {
    triggered.push('threshold_breach');
  } else if (devs.length >= sustainedPoints && devs.slice(-sustainedPoints).every((d) => d >= warnPct)) {
    triggered.push('sustained_deviation');
  } else if (dev >= warnPct / 2 && badSlope > 0 && projectedDev14d >= breachPct) {
    triggered.push('trend_to_breach');
  }

  const severity = dev >= 2 * breachPct ? 'critical'
    : dev >= breachPct ? 'high'
    : triggered.includes('sustained_deviation') ? 'medium'
    : 'low';

  return { triggered, dev, devs, slopePerDay, projectedDev14d, severity };
}

/** SLA budget (hours) a finding gets before silence escalates, by severity. */
export const SLA_HOURS_BY_SEVERITY = { critical: 4, high: 8, medium: 24, low: 48 };

/**
 * Direction-aware recovery progress for a closure KPI: 0 at baseline, 100 at
 * target, clamped. baseline is where the number stood when the finding was
 * accepted; target is where it must return to.
 */
export function recoveryProgressPct(baseline, target, current, direction) {
  if (![baseline, target, current].every(Number.isFinite) || baseline === target) return 0;
  const pct = ((current - baseline) / (target - baseline)) * 100;
  // If the number moved past the target, cap at 100; if it regressed past
  // baseline, floor at 0. Direction is already encoded in baseline vs target.
  return Math.max(0, Math.min(100, Math.round(pct)));
}
