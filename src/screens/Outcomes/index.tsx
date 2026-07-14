import { useParams } from 'react-router-dom';
import { useOutcomeReport, useExportOutcome, useShareOutcome } from '../../api/outcomes';
import { useToast } from '../../components/shared/Toast';
import { SectionTabs, EXECUTION_TABS } from '../../components/shared/SectionTabs';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { ScoreCards } from './ScoreCards';
import { InsightsList } from './InsightsList';
import { ActionsList } from './ActionsList';

export function OutcomesScreen() {
  const { runId = 'latest' } = useParams();
  const { data, isLoading, isError } = useOutcomeReport(runId);
  const exportReport = useExportOutcome(runId);
  const share = useShareOutcome(runId);
  const { showToast } = useToast();

  if (isLoading) return <section className="screen"><Loading label="Loading outcome report…" /></section>;
  if (isError || !data) return <section className="screen"><ErrorMessage message="Couldn't load this outcome report." /></section>;

  return (
    <section className="screen">
      <SectionTabs tabs={EXECUTION_TABS} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h1 className="page">{data.title}</h1>
          <div className="sub" style={{ marginBottom: 0 }}>
            {data.runMeta} · <span className="pill green">{data.published ? '✓ Published' : 'Draft'}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            className="btn ghost"
            onClick={() => exportReport.mutate('pptx', { onSuccess: () => showToast('Exported board-ready deck — 9 slides') })}
          >
            Export PPT
          </button>
          <button
            className="btn ghost"
            onClick={() => exportReport.mutate('pdf', { onSuccess: () => showToast('PDF exported') })}
          >
            PDF
          </button>
          <button
            className="btn primary"
            onClick={() => share.mutate(undefined, { onSuccess: (res) => showToast(`Share link copied — view-only, expires in ${res.expiresInDays} days`) })}
          >
            Share
          </button>
        </div>
      </div>
      <div style={{ height: 18 }}></div>

      <ScoreCards cards={data.scoreCards} />

      <div className="grid out-cols">
        <InsightsList insights={data.insights} />
        <ActionsList runId={runId} actions={data.actions} />
      </div>
    </section>
  );
}
