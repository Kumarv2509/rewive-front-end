import { Link } from 'react-router-dom';
import { useBusinessContext } from '../../api/business';
import { Intro } from '../../components/shared/Intro';
import { Pill } from '../../components/shared/Pill';
import { BusinessTabs } from './BusinessTabs';
import type { BaseDataHealth } from '../../api/types';

const healthTone: Record<BaseDataHealth, 'green' | 'amber' | 'red'> = { ok: 'green', watch: 'amber', drifting: 'red' };
const healthLabel: Record<BaseDataHealth, string> = { ok: 'on plan', watch: 'watch', drifting: 'drifting' };

const growthColor = (pct: number) => (pct >= 5 ? 'var(--green)' : pct >= 0 ? 'var(--ink-2)' : 'var(--red)');

export function SkuSalesScreen() {
  const { data, isLoading, isError } = useBusinessContext();

  if (isLoading) return <section className="screen"><div className="state-msg">Loading sales…</div></section>;
  if (isError || !data) return <section className="screen"><div className="state-msg">Could not load sales data.</div></section>;

  const drifting = data.skus.filter((s) => s.health !== 'ok').length;
  return (
    <section className="screen">
      <h1 className="page">Sales by {data.skuDimension}</h1>
      <Intro
        line={`Year-to-date sales, margin and service level per ${data.skuDimension} — the base data the mandates watch.`}
        more={<>Each row is a number someone owns and a counterpart watches. {drifting} of {data.skus.length} rows are off plan right now — where a counterpart has already raised the drift, the row links to the finding's thread, and that thread is where the call gets made.</>}
      />
      <BusinessTabs />

      <div className="card">
        <table className="t">
          <thead>
            <tr>
              <th>{data.skuDimension}</th>
              <th>Division</th>
              <th>Revenue YTD</th>
              <th>Growth YoY</th>
              <th>Gross margin</th>
              <th>Fill rate</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.skus.map((s) => (
              <tr key={s.id} className="row-h">
                <td>
                  <div style={{ fontWeight: 600 }}>{s.family}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{s.note}</div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{s.division}</td>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{s.revenueYtd}</td>
                <td style={{ color: growthColor(s.growthYoyPct), whiteSpace: 'nowrap' }}>{s.growthYoyPct > 0 ? '+' : ''}{s.growthYoyPct.toFixed(1)}%</td>
                <td>{s.grossMarginPct.toFixed(1)}%</td>
                <td style={{ color: s.fillRatePct < 90 ? 'var(--red)' : s.fillRatePct < 95 ? 'var(--amber)' : 'var(--ink-2)' }}>{s.fillRatePct}%</td>
                <td><Pill tone={healthTone[s.health]}>{healthLabel[s.health]}</Pill></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {s.findingId && (
                    <Link to={`/operate/findings/${s.findingId}`} style={{ fontSize: 12, color: 'var(--accent-deep)', textDecoration: 'none', fontWeight: 600 }}>
                      finding →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        “Drifting” means the counterpart watching this number has raised a finding — the link opens its thread, where the four-A call is made.
      </div>
    </section>
  );
}
