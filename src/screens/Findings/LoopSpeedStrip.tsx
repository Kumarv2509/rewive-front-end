import { Link } from 'react-router-dom';
import { useLoopSpeed } from '../../api/people';
import { useEffectiveLens } from '../../components/layout/personaLens';
import { Sparkline } from '../../components/shared/Sparkline';

// The loop, over time — is the machinery getting faster? Aggregates the
// loop-speed rows at the current lens into one close-time trend + three
// figures; the per-mandate breakdown stays on Performance. This is the
// verification view the assessor story rests on, not a dashboard: falling
// close time is the agents raising earlier and the owners deciding faster.

function median(values: number[]): number | null {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function LoopSpeedStrip() {
  const { persona, scope } = useEffectiveLens();
  const { data } = useLoopSpeed(persona, scope);
  if (!data || data.length === 0) return null;

  // Index-wise mean of the per-mandate close-time trends (all seeded at the
  // same length; guard with the shortest so a ragged row can't produce NaN).
  const len = Math.min(...data.map((r) => r.trend.length));
  if (!Number.isFinite(len) || len < 2) return null;
  const trend = Array.from({ length: len }, (_, i) =>
    data.reduce((sum, r) => sum + r.trend[i], 0) / data.length,
  );
  const improving = trend[len - 1] < trend[0];
  const worsening = trend[len - 1] > trend[0];
  const trendColor = improving ? 'var(--green)' : worsening ? 'var(--amber)' : 'var(--ink-3)';

  const findings90d = data.reduce((sum, r) => sum + r.findings90d, 0);
  const decideHours = median(data.map((r) => parseFloat(r.medianTimeToDecide)));
  const closeDays = median(data.map((r) => parseFloat(r.medianTimeToClose)));
  const inWindowPct = Math.round(data.reduce((sum, r) => sum + r.closedInWindowPct, 0) / data.length);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="sec-head">
        <h3>The loop, over time</h3>
        <Link className="all" to="/insights/people">By mandate →</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '4px 20px 16px', flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Close-time trend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <Sparkline points={trend} color={trendColor} width={120} height={26} />
            <span style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>
              {improving ? 'getting faster' : worsening ? 'getting slower' : 'holding steady'}
            </span>
          </div>
        </div>
        <div>
          <div className="eyebrow">Findings · 90d</div>
          <div className="ag-fig" style={{ marginTop: 6 }}>{findings90d}</div>
        </div>
        {decideHours != null && (
          <div>
            <div className="eyebrow">Median time to decide</div>
            <div className="ag-fig" style={{ marginTop: 6 }}>{decideHours}h</div>
          </div>
        )}
        {closeDays != null && (
          <div>
            <div className="eyebrow">Median time to close</div>
            <div className="ag-fig" style={{ marginTop: 6 }}>{closeDays} days</div>
          </div>
        )}
        <div>
          <div className="eyebrow">Closed in window</div>
          <div className="ag-fig" style={{ marginTop: 6, color: inWindowPct >= 70 ? 'var(--green)' : inWindowPct >= 50 ? 'var(--amber)' : 'var(--red)' }}>
            {inWindowPct}%
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 220, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Median close time across the mandates in your lens, oldest period to newest — falling means the agents
          are raising earlier and decisions are landing faster.
        </div>
      </div>
    </div>
  );
}
