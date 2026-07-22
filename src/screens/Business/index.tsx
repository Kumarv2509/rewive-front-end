import { Link } from 'react-router-dom';
import { useBusinessContext } from '../../api/business';
import { Intro } from '../../components/shared/Intro';
import { BusinessTabs } from './BusinessTabs';

// The business, explained: what the company is, how it's organized, where
// the money comes from — so anyone landing in the loop has the context to
// act on a finding, not just read it.
export function BusinessOverviewScreen() {
  const { data, isLoading, isError } = useBusinessContext();

  if (isLoading) return <section className="screen"><div className="state-msg">Loading the business…</div></section>;
  if (isError || !data) return <section className="screen"><div className="state-msg">Could not load the business context.</div></section>;

  const { overview } = data;
  return (
    <section className="screen">
      <h1 className="page">{overview.orgName}</h1>
      <Intro
        line={overview.tagline}
        more={<>This section is the ground the loop stands on: the company, its divisions and channels, and the base data — sales by {data.skuDimension}, by {data.customerDimension}, and the P&amp;L. Every number here is a mandate held twice; when one drifts, the row links to the finding that is already waiting on someone's call.</>}
      />
      <BusinessTabs />

      {/* Narrative */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
        {overview.narrative.map((p, i) => (
          <p key={i} style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--ink-2)', margin: i === 0 ? 0 : '10px 0 0' }}>{p}</p>
        ))}
      </div>

      {/* Stats */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        {overview.stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--ink-3)' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 2px' }}>{s.value}</div>
            {s.note && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{s.note}</div>}
          </div>
        ))}
      </div>

      {/* Divisions */}
      <div className="sec-head" style={{ padding: '4px 0 10px' }}><h3>Divisions — each with its own COO, P&amp;L and agents</h3></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 16 }}>
        {overview.divisions.map((d) => (
          <div key={d.key} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{d.name}</div>
              <span className="pill indigo">{d.revenueShare} of revenue</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>{d.leader} · {d.role}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 8 }}>{d.note}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: d.watchedBy ? 8 : 0 }}>
              {d.brands.map((b) => <span key={b} className="pill gray">{b}</span>)}
            </div>
            {d.watchedBy && <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Held twice by: {d.watchedBy}</div>}
          </div>
        ))}
      </div>

      {/* Entities + channels */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="sec-head" style={{ padding: '0 0 10px' }}><h3>Operating entities</h3></div>
          {overview.entities.map((e) => (
            <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
              <div><strong>{e.name}</strong> <span style={{ color: 'var(--ink-3)' }}>· {e.region}</span></div>
              <div style={{ color: 'var(--ink-3)', textAlign: 'right' }}>{e.role}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div className="sec-head" style={{ padding: '0 0 10px' }}><h3>Where the revenue comes from</h3></div>
          {overview.channels.map((c) => (
            <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
              <div><strong>{c.name}</strong> <span className="pill gray" style={{ marginLeft: 6 }}>{c.share}</span></div>
              <div style={{ color: 'var(--ink-3)', textAlign: 'right' }}>{c.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Facts — market, seasonality, footprint, costs */}
      {overview.factSections && overview.factSections.length > 0 && (
        <>
          <div className="sec-head" style={{ padding: '4px 0 10px' }}><h3>The facts behind the mandates</h3></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
            {overview.factSections.map((section) => (
              <div key={section.title} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>{section.title}</div>
                {section.items.map((f) => (
                  <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                    <div style={{ color: 'var(--ink-2)' }}>
                      {f.label}
                      {f.note && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{f.note}</div>}
                    </div>
                    <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{f.value}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* How to act */}
      <div className="sec-head" style={{ padding: '4px 0 10px' }}><h3>How to act on what you see here</h3></div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
        {overview.actGuide.map((g, i) => (
          <div key={g.title} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, color: 'var(--accent-deep)', marginBottom: 6 }}>STEP {i + 1}</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{g.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{g.body}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
        Start with <Link to="/business/sku" style={{ color: 'var(--accent-deep)' }}>Sales by {data.skuDimension}</Link> or{' '}
        <Link to="/business/customers" style={{ color: 'var(--accent-deep)' }}>Sales by {data.customerDimension}</Link> — rows marked
        {' '}<span className="pill red">drifting</span> link straight to the finding waiting on a call.
      </div>
    </section>
  );
}
