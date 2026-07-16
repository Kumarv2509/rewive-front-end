import { Link } from 'react-router-dom';
import { useBusinessContext } from '../../api/business';
import { Intro } from '../../components/shared/Intro';
import { Pill } from '../../components/shared/Pill';
import { BusinessTabs } from './BusinessTabs';
import type { BaseDataHealth } from '../../api/types';

const healthTone: Record<BaseDataHealth, 'green' | 'amber' | 'red'> = { ok: 'green', watch: 'amber', drifting: 'red' };
const healthLabel: Record<BaseDataHealth, string> = { ok: 'on plan', watch: 'watch', drifting: 'drifting' };

const growthColor = (pct: number) => (pct >= 5 ? 'var(--green)' : pct >= 0 ? 'var(--ink-2)' : 'var(--red)');

export function CustomerSalesScreen() {
  const { data, isLoading, isError } = useBusinessContext();

  if (isLoading) return <section className="screen"><div className="state-msg">Loading customers…</div></section>;
  if (isError || !data) return <section className="screen"><div className="state-msg">Could not load customer data.</div></section>;

  const showTradeSpend = data.customers.some((c) => c.tradeSpendPct > 0);
  return (
    <section className="screen">
      <h1 className="page">Sales by {data.customerDimension.toLowerCase() === 'customer' ? 'customer' : data.customerDimension}</h1>
      <Intro
        line={`Revenue, terms and service level per ${data.customerDimension} — where the commercial drift shows up first.`}
        more={<>Trade spend, on-shelf availability and receivable days are the three numbers that quietly decide account profitability. Rows where a counterpart has raised drift link to the finding's thread.</>}
      />
      <BusinessTabs />

      <div className="card">
        <table className="t">
          <thead>
            <tr>
              <th>{data.customerDimension}</th>
              <th>Channel</th>
              <th>Region</th>
              <th>Revenue YTD</th>
              <th>Growth YoY</th>
              {showTradeSpend && <th>Trade spend</th>}
              <th>OSA</th>
              <th>DSO</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.customers.map((c) => (
              <tr key={c.id} className="row-h">
                <td>
                  <div style={{ fontWeight: 600 }}>{c.customer}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{c.note}</div>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>{c.channel}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{c.region}</td>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{c.revenueYtd}</td>
                <td style={{ color: growthColor(c.growthYoyPct), whiteSpace: 'nowrap' }}>{c.growthYoyPct > 0 ? '+' : ''}{c.growthYoyPct.toFixed(1)}%</td>
                {showTradeSpend && <td>{c.tradeSpendPct > 0 ? `${c.tradeSpendPct.toFixed(1)}%` : '—'}</td>}
                <td style={{ color: c.osaPct < 90 ? 'var(--red)' : c.osaPct < 94 ? 'var(--amber)' : 'var(--ink-2)' }}>{c.osaPct}%</td>
                <td style={{ color: c.dsoDays > 60 ? 'var(--red)' : c.dsoDays > 50 ? 'var(--amber)' : 'var(--ink-2)', whiteSpace: 'nowrap' }}>{c.dsoDays}d</td>
                <td><Pill tone={healthTone[c.health]}>{healthLabel[c.health]}</Pill></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {c.findingId && (
                    <Link to={`/operate/findings/${c.findingId}`} style={{ fontSize: 12, color: 'var(--accent-deep)', textDecoration: 'none', fontWeight: 600 }}>
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
        OSA = on-shelf availability from store audits; DSO = days sales outstanding vs contracted terms.
      </div>
    </section>
  );
}
