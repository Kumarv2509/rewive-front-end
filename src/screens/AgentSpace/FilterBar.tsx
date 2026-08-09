import type { AgentCatalogFilters } from '../../api/types';

// Catalog is already scoped to the current operating context, so we filter within it
// by lifecycle status and how the worker was built — not by industry.
const statuses: { key: AgentCatalogFilters['status']; label: string }[] = [
  { key: 'all', label: 'All workers' },
  { key: 'live', label: 'Live' },
  { key: 'paused', label: 'Paused' },
  { key: 'draft', label: 'Draft' },
];

const types: { key: AgentCatalogFilters['agentType']; label: string }[] = [
  { key: 'all', label: 'Any build' },
  { key: 'chat', label: 'Chat-built' },
  { key: 'studio', label: 'Studio-built' },
];

export function FilterBar({ filters, onChange }: { filters: AgentCatalogFilters; onChange: (f: AgentCatalogFilters) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="filters">
        {statuses.map((s) => (
          <button key={s.key} className={`fchip${(filters.status ?? 'all') === s.key ? ' on' : ''}`} onClick={() => onChange({ ...filters, status: s.key })}>{s.label}</button>
        ))}
      </div>
      <div className="filters" style={{ marginTop: 8 }}>
        {types.map((t) => (
          <button key={t.key} className={`fchip${(filters.agentType ?? 'all') === t.key ? ' on' : ''}`} onClick={() => onChange({ ...filters, agentType: t.key })}>{t.label}</button>
        ))}
        <input
          placeholder="Search workers…"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          style={{ marginLeft: 'auto', border: '1px solid var(--border-strong)', borderRadius: 99, padding: '6px 14px', fontSize: 12.5 }}
        />
      </div>
    </div>
  );
}
