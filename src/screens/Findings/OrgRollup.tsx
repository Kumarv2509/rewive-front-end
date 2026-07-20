import { Pill } from '../../components/shared/Pill';
import { personaLabel } from '../CommandCenter/personas';
import { slaTone } from './meta';
import type { Persona } from '../../api/types';
import type { ReportRollup, Theme } from './rollup';

// The senior half of the Findings screen: what the organisation below is
// carrying, one row per direct report instead of one row per finding. Nothing
// here offers a disposition — these are not the lens role's call.

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'red' | 'amber' | 'gray' }) {
  return (
    <div style={{ minWidth: 78 }}>
      <div className="eyebrow" style={{ padding: 0, marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: tone === 'red' ? 'var(--red)' : tone === 'amber' ? 'var(--amber)' : 'var(--ink)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ReportRow({ row, onDrill }: { row: ReportRollup; onDrill: (role: Persona) => void }) {
  const belowCount = row.roles.length - 1;
  return (
    <div className="dec-item" style={{ alignItems: 'center' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="t1">
          <button
            className="link-btn"
            onClick={() => onDrill(row.role)}
            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--accent)', cursor: 'pointer' }}
          >
            {personaLabel(row.role)}
          </button>{' '}
          {row.breached > 0 && <Pill tone="red">{row.breached} breached</Pill>}
          {row.breached === 0 && row.atRisk > 0 && <> <Pill tone="amber">{row.atRisk} near escalation</Pill></>}
        </div>
        <div className="t2">
          {belowCount > 0 ? `${belowCount} role${belowCount === 1 ? '' : 's'} below · ` : ''}
          {row.severe} critical/high open · {row.watching} watching · {row.closed} closed
        </div>
      </div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
        <Metric label="Open" value={String(row.open)} tone={row.breached > 0 ? 'red' : undefined} />
        <Metric
          label="Tightest SLA"
          value={row.tightestSla === null ? '—' : `${Math.max(0, Math.round(row.tightestSla))}h`}
          tone={row.tightestSla === null ? 'gray' : slaTone(row.tightestSla)}
        />
        <Metric label="Impact named" value={row.impact.label} />
      </div>
    </div>
  );
}

function ThemeCard({ theme, onDrill }: { theme: Theme; onDrill: (role: Persona) => void }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="t1" style={{ marginBottom: 4 }}>
        {theme.name} <Pill tone="red">{theme.branches.length} divisions</Pill>
      </div>
      <div className="t2" style={{ marginBottom: 10 }}>
        {theme.findings.length} open findings on the same mandate
        {theme.plLine ? <> · feeds {theme.plLine}</> : null}
        {theme.impact.named > 0 ? <> · {theme.impact.label} named</> : null}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {theme.branches.map((b) => (
          <button
            key={b}
            className="pill gray"
            onClick={() => onDrill(b)}
            style={{ border: 'none', font: 'inherit', cursor: 'pointer' }}
          >
            {personaLabel(b)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OrgRollup({
  rows,
  themes,
  delegatedCount,
  onDrill,
}: {
  rows: ReportRollup[];
  themes: Theme[];
  delegatedCount: number;
  onDrill: (role: Persona) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <>
      {themes.length > 0 && (
        <>
          <div className="sec-head" style={{ padding: '0 0 12px' }}>
            <h3>Patterns across your organisation</h3>
            <Pill tone="red">{themes.length}</Pill>
          </div>
          <div className="t2" style={{ margin: '-6px 0 12px', color: 'var(--ink-3)' }}>
            The same mandate drifting under more than one division at once — this is the call that is yours, not the
            individual instances below.
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
            {themes.map((t) => <ThemeCard key={t.key} theme={t} onDrill={onDrill} />)}
          </div>
        </>
      )}

      <div className="sec-head" style={{ padding: '0 0 12px' }}>
        <h3>Your organisation is carrying</h3>
        <Pill tone="gray">{delegatedCount}</Pill>
      </div>
      <div className="t2" style={{ margin: '-6px 0 12px', color: 'var(--ink-3)' }}>
        Owned below you — visibility, not your call. These escalate to you on their own if an SLA lapses.
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        {rows.map((r) => <ReportRow key={r.role} row={r} onDrill={onDrill} />)}
      </div>
    </>
  );
}
