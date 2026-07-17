// Half-year review, derived — not seeded. The Decisions screen's month-by-month
// panel is computed at request time from the live in-memory state (findings,
// closure KPIs, decision ledger), so its numbers always reconcile with what the
// Findings and Ledger screens show, even after seeds change or a demo escalates
// and dispositions findings mid-session. A real backend would run the same
// bucketing over its store.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Six prior calendar months plus the current one — the fresh open findings all
// land in the current month, so the window must include it.
const WINDOW_MONTHS = 7;

// Ledger dates are display strings ('12 May', or 'ongoing' for standing policy
// decisions). Resolve to the most recent occurrence not in the future.
function parseLedgerDate(str, now) {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})$/.exec((str || '').trim());
  if (!m) return null;
  const monthIdx = MONTHS.indexOf(m[2]);
  if (monthIdx < 0) return null;
  let date = new Date(now.getFullYear(), monthIdx, Number(m[1]));
  if (date > now) date = new Date(now.getFullYear() - 1, monthIdx, Number(m[1]));
  return date;
}

// measuredImpact.text is pre-formatted copy ('+AED 210k / qtr', '+$1.1M OR
// revenue / qtr'); only currency amounts are summable — pts/hours/% are not.
function parseImpactAmount(text) {
  const m = /(?:AED|\$)\s?([\d,.]+)\s?([kKmM])?/.exec(text || '');
  if (!m) return 0;
  const value = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(value)) return 0;
  const unit = (m[2] || '').toLowerCase();
  return value * (unit === 'm' ? 1e6 : unit === 'k' ? 1e3 : 1);
}

function formatImpact(sum, currency) {
  if (sum <= 0) return '—';
  const n = sum >= 1e6 ? `${(sum / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(sum / 1e3)}k`;
  return currency === '$' ? `+$${n}` : `+${currency} ${n}`;
}

const monthKey = (date) => date.getFullYear() * 12 + date.getMonth();

export function deriveHalfYear({ findings = [], closures = [], ledger = [], currency = 'AED', now = new Date() }) {
  if (!findings.length && !ledger.length) return null;

  const lastKey = monthKey(now);
  const firstKey = lastKey - (WINDOW_MONTHS - 1);
  const buckets = [];
  for (let key = firstKey; key <= lastKey; key++) {
    buckets.push({ key, month: MONTHS[key % 12], raised: 0, decided: 0, closed: 0, winRatePct: 0 });
  }
  const bucketFor = (iso) => {
    const date = iso instanceof Date ? iso : iso ? new Date(iso) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return buckets.find((b) => b.key === monthKey(date)) ?? null;
  };

  for (const f of findings) {
    const b = bucketFor(f.detectedAt);
    if (b) b.raised += 1;
  }

  // Decided per month and the running win rate come from the ledger — it is
  // the record of decisions. Win rate is cumulative over assessed verdicts
  // (worked / not_worked; too_early is still measuring).
  const datedRows = ledger
    .map((row) => ({ row, date: parseLedgerDate(row.date, now) }))
    .filter((x) => x.date);
  for (const { date } of datedRows) {
    const b = bucketFor(date);
    if (b) b.decided += 1;
  }
  for (const b of buckets) {
    const assessed = datedRows.filter(
      (x) => monthKey(x.date) <= b.key && (x.row.verdict === 'worked' || x.row.verdict === 'not_worked'),
    );
    const worked = assessed.filter((x) => x.row.verdict === 'worked').length;
    b.winRatePct = assessed.length ? Math.round((100 * worked) / assessed.length) : null;
  }
  // Months before the first assessed decision have no rate — backfill from the
  // first real value so the line doesn't start at a misleading 0%.
  const firstRate = buckets.find((b) => b.winRatePct !== null)?.winRatePct ?? 0;
  for (const b of buckets) {
    if (b.winRatePct === null) b.winRatePct = firstRate;
    else break;
  }

  // A loop is closed when its exit condition came back — closure KPIs carry that date.
  for (const c of closures) {
    if (c.status !== 'closed') continue;
    const b = bucketFor(c.closedAt);
    if (b) b.closed += 1;
  }

  // Breakdown rows: decisions / worked / impact from the ledger (all time),
  // open-now from the live findings state.
  const OPEN_STATUSES = new Set(['open', 'acting']);
  const breakdownBy = (field) => {
    const rows = new Map();
    const rowFor = (name) => {
      if (!rows.has(name)) rows.set(name, { name, decisions: 0, worked: 0, assessed: 0, openNow: 0, impactSum: 0 });
      return rows.get(name);
    };
    for (const item of ledger) {
      if (!item[field]) continue;
      const r = rowFor(item[field]);
      r.decisions += 1;
      if (item.verdict === 'worked' || item.verdict === 'not_worked') {
        r.assessed += 1;
        if (item.verdict === 'worked') r.worked += 1;
      }
      if (item.measuredImpact?.direction === 'up') r.impactSum += parseImpactAmount(item.measuredImpact.text);
    }
    for (const f of findings) {
      if (!f[field] || !OPEN_STATUSES.has(f.status)) continue;
      rowFor(f[field]).openNow += 1;
    }
    return [...rows.values()]
      .map((r) => ({
        name: r.name,
        decisions: r.decisions,
        workedPct: r.assessed ? Math.round((100 * r.worked) / r.assessed) : 0,
        openNow: r.openNow,
        impact: formatImpact(r.impactSum, currency),
      }))
      .sort((a, b) => b.decisions - a.decisions);
  };
  const byEntity = breakdownBy('entity');
  const byRegion = breakdownBy('region');

  const totals = buckets.reduce(
    (t, b) => ({ raised: t.raised + b.raised, decided: t.decided + b.decided, closed: t.closed + b.closed }),
    { raised: 0, decided: 0, closed: 0 },
  );
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const firstYear = Math.floor(first.key / 12);
  const lastYear = Math.floor(last.key / 12);
  const label =
    firstYear === lastYear
      ? `${first.month}–${last.month} ${lastYear} · derived from the ledger`
      : `${first.month} ${firstYear} – ${last.month} ${lastYear} · derived from the ledger`;
  const summary =
    `${totals.raised} findings raised across ${byEntity.length} entities and ${byRegion.length} regions ` +
    `over the last ${buckets.length} months; ${ledger.length} decisions on the ledger, ` +
    `${totals.closed} loops closed. Decision win rate ${last.winRatePct}% to date.`;

  return {
    label,
    summary,
    months: buckets.map(({ month, raised, decided, closed, winRatePct }) => ({ month, raised, decided, closed, winRatePct })),
    byEntity,
    byRegion,
  };
}
