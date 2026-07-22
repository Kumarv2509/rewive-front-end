import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSuggestedSignals, useSignalDetail, useRequestUnmask, useRequestSimilarAccess } from '../../api/signalStudio';
import { useCreateSolutionDesign } from '../../api/solutionDesign';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useToast } from '../../components/shared/Toast';
import { QuickSolutionPanel } from './QuickSolutionPanel';
import type { SignalCategory, Verdict } from '../../api/types';

const categoryTone: Record<SignalCategory, 'red' | 'amber' | 'indigo' | 'teal' | 'gray'> = {
  derailer: 'red',
  laggard: 'amber',
  cost_drainer: 'indigo',
  revenue_leakage: 'teal',
  other: 'gray',
};

const verdictTone: Record<Verdict, 'green' | 'red' | 'amber'> = {
  worked: 'green',
  not_worked: 'red',
  too_early: 'amber',
};

const trendLabel = { down: ['trending worse', 'red'], up: ['improving', 'green'], flat: ['steady', 'gray'] } as const;
const confidenceTone = { high: 'green', medium: 'amber', low: 'gray' } as const;

export function SignalDetailScreen() {
  const { signalId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: signals, isLoading: signalsLoading } = useSuggestedSignals();
  const { data: detail, isLoading: detailLoading, isError } = useSignalDetail(signalId);
  const createSolution = useCreateSolutionDesign();
  const requestUnmask = useRequestUnmask(signalId ?? '');
  const requestAccess = useRequestSimilarAccess(signalId ?? '');

  if (signalsLoading || detailLoading) return <section className="screen"><Loading /></section>;
  const signal = signals?.find((s) => s.id === signalId);
  if (isError || !detail || !signal) {
    return <section className="screen"><ErrorMessage message="No detail available for this signal yet." /></section>;
  }

  const [trendText, trendColor] = trendLabel[detail.prognosis.trend];

  return (
    <section className="screen">
      <Link to="/operate/findings" className="btn ghost sm" style={{ marginBottom: 14, display: 'inline-flex' }}>&larr; Findings</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Pill tone={categoryTone[signal.category]}>{signal.category.replace('_', ' ')}</Pill>
        <h1 className="page" style={{ marginBottom: 0 }}>{signal.name}</h1>
      </div>
      <div className="sub">{signal.description}</div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', marginBottom: 16 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 8 }}>Why this was surfaced</div>
          <div style={{ fontSize: 13 }}>{detail.whySurfaced}</div>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 8 }}>Likely impact</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{detail.prognosis.impactRange}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-2)', marginBottom: 6 }}>projected over {detail.prognosis.timeframe}</div>
          <Pill tone={confidenceTone[detail.prognosis.confidence]}>{detail.prognosis.confidence} confidence</Pill>{' '}
          <Pill tone={trendColor}>{trendText}</Pill>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Underlying data</div>
          {detail.piiMasked && <Pill tone="gray">PII masked by default</Pill>}
        </div>
        <table className="t">
          <thead><tr><th>Date</th><th>Record</th><th>Approved by</th><th>Variance</th></tr></thead>
          <tbody>
            {detail.datasetRows.map((row, i) => (
              <tr key={i} className="row-h">
                <td>{row.date}</td>
                <td>{row.label}</td>
                <td style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--ink-3)' }}>{row.maskedField}</td>
                <td>{row.variance}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {detail.piiMasked && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', flex: 1 }}>
              Names and IDs are masked for every viewer by default. Unmasking requires a documented reason and is itself logged.
            </div>
            {detail.piiUnmaskRequested ? (
              <Pill tone="amber">unmask requested</Pill>
            ) : (
              <button className="btn ghost sm" disabled={requestUnmask.isPending} onClick={() => requestUnmask.mutate(undefined, { onSuccess: () => showToast('Unmask request logged') })}>
                Request to unmask
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Similar signals, other stores and other domains</div>
        {detail.similarSignals.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>No similar signals found elsewhere yet.</div>}
        {detail.similarSignals.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            {s.scope === 'restricted' ? <Pill tone="gray">restricted</Pill> : <Pill tone="green">visible, same group</Pill>}
            <div style={{ flex: 1, fontSize: 12.5 }}>{s.label}</div>
            {s.priorSolution && (
              <>
                <Pill tone={verdictTone[s.priorSolution.verdict]}>{s.priorSolution.verdict.replace('_', ' ')}</Pill>
                <div style={{ fontSize: 11.5, color: 'var(--ink-2)', textAlign: 'right' }}>
                  cost {s.priorSolution.cost}<br />value {s.priorSolution.valueGenerated}
                </div>
              </>
            )}
            {s.scope === 'restricted' && (
              s.accessRequested ? (
                <Pill tone="amber">access requested</Pill>
              ) : (
                <button className="btn ghost sm" disabled={requestAccess.isPending} onClick={() => requestAccess.mutate(s.id, { onSuccess: () => showToast('Access requested') })}>
                  Request access
                </button>
              )
            )}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <button
          className="btn primary"
          disabled={createSolution.isPending}
          onClick={() =>
            createSolution.mutate(signal.id, {
              onSuccess: (solution) => {
                showToast('Solution design started');
                navigate(`/build/solutions/${solution.id}`);
              },
            })
          }
        >
          Solution design
        </button>
      </div>
      <QuickSolutionPanel signalId={signal.id} />
    </section>
  );
}
