import { useDecisionStats } from '../../api/decisions';
import type { HalfYearBreakdownRow, HalfYearMonth, Persona, RoleScope } from '../../api/types';

// Series colors come from the theme tokens (accent / teal / green) so they stay
// legible on the light card surface. Applied via style objects — var() is not
// valid inside SVG presentation attributes.
const SERIES = [
  { key: 'raised', label: 'Raised', color: 'var(--accent)' },
  { key: 'decided', label: 'Decided', color: 'var(--teal)' },
  { key: 'closed', label: 'Closed', color: 'var(--green)' },
] as const;

const WIN_COLOR = 'var(--amber)';

function MonthlyLoopBars({ months }: { months: HalfYearMonth[] }) {
  const W = 360;
  const H = 150;
  const padB = 22;
  const padT = 10;
  const max = Math.max(1, ...months.map((m) => Math.max(m.raised, m.decided, m.closed)));
  const group = W / months.length;
  const barW = 10;
  const gap = 2;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);

  return (
    <svg width={W} height={H} role="img" aria-label="Findings raised, decided and closed per month">
      {[0.5, 1].map((f) => (
        <line key={f} x1={0} x2={W} y1={y(max * f)} y2={y(max * f)} style={{ stroke: 'var(--border)' }} />
      ))}
      {months.map((m, i) => {
        const cx = i * group + group / 2;
        const values = [m.raised, m.decided, m.closed];
        const x0 = cx - (barW * 3 + gap * 2) / 2;
        return (
          <g key={m.month}>
            {values.map((v, s) => (
              <rect
                key={SERIES[s].key}
                x={x0 + s * (barW + gap)}
                y={y(v)}
                width={barW}
                height={H - padB - y(v)}
                rx={3}
                style={{ fill: SERIES[s].color }}
              >
                <title>{`${m.month} — ${SERIES[s].label.toLowerCase()}: ${v}`}</title>
              </rect>
            ))}
            <text x={cx} y={H - 6} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
              {m.month}
            </text>
          </g>
        );
      })}
      <line x1={0} x2={W} y1={H - padB} y2={H - padB} style={{ stroke: 'var(--border-strong)' }} />
    </svg>
  );
}

function WinRateLine({ months }: { months: HalfYearMonth[] }) {
  const W = 240;
  const H = 150;
  const padB = 22;
  const padT = 14;
  // Scale to the data so derived rates near 0% or 100% don't clip the plot.
  const lo = Math.min(40, ...months.map((m) => m.winRatePct - 5));
  const hi = Math.max(90, ...months.map((m) => m.winRatePct + 5));
  const x = (i: number) => (W / months.length) * i + W / months.length / 2;
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v - lo) / (hi - lo));
  const coords = months.map((m, i) => `${x(i)},${y(m.winRatePct)}`).join(' ');
  const last = months[months.length - 1];

  return (
    <svg width={W} height={H} role="img" aria-label="Decision win rate per month">
      {[50, 70].map((v) => (
        <g key={v}>
          <line x1={0} x2={W} y1={y(v)} y2={y(v)} style={{ stroke: 'var(--border)' }} />
          <text x={2} y={y(v) - 3} fontSize={9.5} fill="var(--ink-3)">{v}%</text>
        </g>
      ))}
      <polyline points={coords} fill="none" style={{ stroke: WIN_COLOR }} strokeWidth={2} />
      {months.map((m, i) => (
        <circle key={m.month} cx={x(i)} cy={y(m.winRatePct)} r={4} style={{ fill: WIN_COLOR, stroke: 'var(--surface-solid)' }} strokeWidth={2}>
          <title>{`${m.month} — win rate ${m.winRatePct}%`}</title>
        </circle>
      ))}
      <text x={x(months.length - 1)} y={y(last.winRatePct) - 9} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ink)">
        {last.winRatePct}%
      </text>
      {months.map((m, i) => (
        <text key={m.month} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10.5} fill="var(--ink-3)">
          {m.month}
        </text>
      ))}
      <line x1={0} x2={W} y1={H - padB} y2={H - padB} style={{ stroke: 'var(--border-strong)' }} />
    </svg>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: HalfYearBreakdownRow[] }) {
  return (
    <div className="card" style={{ overflow: 'hidden', flex: 1, minWidth: 280 }}>
      <table className="t">
        <thead>
          <tr>
            <th>{title}</th><th>Decisions</th><th>Worked</th><th>Open now</th><th>Measured impact</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td>{r.decisions}</td>
              <td>{r.workedPct}%</td>
              <td>{r.openNow}</td>
              <td className="up" style={{ fontWeight: 700 }}>{r.impact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// The half-year review: how the loop ran over the last six months, and where —
// by month, by business entity, and by region.
export function HalfYearReview({ persona, scope }: { persona: Persona | 'all'; scope?: RoleScope }) {
  const { data } = useDecisionStats(persona, scope);
  const hy = data?.halfYear;
  if (!hy) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="card" style={{ padding: '16px 20px', marginBottom: 14 }}>
        <div className="sec-head" style={{ padding: '0 0 4px' }}>
          <h3>{hy.label}</h3>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 14 }}>{hy.summary}</div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ display: 'flex', gap: 14, marginBottom: 8 }}>
              {SERIES.map((s) => (
                <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--ink-2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                  {s.label}
                </span>
              ))}
            </div>
            <MonthlyLoopBars months={hy.months} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: WIN_COLOR, display: 'inline-block', marginRight: 5 }} />
              Decision win rate
            </div>
            <WinRateLine months={hy.months} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <BreakdownTable title="By entity" rows={hy.byEntity} />
        <BreakdownTable title="By region" rows={hy.byRegion} />
      </div>
    </div>
  );
}
