import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { usePlStatement } from '../../api/decisions';
import { personaLabel } from '../CommandCenter/personas';
import { severityTone } from '../Findings/meta';
import type { PlAnomalyStatus, PlStatementLine } from '../../api/types';

// Drift is judged against two bases: budget (the promise) and forecast (the
// latest expectation). Colors flip for cost lines.
function VarCell({ pct, isCost }: { pct: number; isCost: boolean }) {
  const bad = isCost ? pct > 0 : pct < 0;
  const color = Math.abs(pct) < 1 ? 'var(--ink-3)' : bad ? 'var(--red)' : 'var(--green)';
  return (
    <td style={{ textAlign: 'right', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </td>
  );
}

function Num({ v }: { v: string }) {
  return <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</td>;
}

const statusMeta: Record<PlAnomalyStatus, { tone: 'red' | 'amber' | 'green' | 'gray'; label: string }> = {
  raised: { tone: 'red', label: 'raised · awaiting disposition' },
  watching: { tone: 'amber', label: 'watching · exit condition / trip-wire' },
  cleared: { tone: 'green', label: 'cleared · number is back' },
  new: { tone: 'gray', label: 'new · queued for agent review' },
};

// The full P&L with Budget and Forecast as the base of drift, drillable by
// the industry's two dimensions — plus every drift anomaly as a task that
// points back to its P&L cell and into its finding thread.
export function PlStatement() {
  const { data, isLoading, isError } = usePlStatement();
  const [dim, setDim] = useState<'a' | 'b'>('a');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorMessage message="Couldn't load the P&L statement." />;

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const breakdownFor = (line: PlStatementLine) => (dim === 'a' ? line.byDimA : line.byDimB) ?? (dim === 'a' ? line.byDimB : line.byDimA);
  const anomalyById = new Map(data.anomalies.map((a) => [a.id, a]));

  return (
    <>
      {/* ---------- the statement ---------- */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
          <b style={{ color: 'var(--ink)' }}>{data.period}</b> · all figures {data.unit} · drift measured vs budget and vs forecast
        </div>
        <div className="filters" style={{ marginBottom: 0 }}>
          <button className={`fchip${dim === 'a' ? ' on' : ''}`} onClick={() => setDim('a')}>By {data.dimALabel}</button>
          <button className={`fchip${dim === 'b' ? ' on' : ''}`} onClick={() => setDim('b')}>By {data.dimBLabel}</button>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <table className="t">
          <thead>
            <tr>
              <th>P&amp;L line</th>
              <th style={{ textAlign: 'right' }}>Actual</th>
              <th style={{ textAlign: 'right' }}>Budget</th>
              <th style={{ textAlign: 'right' }}>Forecast</th>
              <th style={{ textAlign: 'right' }}>vs Budget</th>
              <th style={{ textAlign: 'right' }}>vs Forecast</th>
              <th>Drift anomalies</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((line) => {
              const breakdown = breakdownFor(line);
              const isOpen = expanded.has(line.key);
              const sub = line.kind === 'subtotal';
              return (
                <FragmentRow key={line.key}>
                  <tr
                    id={`pl-line-${line.key}`}
                    className={breakdown?.length ? 'row-h' : undefined}
                    style={{
                      cursor: breakdown?.length ? 'pointer' : undefined,
                      background: sub ? 'var(--glass)' : undefined,
                      scrollMarginTop: 80,
                    }}
                    onClick={breakdown?.length ? () => toggle(line.key) : undefined}
                  >
                    <td style={{ fontWeight: sub ? 800 : 650 }}>
                      {breakdown?.length ? <span style={{ color: 'var(--ink-3)', marginRight: 7 }}>{isOpen ? '▾' : '▸'}</span> : <span style={{ marginRight: 18 }} />}
                      {line.label}
                    </td>
                    <Num v={line.actual} />
                    <Num v={line.budget} />
                    <Num v={line.forecast} />
                    <VarCell pct={line.varBudgetPct} isCost={line.isCost} />
                    <VarCell pct={line.varForecastPct} isCost={line.isCost} />
                    <td>
                      {line.anomalyIds.length > 0 && (
                        <Pill tone="amber">{line.anomalyIds.length} open</Pill>
                      )}
                    </td>
                  </tr>
                  {isOpen && breakdown?.map((row) => (
                    <tr key={row.key} style={{ background: 'rgba(26,26,46,.02)' }}>
                      <td style={{ paddingLeft: 42, color: 'var(--ink-2)' }}>{row.label}</td>
                      <Num v={row.actual} />
                      <Num v={row.budget} />
                      <Num v={row.forecast} />
                      <VarCell pct={row.varBudgetPct} isCost={line.isCost} />
                      <VarCell pct={row.varForecastPct} isCost={line.isCost} />
                      <td>
                        {row.anomalyIds.map((id) => {
                          const a = anomalyById.get(id);
                          return a ? <Pill key={id} tone={severityTone[a.severity]}>{a.severity}</Pill> : null;
                        })}
                      </td>
                    </tr>
                  ))}
                </FragmentRow>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------- the drift anomalies, as a task list ---------- */}
      <div className="sec-head" style={{ padding: '0 0 12px' }}>
        <h3>Drift anomalies — the task list</h3>
        <Pill tone="amber">{data.anomalies.filter((a) => a.status !== 'cleared').length} open</Pill>
      </div>
      <div className="card" style={{ marginBottom: 8 }}>
        {data.anomalies.map((a) => (
          <div className="dec-item" key={a.id}>
            <div className="dec-ico" style={{ background: 'var(--amber-soft)' }}>📉</div>
            <div style={{ minWidth: 0 }}>
              <div className="t1">
                {a.findingId ? <Link to={`/operate/findings/${a.findingId}`}>{a.title}</Link> : a.title}{' '}
                <Pill tone={severityTone[a.severity]}>{a.severity}</Pill>
                {' '}<Pill tone="gray">→ {personaLabel(a.routedTo)}</Pill>
              </div>
              <div className="t2">
                <a href={`#pl-line-${a.plLineKey}`} style={{ color: 'var(--accent-deep)', textDecoration: 'none' }}>
                  {a.plLineLabel}{a.dimA ? ` · ${a.dimA}` : ''}{a.dimB ? ` · ${a.dimB}` : ''} ↑
                </a>
                {' '}· {a.driftVsBudgetPct > 0 ? '+' : ''}{a.driftVsBudgetPct.toFixed(1)}% vs budget
                {' '}· {a.driftVsForecastPct > 0 ? '+' : ''}{a.driftVsForecastPct.toFixed(1)}% vs forecast
                {' '}· {a.impact}
              </div>
            </div>
            <div className="acts" style={{ alignItems: 'center' }}>
              <Pill tone={statusMeta[a.status].tone}>{statusMeta[a.status].label}</Pill>
              {a.findingId && <Link className="btn ghost sm" to={`/operate/findings/${a.findingId}`}>Thread →</Link>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 24, fontSize: 12, color: 'var(--ink-3)' }}>
        Budget is the promise, forecast is the latest expectation — drift is measured against both. Anomalies an agent
        has raised link to their finding thread; <b style={{ color: 'var(--ink-2)' }}>new</b> ones are queued for the
        agent watching that mandate.
      </div>
    </>
  );
}

// Table rows can't be wrapped in a div; a keyed fragment keeps the map tidy.
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
