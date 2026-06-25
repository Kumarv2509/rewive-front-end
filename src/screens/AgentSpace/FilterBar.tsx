import type { AgentCatalogFilters } from '../../api/types';

const industries: { key: AgentCatalogFilters['industry']; label: string }[] = [
  { key: 'all', label: 'All industries' },
  { key: 'fnb', label: 'Food & Beverage' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'retail', label: 'Retail' },
  { key: 'manufacturing', label: 'Manufacturing' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'technology', label: 'Technology' },
  { key: 'financial_services', label: 'Financial Services' },
  { key: 'real_estate', label: 'Real Estate' },
  { key: 'general', label: 'General' },
];

const functions: { key: AgentCatalogFilters['function']; label: string }[] = [
  { key: 'all', label: 'All functions' },
  { key: 'finance', label: 'Finance' },
  { key: 'hr', label: 'HR' },
  { key: 'it', label: 'IT' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'sales', label: 'Sales' },
];

export function FilterBar({ filters, onChange }: { filters: AgentCatalogFilters; onChange: (f: AgentCatalogFilters) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="filters">
        {industries.map((i) => (
          <button key={i.key} className={`fchip${filters.industry === i.key ? ' on' : ''}`} onClick={() => onChange({ ...filters, industry: i.key })}>{i.label}</button>
        ))}
      </div>
      <div className="filters" style={{ marginTop: 8 }}>
        {functions.map((f) => (
          <button key={f.key} className={`fchip${filters.function === f.key ? ' on' : ''}`} onClick={() => onChange({ ...filters, function: f.key })}>{f.label}</button>
        ))}
        <input
          placeholder="Search agents…"
          value={filters.search ?? ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          style={{ marginLeft: 'auto', border: '1px solid var(--border-strong)', borderRadius: 99, padding: '6px 14px', fontSize: 12.5 }}
        />
      </div>
    </div>
  );
}
