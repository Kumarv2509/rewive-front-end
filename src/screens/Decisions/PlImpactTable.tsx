import { Link } from 'react-router-dom';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { usePlImpact } from '../../api/decisions';

// The FP&A view: every P&L line item with the findings raised against it —
// identified → accepted / acting → cleared — and the impact translated into
// the number FP&A actually reports.
export function PlImpactTable() {
  const { data, isLoading, isError } = usePlImpact();

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorMessage message="Couldn't load the P&L impact rollup." />;

  const totals = data.reduce(
    (t, r) => ({
      identified: t.identified + r.identified,
      accepted: t.accepted + r.accepted,
      acting: t.acting + r.acting,
      cleared: t.cleared + r.cleared,
      openNow: t.openNow + r.openNow,
    }),
    { identified: 0, accepted: 0, acting: 0, cleared: 0, openNow: 0 },
  );

  return (
    <>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="t">
          <thead>
            <tr>
              <th>P&amp;L line item</th>
              <th style={{ textAlign: 'right' }}>Identified</th>
              <th style={{ textAlign: 'right' }}>Accepted</th>
              <th style={{ textAlign: 'right' }}>Acting</th>
              <th style={{ textAlign: 'right' }}>Cleared</th>
              <th style={{ textAlign: 'right' }}>Open now</th>
              <th>Translated impact</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr className="row-h" key={r.key}>
                <td>
                  <b>{r.plLine}</b>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{r.topDrivers}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.identified}</td>
                <td style={{ textAlign: 'right', color: 'var(--teal)', fontWeight: 700 }}>{r.accepted}</td>
                <td style={{ textAlign: 'right', color: 'var(--accent-deep)', fontWeight: 700 }}>{r.acting}</td>
                <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 700 }}>{r.cleared}</td>
                <td style={{ textAlign: 'right', color: r.openNow ? 'var(--amber)' : 'var(--ink-3)', fontWeight: 700 }}>{r.openNow}</td>
                <td className={r.translatedImpact.direction === 'up' ? 'up' : r.translatedImpact.direction === 'down' ? 'down' : ''} style={{ fontWeight: 700 }}>
                  {r.translatedImpact.text}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ color: 'var(--ink-2)', fontWeight: 700 }}>All lines</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.identified}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.accepted}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.acting}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.cleared}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{totals.openNow}</td>
              <td style={{ color: 'var(--ink-2)' }}>see stats above</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        Tracked by FP&amp;A. <b style={{ color: 'var(--ink-2)' }}>Identified</b> — findings the agents raised against this line ·{' '}
        <b style={{ color: 'var(--ink-2)' }}>Accepted / Acting</b> — dispositioned by the role each finding was routed to ·{' '}
        <b style={{ color: 'var(--ink-2)' }}>Cleared</b> — exit condition met, the number is back. Impact is measured against the
        same feeds that raised the findings — <Link to="/operate/findings">the open ones are here</Link>.
      </div>
    </>
  );
}
