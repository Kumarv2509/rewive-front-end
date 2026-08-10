import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useOnboardingCommit, useOnboardingDraft } from '../../api/onboarding';
import { useSetIndustry } from '../../api/shadowOrg';
import { usePersonaLens } from '../../components/layout/personaLens';
import { LEGACY_PERSONAS, PERSONA_LABEL } from '../CommandCenter/personas';
import { setActiveTenantId, setCustomTenant } from '../../tenants';
import type {
  OnboardingDraft, OnboardingKpiRow, OnboardingMandateRow, OnboardingRoleInput, Persona, TemplateIndustryKey,
} from '../../api/types';

// The onboarding factory: template → your company → your people → your
// numbers → review the drafted Operating Picture → a working organization.
// The template constrains the structure; your uploads bring the numbers; the
// review step is where judgment happens. Fully deterministic — no LLM.

const TEMPLATES: { id: TemplateIndustryKey; name: string; blurb: string }[] = [
  { id: 'fmcg', name: 'FMCG / food & beverage', blurb: 'Manufacturing + distribution + trade: fill rates, availability, trade spend, forecast accuracy.' },
  { id: 'healthcare', name: 'Healthcare', blurb: 'Clinics or hospitals: utilization, revenue cycle, patient experience, days in AR.' },
  { id: 'hypermarket', name: 'Hypermarket retail', blurb: 'Multi-site retail: on-shelf availability, shrink, basket, e-commerce fill.' },
  { id: 'manufacturing', name: 'Manufacturing', blurb: 'Discrete plants: OEE, scrap, downtime, supplier OTIF, safety.' },
];

const CURRENCIES = ['AED', 'USD', 'EUR', 'SAR', 'GBP', 'INR'];
const ACCENTS = ['#4F46E5', '#B45309', '#0E7C6B', '#1D6F42', '#1B4B72', '#9D174D'];
const UNITS: OnboardingMandateRow['unit'][] = ['pct', 'currency_m', 'days', 'ratio', 'count'];

type Step = 'template' | 'company' | 'people' | 'data' | 'review';
const STEPS: { key: Step; label: string }[] = [
  { key: 'template', label: 'Template' },
  { key: 'company', label: 'Company' },
  { key: 'people', label: 'People' },
  { key: 'data', label: 'Your numbers' },
  { key: 'review', label: 'Review & create' },
];

interface EntityRow { name: string; region: string }
interface KpiEntry { name: string; target: string; current: string }

const pickColumn = (keys: string[], ...candidates: string[]) =>
  keys.find((k) => candidates.includes(k.trim().toLowerCase()));

export function OnboardingScreen() {
  const navigate = useNavigate();
  const draftMutation = useOnboardingDraft();
  const commitMutation = useOnboardingCommit();
  const setIndustry = useSetIndustry();
  const { setLens, setHierarchy } = usePersonaLens();

  const [step, setStep] = useState<Step>('template');
  const [template, setTemplate] = useState<TemplateIndustryKey>('fmcg');
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [domain, setDomain] = useState('');
  const [entities, setEntities] = useState<EntityRow[]>([{ name: '', region: '' }]);
  const [roles, setRoles] = useState<Partial<Record<Persona, OnboardingRoleInput>>>(
    () => Object.fromEntries(LEGACY_PERSONAS.map((p) => [p, { label: PERSONA_LABEL[p], person: '' }])),
  );
  const [kpis, setKpis] = useState<KpiEntry[]>([{ name: '', target: '', current: '' }]);
  const [uploadNote, setUploadNote] = useState('');
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const [error, setError] = useState('');

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  const filledKpis: OnboardingKpiRow[] = useMemo(
    () => kpis.filter((k) => k.name.trim()).map((k) => ({ name: k.name.trim(), target: k.target, current: k.current })),
    [kpis],
  );

  // One parser for both a KPI scorecard and a P&L export: a P&L line is a
  // name + actual (current) + budget (target), so it rides the same pipeline.
  const handleFile = async (file: File) => {
    setError('');
    try {
      const { read, utils } = await import('xlsx');
      const workbook = read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false });
      if (!raw.length) { setUploadNote(`${file.name}: no rows found`); return; }
      const keys = Object.keys(raw[0]);
      const nameCol = pickColumn(keys, 'name', 'kpi', 'mandate', 'metric', 'label', 'line', 'line item');
      const targetCol = pickColumn(keys, 'target', 'budget', 'goal', 'plan');
      const currentCol = pickColumn(keys, 'current', 'actual', 'value', 'reading', 'ytd');
      if (!nameCol) { setUploadNote(`${file.name}: no name/kpi/label column found`); return; }
      const rows = raw
        .map((r) => ({
          name: String(r[nameCol] ?? '').trim(),
          target: targetCol ? String(r[targetCol] ?? '') : '',
          current: currentCol ? String(r[currentCol] ?? '') : '',
        }))
        .filter((r) => r.name);
      setKpis((prev) => [...prev.filter((k) => k.name.trim()), ...rows]);
      setUploadNote(`${file.name}: ${rows.length} row(s) added below — edit or remove before drafting.`);
    } catch (err) {
      // A parse failure must never be silent — the org would be created with
      // no numbers and the customer would believe their upload landed.
      setUploadNote(`${file.name}: could not be read — ${err instanceof Error ? err.message : 'unrecognized format'}. Use CSV/XLSX with name + target/budget + current/actual columns, or type the numbers below.`);
    }
  };

  const generateDraft = () => {
    setError('');
    draftMutation.mutate(
      { template, company: { name, currency, accent, sector, domain }, kpis: filledKpis },
      {
        onSuccess: (d) => { setDraft(d); setStep('review'); },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not build a draft'),
      },
    );
  };

  const patchMandate = (id: string, patch: Partial<OnboardingMandateRow>) => {
    setDraft((d) => d && ({ ...d, mandates: d.mandates.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  };

  // Half-typed numbers ("-", "3.") must not persist as NaN.
  const numPatch = (m: OnboardingMandateRow, field: 'target' | 'current', v: string): Partial<OnboardingMandateRow> => {
    if (v === '') return { [field]: null };
    const n = Number(v);
    return Number.isFinite(n) ? { [field]: n } : { [field]: m[field] };
  };

  const createOrg = () => {
    if (!draft) return;
    setError('');
    commitMutation.mutate(
      {
        template,
        company: { name, currency, accent, sector, domain },
        entities: entities.filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim(), region: e.region.trim() })),
        roles,
        mandates: draft.mandates,
        streams: draft.streams,
      },
      {
        onSuccess: (res) => {
          setCustomTenant({ ...res.tenant, labelOverrides: res.labels });
          setActiveTenantId(res.tenant.id);
          setLens('all');
          setHierarchy(null);
          setIndustry.mutate('custom', { onSettled: () => navigate('/build/picture') });
        },
        onError: (e) => setError(e instanceof Error ? e.message : 'Could not create the organization'),
      },
    );
  };

  const included = draft?.mandates.filter((m) => m.include) ?? [];
  const tracked = included.filter((m) => Number.isFinite(Number(m.target)) && Number(m.target) !== 0 && Number.isFinite(Number(m.current)) && String(m.current) !== '');

  return (
    <div className="onb">
      <div className="onb-top">
        <div className="logo-mark">R</div>
        <span>Rewive · Set up a new organization</span>
        <Link to="/login" className="onb-exit">Back to sign-in</Link>
      </div>

      <div className="onb-steps">
        {STEPS.map((s, i) => (
          <span key={s.key} className={`onb-step${i === stepIdx ? ' on' : ''}${i < stepIdx ? ' done' : ''}`}>{s.label}</span>
        ))}
      </div>

      <div className="onb-body card">
        {step === 'template' && (
          <>
            <h2>Start from the nearest template</h2>
            <p className="onb-sub">The template fixes the shape of your Operating Picture — streams, causal edges, the persona tree. Your own numbers replace its content in the next steps.</p>
            <div className="onb-grid">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" className={`onb-card${template === t.id ? ' on' : ''}`} onClick={() => setTemplate(t.id)}>
                  <span className="onb-card-name">{t.name}</span>
                  <span className="onb-card-blurb">{t.blurb}</span>
                </button>
              ))}
            </div>
            <div className="onb-actions">
              <span />
              <button className="btn primary" onClick={() => setStep('company')}>Continue</button>
            </div>
          </>
        )}

        {step === 'company' && (
          <>
            <h2>Your company</h2>
            <p className="onb-sub">Branding, currency and the legal entities your numbers roll up by.</p>
            <div className="onb-form">
              <label>Organization name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Falcon Foods Trading" /></label>
              <label>What you do<input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Food trading & distribution" /></label>
              <div className="onb-row2">
                <label>Currency
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label>Email domain<input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="falconfoods.ae" /></label>
              </div>
              <div>
                <div className="onb-label">Brand color</div>
                <div className="onb-swatches">
                  {ACCENTS.map((a) => (
                    <button key={a} type="button" className={`onb-swatch${accent === a ? ' on' : ''}`} style={{ background: a }} onClick={() => setAccent(a)} aria-label={a} />
                  ))}
                </div>
              </div>
              <div>
                <div className="onb-label">Legal entities / sites</div>
                {entities.map((en, i) => (
                  <div key={i} className="onb-row2" style={{ marginBottom: 6 }}>
                    <input value={en.name} placeholder="Entity name (e.g. Falcon Foods DXB)" onChange={(e) => setEntities((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <input value={en.region} placeholder="Region (e.g. Dubai)" onChange={(e) => setEntities((p) => p.map((x, j) => (j === i ? { ...x, region: e.target.value } : x)))} />
                  </div>
                ))}
                <button className="btn" type="button" onClick={() => setEntities((p) => [...p, { name: '', region: '' }])}>+ Add entity</button>
              </div>
            </div>
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep('template')}>Back</button>
              <button className="btn primary" disabled={!name.trim()} onClick={() => setStep('people')}>Continue</button>
            </div>
          </>
        )}

        {step === 'people' && (
          <>
            <h2>Who holds the mandates</h2>
            <p className="onb-sub">Seven roles partition everything in Rewive. Rename them in your language and name the person — each becomes a sign-in lens, paired with an agent watching the same numbers.</p>
            <div className="onb-form">
              {LEGACY_PERSONAS.map((p) => (
                <div key={p} className="onb-row2">
                  <input
                    value={roles[p]?.label ?? ''}
                    onChange={(e) => setRoles((r) => ({ ...r, [p]: { ...r[p], label: e.target.value } }))}
                    aria-label={`Label for ${PERSONA_LABEL[p]}`}
                  />
                  <input
                    value={roles[p]?.person ?? ''}
                    placeholder="Person's name (optional)"
                    onChange={(e) => setRoles((r) => ({ ...r, [p]: { ...r[p], person: e.target.value } }))}
                    aria-label={`Person for ${PERSONA_LABEL[p]}`}
                  />
                </div>
              ))}
            </div>
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep('company')}>Back</button>
              <button className="btn primary" onClick={() => setStep('data')}>Continue</button>
            </div>
          </>
        )}

        {step === 'data' && (
          <>
            <h2>Your numbers</h2>
            <p className="onb-sub">Upload a KPI scorecard or a P&L export (CSV/XLSX with name + target/budget + current/actual columns), or type the numbers you watch. Anything with a target and a current value is live-tracked from day one. You can also skip this — the template structure still stands, waiting for data.</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
            />
            {uploadNote && <div className="onb-note">{uploadNote}</div>}
            <div className="onb-kpi-head"><span>KPI / P&L line</span><span>Target</span><span>Current</span><span /></div>
            {kpis.map((k, i) => (
              <div key={i} className="onb-kpi-row">
                <input value={k.name} placeholder="e.g. Order fill rate" onChange={(e) => setKpis((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input value={k.target} placeholder="97" onChange={(e) => setKpis((p) => p.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))} />
                <input value={k.current} placeholder="94.5" onChange={(e) => setKpis((p) => p.map((x, j) => (j === i ? { ...x, current: e.target.value } : x)))} />
                <button className="btn" type="button" onClick={() => setKpis((p) => p.filter((_, j) => j !== i))} aria-label="Remove row">×</button>
              </div>
            ))}
            <button className="btn" type="button" onClick={() => setKpis((p) => [...p, { name: '', target: '', current: '' }])}>+ Add a number</button>
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep('people')}>Back</button>
              <button className="btn primary" disabled={draftMutation.isPending} onClick={generateDraft}>
                {draftMutation.isPending ? 'Drafting…' : filledKpis.length ? `Draft my Operating Picture (${filledKpis.length} numbers)` : 'Draft my Operating Picture (no numbers yet)'}
              </button>
            </div>
          </>
        )}

        {step === 'review' && draft && (
          <>
            <h2>Review the draft</h2>
            <p className="onb-sub">
              {filledKpis.length
                ? 'Your numbers were mapped onto the template — matched mandates take your name and figures, unmatched ones were added to a best-guess stream, and template mandates keep their structure with the numbers blanked (they are not yours).'
                : 'No numbers yet, so this is the template structure with every figure blanked — mandates go live as data lands.'}
              {' '}Untick what you don't watch. Everything here is editable later on the Operating Picture.
            </p>
            {draft.warnings.map((w) => <div key={w} className="onb-warn">{w}</div>)}
            {draft.streams.map((s) => {
              const rows = draft.mandates.filter((m) => m.streamKey === s.key);
              if (!rows.length) return null;
              return (
                <div key={s.key} style={{ marginBottom: 14 }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>{s.name}</div>
                  {rows.map((m) => (
                    <div key={m.id} className={`onb-mrow${m.include ? '' : ' off'}`}>
                      <input type="checkbox" checked={m.include} onChange={(e) => patchMandate(m.id, { include: e.target.checked })} />
                      <input className="onb-mname" value={m.name} onChange={(e) => patchMandate(m.id, { name: e.target.value })} />
                      <input className="onb-mnum" value={m.target ?? ''} placeholder="target" onChange={(e) => patchMandate(m.id, numPatch(m, 'target', e.target.value))} />
                      <input className="onb-mnum" value={m.current ?? ''} placeholder="current" onChange={(e) => patchMandate(m.id, numPatch(m, 'current', e.target.value))} />
                      <select value={m.unit} onChange={(e) => patchMandate(m.id, { unit: e.target.value as OnboardingMandateRow['unit'] })}>
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <select value={m.direction} onChange={(e) => patchMandate(m.id, { direction: e.target.value as OnboardingMandateRow['direction'] })}>
                        <option value="up_good">up is good</option>
                        <option value="down_good">down is good</option>
                      </select>
                      <select value={m.streamKey} onChange={(e) => patchMandate(m.id, { streamKey: e.target.value })}>
                        {draft.streams.map((st) => <option key={st.key} value={st.key}>{st.name}</option>)}
                      </select>
                      {m.source !== 'template' && <span className={`pill ${m.source === 'matched' ? 'green' : 'blue'}`}>{m.source === 'matched' ? 'yours · matched' : 'yours · added'}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="onb-note">
              {included.length} mandates on the picture · {tracked.length} live-tracked from day one (target + current present).
            </div>
            {included.length > 0 && tracked.length === 0 && (
              <div className="onb-warn">
                Nothing will be live-tracked — no mandate carries both a target and a current value. You can create the
                organization anyway (the structure stands, waiting for data), but the agents will have nothing to watch.
                If you uploaded a file, go back to Your numbers and check it landed.
              </div>
            )}
            <div className="onb-actions">
              <button className="btn" onClick={() => setStep('data')}>Back</button>
              <button className="btn primary" disabled={commitMutation.isPending || setIndustry.isPending || !included.length} onClick={createOrg}>
                {commitMutation.isPending || setIndustry.isPending
                  ? 'Creating…'
                  : `Create ${name.trim() || 'organization'}${tracked.length === 0 ? ' — with no live numbers' : ''}`}
              </button>
            </div>
          </>
        )}

        {error && <div className="onb-warn" style={{ marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  );
}
