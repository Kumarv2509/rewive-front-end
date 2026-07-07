import type { DashboardResponse } from '../../api/types';

export function PulseList({ dashboard }: { dashboard?: DashboardResponse }) {
  const data = dashboard?.process_traces_today?.rows;

  return (
    <div className="card">
      <div className="sec-head">
        <h3>Company pulse</h3>
        <span className="all">This week</span>
      </div>
      {(!data || data.length === 0) && <div className="state-msg">No pulse data available.</div>}
      {data?.map((p) => (
        <div className="pulse-line" key={p.id}>
          <span className="pulse-dot" style={{ background: p.dotColor }}></span>
          <span dangerouslySetInnerHTML={{ __html: p.html }} />
        </div>
      ))}
    </div>
  );
}
