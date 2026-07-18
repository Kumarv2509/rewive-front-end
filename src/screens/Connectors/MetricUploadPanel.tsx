import { useMemo, useState } from 'react';
import { useKpiBrain } from '../../api/shadowOrg';
import { useImportMetricRows } from '../../api/tracking';
import { useToast } from '../../components/shared/Toast';
import type { MetricImportResult } from '../../api/types';

interface ParsedRow { nodeId: string; ts: string; value: number; valid: boolean; reason?: string }

const pickColumn = (keys: string[], ...candidates: string[]) =>
  keys.find((k) => candidates.includes(k.trim().toLowerCase()));

export function MetricUploadPanel() {
  const { data: brain } = useKpiBrain();
  const importRows = useImportMetricRows();
  const { showToast } = useToast();
  const [filename, setFilename] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<MetricImportResult | null>(null);

  const nodeIds = useMemo(() => new Set((brain?.nodes ?? []).map((n) => n.id)), [brain]);

  const handleFile = async (file: File) => {
    setResult(null);
    setFilename(file.name);
    // SheetJS is heavy — load it only when someone actually uploads a file.
    const { read, utils } = await import('xlsx');
    const workbook = read(await file.arrayBuffer());
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });
    if (!raw.length) { setRows([]); return; }
    const keys = Object.keys(raw[0]);
    const nodeCol = pickColumn(keys, 'nodeid', 'node_id', 'mandate', 'kpi');
    const tsCol = pickColumn(keys, 'ts', 'date', 'timestamp');
    const valueCol = pickColumn(keys, 'value', 'actual', 'reading');
    const parsed = raw.map((r): ParsedRow => {
      const nodeId = String(nodeCol ? r[nodeCol] ?? '' : '').trim();
      const value = Number(valueCol ? r[valueCol] : NaN);
      const tsRaw = tsCol ? String(r[tsCol] ?? '') : '';
      const ts = tsRaw ? new Date(tsRaw) : new Date();
      if (!nodeId || !nodeIds.has(nodeId)) return { nodeId, ts: '', value, valid: false, reason: `unknown mandate id "${nodeId || '—'}"` };
      if (!Number.isFinite(value)) return { nodeId, ts: '', value, valid: false, reason: 'value is not a number' };
      if (Number.isNaN(ts.getTime())) return { nodeId, ts: '', value, valid: false, reason: `bad date "${tsRaw}"` };
      return { nodeId, ts: ts.toISOString(), value, valid: true };
    });
    setRows(parsed);
  };

  const validRows = rows.filter((r) => r.valid);

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Upload metric history (CSV / XLSX)</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 12 }}>
        Columns: <code>nodeId</code> (mandate id), <code>date</code>, <code>value</code>. Parsed in your browser, posted in chunks.
      </div>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
      />

      {rows.length > 0 && (
        <>
          <div style={{ fontSize: 12.5, margin: '12px 0 6px' }}>
            {validRows.length} of {rows.length} rows valid{rows.length > validRows.length ? ` — first issue: ${rows.find((r) => !r.valid)?.reason}` : ''}
          </div>
          <table className="table" style={{ fontSize: 12.5 }}>
            <thead><tr><th>Mandate</th><th>Date</th><th>Value</th><th /></tr></thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i} style={{ opacity: r.valid ? 1 : 0.55 }}>
                  <td>{r.nodeId || '—'}</td>
                  <td>{r.ts ? new Date(r.ts).toLocaleDateString() : '—'}</td>
                  <td>{Number.isFinite(r.value) ? r.value : '—'}</td>
                  <td style={{ color: 'var(--red)' }}>{r.reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 4 }}>…and {rows.length - 5} more</div>}
          <div style={{ marginTop: 12 }}>
            <button
              className="btn primary"
              disabled={!validRows.length || importRows.isPending}
              onClick={() =>
                importRows.mutate(
                  { filename, rows: validRows.map(({ nodeId, ts, value }) => ({ nodeId, ts, value })) },
                  {
                    onSuccess: (res) => {
                      setResult(res);
                      setRows([]);
                      showToast(`Imported ${res.accepted} metric row(s) from ${filename}`);
                    },
                  }
                )
              }
            >
              {importRows.isPending ? 'Importing…' : `Import ${validRows.length} rows`}
            </button>
          </div>
        </>
      )}

      {result && (
        <div style={{ fontSize: 12.5, marginTop: 10, color: 'var(--ink-2)' }}>
          Accepted {result.accepted} row(s){result.rejected.length ? `, rejected ${result.rejected.length} (${result.rejected[0].reason}…)` : ''}.
        </div>
      )}
    </div>
  );
}
