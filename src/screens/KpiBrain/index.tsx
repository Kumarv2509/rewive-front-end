import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAddBrainNode, useIndustries, useKpiBrain, useOrgProfile, useSetIndustry } from '../../api/shadowOrg';
import { usePersonaLens } from '../../components/layout/personaLens';
import { lensOfferedForIndustry } from '../CommandCenter/personas';
import { PageHeader } from '../../components/shared/PageHeader';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { SectionTabs, FOUNDATION_TABS } from '../../components/shared/SectionTabs';
import { useToast } from '../../components/shared/Toast';
import { KpiBrainCanvas } from './KpiBrainCanvas';
import type { IndustryKey, KpiBrain } from '../../api/types';

function IndustrySwitcher() {
  const { data: industries } = useIndustries();
  const { data: profile } = useOrgProfile();
  const setIndustry = useSetIndustry();
  const { lens, setLens } = usePersonaLens();
  const { showToast } = useToast();

  const switchTo = (ind: { id: string; name: string }) => {
    setIndustry.mutate(ind.id as IndustryKey, {
      onSuccess: () => {
        // A lens carried over from another industry (e.g. an FMCG division role)
        // isn't offered here — it would filter every screen to empty while the
        // picker misrenders as "All lenses". Drop it back to All.
        if (!lensOfferedForIndustry(lens, ind.id)) setLens('all');
        showToast(`Switched to the ${ind.name} picture`);
      },
    });
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {industries?.map((ind) => (
        <button
          key={ind.id}
          className={`fchip${profile?.industry === ind.id ? ' on' : ''}`}
          disabled={setIndustry.isPending}
          onClick={() => switchTo(ind)}
          title={ind.description}
        >
          {ind.name}
          <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 11 }}>{ind.kpiCount} mandates</span>
        </button>
      ))}
    </div>
  );
}

function AddKpiForm({ brain }: { brain: KpiBrain }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [streamKey, setStreamKey] = useState(brain.streams[0]?.key ?? '');
  const [definition, setDefinition] = useState('');
  const [dataSources, setDataSources] = useState('');
  const [contributesTo, setContributesTo] = useState('');
  const add = useAddBrainNode();
  const { showToast } = useToast();

  const feedTargets = brain.nodes.filter((n) => n.kind === 'stream_kpi' || n.kind === 'pl_line' || n.kind === 'target');
  const inputStyle = { width: '100%', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' as const };

  if (!open) {
    return <button className="btn ghost sm" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>+ Add a mandate</button>;
  }

  const submit = () => {
    add.mutate(
      {
        name,
        streamKey,
        definition,
        dataSources: dataSources.split(',').map((s) => s.trim()).filter(Boolean),
        contributesTo,
      },
      {
        onSuccess: () => {
          showToast('Mandate added to the picture');
          setOpen(false);
          setName(''); setDefinition(''); setDataSources(''); setContributesTo('');
        },
      },
    );
  };

  return (
    <div className="card" style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Add a mandate to the picture</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 620 }}>
        <input style={inputStyle} placeholder="Mandate — what must stay true" value={name} onChange={(e) => setName(e.target.value)} />
        <select style={inputStyle} value={streamKey} onChange={(e) => setStreamKey(e.target.value)}>
          {brain.streams.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
        </select>
        <input style={{ ...inputStyle, gridColumn: '1 / -1' }} placeholder="What it measures (definition)" value={definition} onChange={(e) => setDefinition(e.target.value)} />
        <input style={inputStyle} placeholder="Senses — data feeds (comma separated)" value={dataSources} onChange={(e) => setDataSources(e.target.value)} />
        <select style={inputStyle} value={contributesTo} onChange={(e) => setContributesTo(e.target.value)}>
          <option value="">Contributes to… (optional)</option>
          {feedTargets.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button className="btn primary sm" disabled={!name.trim() || add.isPending} onClick={submit}>Add to picture</button>
        <button className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

export function KpiBrainScreen() {
  const [params] = useSearchParams();
  const focusNodeId = params.get('focus') ?? undefined;
  const { data: brain, isLoading, isError } = useKpiBrain();

  return (
    <section className="screen" style={{ maxWidth: 1280 }}>
      <PageHeader
        title="Operating Picture"
        subtitle="The DuPont cascade: intents at the top, the P&L beneath them, the mandates that move each line, and the signals that verify each mandate."
        tabs={<SectionTabs tabs={FOUNDATION_TABS} />}
      />

      <IndustrySwitcher />
      {brain && <AddKpiForm brain={brain} />}

      {isLoading && <Loading label="Assembling the picture…" />}
      {isError && <ErrorMessage message="Couldn't load the Operating Picture." />}
      {brain && (
        <div data-tour="picture-map">
          <KpiBrainCanvas brain={brain} focusNodeId={focusNodeId} />
        </div>
      )}
    </section>
  );
}
