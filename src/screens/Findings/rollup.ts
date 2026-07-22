import type { Finding, Persona } from '../../api/types';
import { ROLE_CHILDREN, roleSubtree, dottedReports } from '../CommandCenter/personas';

// A senior role does not inherit its team's queue — it inherits its team's
// exceptions. Everything here turns a subtree of findings into the two things
// a leader can actually act on: who is carrying what (rollup) and what is
// drifting in more than one place at once (themes).

/** Findings split by whose call they are. */
export interface OwnershipSplit {
  /** Addressed to the lens role itself — the four-A disposition is theirs. */
  mine: Finding[];
  /** Owned by someone below them. Visibility, not their call. */
  delegated: Finding[];
  /** Reaching them on the dotted (functional) line — visibility only. */
  dotted: Finding[];
}

export function splitByOwnership(findings: Finding[], persona: Persona): OwnershipSplit {
  const dottedRoles = new Set(dottedReports(persona));
  const mine: Finding[] = [];
  const delegated: Finding[] = [];
  const dotted: Finding[] = [];
  for (const f of findings) {
    if (f.persona === persona) mine.push(f);
    else if (dottedRoles.has(f.persona)) dotted.push(f);
    else delegated.push(f);
  }
  return { mine, delegated, dotted };
}

// ---------- Impact ----------

const MAGNITUDE: Record<string, number> = { k: 1e3, m: 1e6, bn: 1e9, b: 1e9 };

/** Best-effort read of the money named in an impact estimate ("≈ AED 1.8M
 *  revenue at risk this quarter" → 1_800_000). Returns null for the
 *  non-monetary ones ("9 of 14 excursions trace to two vehicles"). Periods
 *  ("/month", "this quarter") are deliberately NOT normalized — we report the
 *  face value that was named, and say so. */
export function parseImpact(estimate: string): { amount: number; currency: string } | null {
  const m = /\b(AED|USD|\$)\s?([\d,.]+)\s?(bn|b|m|k)?\b/i.exec(estimate);
  if (!m) return null;
  const value = Number(m[2].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  const scale = m[3] ? (MAGNITUDE[m[3].toLowerCase()] ?? 1) : 1;
  return { amount: value * scale, currency: m[1] === '$' ? 'USD' : m[1].toUpperCase() };
}

export function formatImpact(amount: number, currency: string): string {
  if (amount >= 1e9) return `${currency} ${(amount / 1e9).toFixed(1)}bn`;
  if (amount >= 1e6) return `${currency} ${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `${currency} ${Math.round(amount / 1e3)}k`;
  return `${currency} ${Math.round(amount)}`;
}

/** Sum of every money figure named across a set of findings. */
export function totalImpact(findings: Finding[]): { label: string; named: number; unnamed: number } {
  let sum = 0;
  let named = 0;
  let unnamed = 0;
  let currency = 'AED';
  for (const f of findings) {
    const parsed = parseImpact(f.impactEstimate);
    if (!parsed) { unnamed += 1; continue; }
    sum += parsed.amount;
    currency = parsed.currency;
    named += 1;
  }
  return { label: named ? formatImpact(sum, currency) : '—', named, unnamed };
}

// ---------- Rollup by direct report ----------

const SLA_AT_RISK_HOURS = 8;

export interface ReportRollup {
  /** The direct report this branch hangs off. */
  role: Persona;
  /** Every role in that branch, including the report itself. */
  roles: Persona[];
  open: number;
  /** Open findings whose SLA has already lapsed — these escalate upward. */
  breached: number;
  /** Open findings inside the escalation warning window. */
  atRisk: number;
  /** Hours on the tightest clock in the branch (null when nothing is open). */
  tightestSla: number | null;
  /** Open findings at critical or high severity. */
  severe: number;
  watching: number;
  closed: number;
  impact: { label: string; named: number; unnamed: number };
}

/** One row per direct report — five rows instead of forty. Branches with
 *  nothing in them are dropped; the busiest branch sorts first. */
export function rollupByReport(findings: Finding[], persona: Persona): ReportRollup[] {
  const rows: ReportRollup[] = [];
  for (const child of ROLE_CHILDREN[persona] ?? []) {
    const roles = roleSubtree(child);
    const inBranch = findings.filter((f) => roles.includes(f.persona));
    if (inBranch.length === 0) continue;
    const open = inBranch.filter((f) => f.status === 'open');
    const slas = open.map((f) => f.slaHoursRemaining);
    rows.push({
      role: child,
      roles,
      open: open.length,
      breached: open.filter((f) => f.slaHoursRemaining <= 0).length,
      atRisk: open.filter((f) => f.slaHoursRemaining > 0 && f.slaHoursRemaining <= SLA_AT_RISK_HOURS).length,
      tightestSla: slas.length ? Math.min(...slas) : null,
      severe: open.filter((f) => f.severity === 'critical' || f.severity === 'high').length,
      watching: inBranch.filter((f) => f.status === 'acting' || f.status === 'acknowledged' || f.status === 'accepted').length,
      closed: inBranch.filter((f) => f.status === 'closed' || f.status === 'abandoned').length,
      impact: totalImpact(inBranch),
    });
  }
  // Breached first, then the tightest clock, then volume.
  return rows.sort(
    (a, b) =>
      b.breached - a.breached ||
      (a.tightestSla ?? Infinity) - (b.tightestSla ?? Infinity) ||
      b.open - a.open,
  );
}

// ---------- Themes ----------

export interface Theme {
  key: string;
  /** The mandate that drifted (falls back to the stream when unnamed). */
  name: string;
  /** The P&L line it feeds, when the impact path names one. */
  plLine: string | null;
  /** Which direct-report branches it showed up under. */
  branches: Persona[];
  findings: Finding[];
  impact: { label: string; named: number; unnamed: number };
}

/** The same mandate drifting under two or more branches at once IS the
 *  leadership-level finding; the individual instances are not. Themes are
 *  computed over open work only — a pattern that is already being worked
 *  everywhere is not news. */
export function detectThemes(findings: Finding[], persona: Persona): Theme[] {
  const children = ROLE_CHILDREN[persona] ?? [];
  const branchOf = new Map<Persona, Persona>();
  for (const child of children) for (const role of roleSubtree(child)) branchOf.set(role, child);

  const groups = new Map<string, { name: string; plLine: string | null; findings: Finding[]; branches: Set<Persona> }>();
  for (const f of findings) {
    if (f.status !== 'open') continue;
    const branch = branchOf.get(f.persona);
    if (!branch) continue;
    const mandate = f.impactPath.find((s) => s.kind === 'stream_kpi') ?? f.impactPath[0];
    const key = mandate?.nodeId ?? `stream:${f.streamKey}`;
    let g = groups.get(key);
    if (!g) {
      g = { name: mandate?.nodeName ?? f.streamKey ?? 'General', plLine: null, findings: [], branches: new Set() };
      groups.set(key, g);
    }
    g.plLine = g.plLine ?? f.impactPath.find((s) => s.kind === 'pl_line')?.nodeName ?? null;
    g.findings.push(f);
    g.branches.add(branch);
  }

  return [...groups.entries()]
    .filter(([, g]) => g.branches.size >= 2)
    .map(([key, g]) => ({
      key,
      name: g.name,
      plLine: g.plLine,
      branches: [...g.branches],
      findings: g.findings,
      impact: totalImpact(g.findings),
    }))
    .sort((a, b) => b.branches.length - a.branches.length || b.findings.length - a.findings.length);
}
