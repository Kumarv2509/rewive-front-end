import { useState } from 'react';
import { Intro } from '../../components/shared/Intro';
import { SectionTabs, FOUNDATION_TABS } from '../../components/shared/SectionTabs';
import { SelectKpisTab } from './SelectKpisTab';
import { ImportPlanningTab } from './ImportPlanningTab';
import { TrackedKpisPanel } from './TrackedKpisPanel';

type Tab = 'select' | 'import';

export function KpiLibraryScreen() {
  const [tab, setTab] = useState<Tab>('select');

  return (
    <section className="screen" style={{ maxWidth: 1140 }}>
      <SectionTabs tabs={FOUNDATION_TABS} />
      <h1 className="page">Mandate Library</h1>
      <Intro
        line="Pick the mandates that matter for your operating context, or import them from a planning tool."
        more={
          <>
            This is the starting point when onboarding a new company. Every mandate you track lists exactly which
            senses (data feeds) need to be connected before its counterpart can watch it and findings can surface —
            a mandate without a sense is blind, and the Operating Picture says so.
          </>
        }
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
