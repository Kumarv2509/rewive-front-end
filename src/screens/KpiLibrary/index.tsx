import { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SectionTabs, FOUNDATION_TABS } from '../../components/shared/SectionTabs';
import { SelectKpisTab } from './SelectKpisTab';
import { ImportPlanningTab } from './ImportPlanningTab';
import { TrackedKpisPanel } from './TrackedKpisPanel';

type Tab = 'select' | 'import';

export function KpiLibraryScreen() {
  const [tab, setTab] = useState<Tab>('select');

  return (
    <section className="screen" style={{ maxWidth: 1140 }}>
      <PageHeader
        title="Mandates"
        subtitle="Pick the mandates that matter for your operating context, or import them from a planning tool."
        tabs={<SectionTabs tabs={FOUNDATION_TABS} />}
      />

      <div className="tabs">
        <button className={`tab${tab === 'select' ? ' active' : ''}`} onClick={() => setTab('select')}>Select mandates to track</button>
        <button className={`tab${tab === 'import' ? ' active' : ''}`} onClick={() => setTab('import')}>Import from Anaplan or similar</button>
      </div>

      {tab === 'select' && <SelectKpisTab />}
      {tab === 'import' && <ImportPlanningTab />}

      <div style={{ marginTop: 20 }}>
        <TrackedKpisPanel />
      </div>
    </section>
  );
}
