import { useRef, useState } from 'react';
import { Intro } from '../../components/shared/Intro';
import { Pill } from '../../components/shared/Pill';
import { SectionTabs, FOUNDATION_TABS } from '../../components/shared/SectionTabs';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useToast } from '../../components/shared/Toast';
import { useAnalysisRequests, useDatasets, useQueueAnalysis, useRegisterDataset } from '../../api/datasets';
import type { Dataset, DatasetStatus } from '../../api/types';

const statusTone: Record<DatasetStatus, 'green' | 'amber' | 'gray'> = {
  live: 'green',
  receiving: 'amber',
  expected: 'gray',
};

const statusLabel: Record<DatasetStatus, string> = {
  live: 'live',
  receiving: 'receiving',
  expected: 'expected',
};

function relTime(iso: string | null): string {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Minimal CSV profiling — enough to register the shape (headers + row count).
// Real parsing/analysis belongs to the pipeline this screen is a placeholder for.
function profileCsv(text: string): { rows: number; columns: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const columns = (lines[0] ?? '').split(',').map((c) => c.trim().replace(/^"|"$/g, '')).filter(Boolean);
  return { rows: Math.max(0, lines.length - 1), columns };
}

export function DatasetsScreen() {
  const { data: datasets, isLoading, isError } = useDatasets();
  const { data: requests } = useAnalysisRequests();
  const register = useRegisterDataset();
  const queueAnalysis = useQueueAnalysis();
  const { showToast } = useToast();

  const fileRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState('');
  const [forDataset, setForDataset] = useState<string>('');

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const { rows, columns } = profileCsv(await file.text());
    register.mutate(
      { name: file.name.replace(/\.csv$/i, ''), rows, columns },
      { onSuccess: (d) => showToast(`Staged "${d.name}" — ${d.rows} rows, ${d.columns.length} columns`) },
    );
    if (fileRef.current) fileRef.current.value = '';
  };

  const submitQuestion = () => {
    if (!question.trim()) return;
    queueAnalysis.mutate(
      { datasetId: forDataset || null, question: question.trim() },
      {
        onSuccess: () => {
          showToast('Analysis queued — it runs when the data lands');
          setQuestion('');
        },
      },
    );
  };

  return (
    <section className="screen">
      <SectionTabs tabs={FOUNDATION_TABS} />
      <h1 className="page">Datasets</h1>
      <Intro
        line="The data the loop will run on — declared before it arrives, so every mandate already knows its source."
        more={
          <>
            Each entry is a slot for a feed: <b>expected</b> ones are placeholders awaiting their first load,
            <b> receiving</b> ones were staged by hand, <b>live</b> ones refresh on the connector cadence. When the
            pipeline lands, every load is profiled, reconciled against the Operating Picture, and anything off-mandate
            becomes a finding — the same loop, fed by real data. Queue the analyses you want below; they run when the
            data does.
          </>
        }
      />

      {isLoading && <Loading />}
      {isError && <ErrorMessage />}

      {datasets && (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
          <table className="t">
            <thead>
              <tr>
                <th>Dataset</th><th>Source</th><th>Cadence</th><th>Status</th><th>Last load</th><th>Rows</th><th>Feeds</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d: Dataset) => (
                <tr key={d.id}>
                  <td style={{ maxWidth: 320 }}>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{d.description}</div>
                    {d.columns.length > 0 && (
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>
                        {d.columns.slice(0, 6).join(' · ')}{d.columns.length > 6 ? ' · …' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 12 }}>{d.source}</td>
                  <td style={{ fontSize: 12 }}>{d.cadence}</td>
                  <td><Pill tone={statusTone[d.status]}>{statusLabel[d.status]}</Pill></td>
                  <td style={{ fontSize: 12 }}>{relTime(d.lastLoadAt)}</td>
                  <td style={{ fontSize: 12 }} className="mono">{d.rows === null ? '—' : d.rows.toLocaleString()}</td>
                  <td style={{ fontSize: 11.5, color: 'var(--ink-2)', maxWidth: 200 }}>{d.feeds.join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="sec-head" style={{ padding: '0 0 6px' }}><h3>Stage data now</h3></div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 12 }}>
            Have an extract already? Drop a CSV — it's profiled on the spot (rows + columns) and registered as a
            receiving dataset, ahead of the pipeline.
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button className="btn primary sm" disabled={register.isPending} onClick={() => fileRef.current?.click()}>
            {register.isPending ? 'Staging…' : 'Choose a CSV'}
          </button>
        </div>

        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="sec-head" style={{ padding: '0 0 6px' }}><h3>Queue an analysis</h3></div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 12 }}>
            Ask anything of the data to come — requests queue against their dataset and run the moment it lands.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select
              value={forDataset}
              onChange={(e) => setForDataset(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
            >
              <option value="">Any dataset</option>
              {datasets?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <textarea
              rows={2}
              placeholder="e.g. Which banners drive the OSA gap on promo weeks?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div>
              <button className="btn primary sm" disabled={queueAnalysis.isPending || !question.trim()} onClick={submitQuestion}>
                Queue it
              </button>
            </div>
          </div>
          {requests && requests.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Queued</div>
              {requests.map((r) => (
                <div key={r.id} style={{ fontSize: 12, padding: '4px 0', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <Pill tone="amber">queued</Pill>
                  <span style={{ color: 'var(--ink)' }}>{r.question}</span>
                  <span style={{ color: 'var(--ink-3)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {r.datasetName ?? 'any dataset'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
