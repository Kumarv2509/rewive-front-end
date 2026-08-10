// The onboarding factory — turns an industry template plus whatever the
// customer brings (a KPI list, a P&L, role names) into a working world model:
// Operating Picture brain, holder agents, persona labels, tenant branding and
// a live-tracking plan. Entirely deterministic: the template constrains the
// structure, fuzzy matching maps the customer's numbers onto it, and the
// review step in the UI is where judgment happens. No LLM calls here.
import { brains } from './v4data.js';

export const CUSTOM_INDUSTRY = 'custom';

// FMCG's shadow org uses the full division tree; a custom org runs the seven
// shared legacy roles. Remap so every generated agent is addressable by a
// lens someone can actually sign in as.
const LEGACY_PERSONA_REMAP = {
  group_ceo: 'coo',
  coo_gi: 'coo', coo_fnv: 'coo', coo_ambient: 'coo',
  protein_supply_chain: 'operations_head', gi_supply_chain: 'operations_head',
  fnv_supply_chain: 'operations_head', ambient_supply_chain: 'operations_head',
  protein_production: 'operations_head', gi_production: 'operations_head',
  fnv_production: 'operations_head', ambient_production: 'operations_head',
  protein_commercial_finance: 'commercial_finance', gi_commercial_finance: 'commercial_finance',
  fnv_commercial_finance: 'commercial_finance', ambient_commercial_finance: 'commercial_finance',
  protein_analysts: 'fpa', gi_analysts: 'fpa', fnv_analysts: 'fpa', ambient_analysts: 'fpa',
  shared_services: 'operations_head', procurement: 'operations_head',
  hr_services: 'operations_head', audit: 'fpa',
};
const LEGACY_ROLES = new Set(['coo', 'operations_head', 'store_manager', 'sales_supervisor', 'cfo', 'fpa', 'commercial_finance']);
const toLegacyPersona = (p) => (LEGACY_ROLES.has(p) ? p : LEGACY_PERSONA_REMAP[p] ?? 'operations_head');

const reId = (id) => id.replace(/^[^-]+-/, 'cust-');

const tokens = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9%\s]/g, ' ').split(/\s+/).filter(Boolean);

// Token overlap blending containment with symmetric overlap: "OEE — overall
// equipment effectiveness" fully contains the template's "OEE" (containment 1)
// even though the symmetric score is low, while "Order fill rate" vs "Scrap
// rate" shares only a generic token and stays below the match threshold.
function nameSimilarity(a, b) {
  const ta = tokens(a); const tb = new Set(tokens(b));
  if (!ta.length || !tb.size) return 0;
  const hits = ta.filter((t) => tb.has(t)).length;
  return (hits / Math.max(ta.length, tb.size) + hits / Math.min(ta.length, tb.size)) / 2;
}

// Where an unmatched KPI belongs: recognizable vocabulary first, then stream-
// name similarity, then the first stream.
const STREAM_HINTS = [
  { test: /dso|days sales|cash|revenue|margin|cost|spend|ebitda|receivab|collection|billing|budget/i, keys: ['finance'] },
  { test: /accuracy|defect|yield|complaint|quality|audit/i, keys: ['quality'] },
  { test: /warehouse|picking|fill|otif|inventory|logistic|delivery|supplier|stockout|dc\b/i, keys: ['supply', 'logistics', 'merch'] },
  { test: /safety|incident|lti/i, keys: ['safety'] },
  { test: /oee|throughput|downtime|production|scrap|equipment/i, keys: ['production', 'manufacturing', 'store_ops'] },
  { test: /sales|order|customer|nps|conversion|basket|loyalty|patient|member/i, keys: ['commercial', 'ecom', 'customer', 'sales', 'revenue_cycle'] },
];

function guessStream(name, streams) {
  for (const h of STREAM_HINTS) {
    if (!h.test.test(String(name))) continue;
    const hit = streams.find((s) => h.keys.some((k) => s.key.toLowerCase().includes(k) || String(s.name).toLowerCase().includes(k)));
    if (hit) return hit.key;
  }
  const scored = streams
    .map((s) => ({ score: nameSimilarity(name, s.name), key: s.key }))
    .sort((x, y) => y.score - x.score)[0];
  return scored && scored.score > 0 ? scored.key : streams[0].key;
}

const DOWN_GOOD_HINTS = /waste|shrink|cost|days|dso|downtime|defect|complaint|return|churn|stockout|markdown|overtime|scrap|leakage|denial|readmis|wait/i;
const PCT_HINTS = /%|rate|pct|percent|margin|share|fill|availability|osa|otif|oee|effectiveness|utili[sz]ation|adherence|coverage|conversion|accuracy|yield|compliance/i;
const DAYS_HINTS = /\bdays?\b|\bdso\b|\bdio\b|\bar days\b|lead time/i;

export function guessUnit(row) {
  if (row.unit && ['pct', 'currency_m', 'days', 'ratio', 'count'].includes(row.unit)) return row.unit;
  const name = String(row.name ?? '');
  if (DAYS_HINTS.test(name)) return 'days';
  if (PCT_HINTS.test(name)) return 'pct';
  if (/revenue|sales|spend|cash|capex|opex|cogs|ebitda|profit|income/i.test(name)) return 'currency_m';
  if (/ratio|\bx\b|turns/i.test(name)) return 'ratio';
  return 'count';
}

export function guessDirection(name, unit) {
  if (DOWN_GOOD_HINTS.test(String(name))) return 'down_good';
  if (unit === 'days') return 'down_good';
  return 'up_good';
}

export function displayValue(unit, value, currency) {
  if (!Number.isFinite(value)) return undefined;
  const v = Math.abs(value) >= 100 ? value.toFixed(0) : String(Math.round(value * 10) / 10);
  if (unit === 'pct') return `${v}%`;
  if (unit === 'currency_m') return `${currency} ${v}M`;
  if (unit === 'days') return `${v} days`;
  if (unit === 'ratio') return `${v}x`;
  return String(v);
}

const num = (x) => {
  if (typeof x === 'number') return x;
  const m = String(x ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};

/**
 * Build a reviewable draft from a template + the customer's inputs.
 * input: { template, company: { name, currency, accent, domain?, sector?, tagline? },
 *          entities: [{name, region}], roles: { [legacyRole]: { label?, person? } },
 *          kpis: [{ name, target?, current?, unit? }] }
 * Returns { template, streams, mandates[], warnings[] } — mandates are the
 * review rows; intents / P&L lines / signals ride along silently at commit.
 */
export function buildDraft(input) {
  const template = brains[input.template];
  if (!template) throw new Error(`Unknown template "${input.template}"`);
  const warnings = [];
  const currency = input.company?.currency ?? 'AED';

  const templateMandates = template.nodes.filter((n) => n.kind === 'stream_kpi');
  const claimed = new Set();
  const rows = [];

  // Customer KPIs first: best fuzzy match against the template's mandates
  // adopts that node's place in the graph (edges, stream); unmatched ones
  // become new mandates on the best-guess stream.
  for (const kpi of input.kpis ?? []) {
    const name = String(kpi.name ?? '').trim();
    if (!name) continue;
    let best = null; let bestScore = 0;
    for (const tm of templateMandates) {
      if (claimed.has(tm.id)) continue;
      const score = nameSimilarity(name, tm.name);
      if (score > bestScore) { best = tm; bestScore = score; }
    }
    const target = num(kpi.target);
    const current = num(kpi.current);
    const unit = guessUnit(kpi);
    if (best && bestScore >= 0.55) {
      claimed.add(best.id);
      rows.push({
        id: reId(best.id),
        name,
        streamKey: best.streamKey,
        definition: best.definition,
        unit,
        direction: guessDirection(name, unit),
        target: Number.isFinite(target) ? target : null,
        current: Number.isFinite(current) ? current : null,
        source: 'matched',
        include: true,
      });
    } else {
      const stream = guessStream(name, template.streams);
      rows.push({
        id: `cust-k-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}`,
        name,
        streamKey: stream,
        definition: `${name} — brought in at onboarding; definition to be confirmed.`,
        unit,
        direction: guessDirection(name, unit),
        target: Number.isFinite(target) ? target : null,
        current: Number.isFinite(current) ? current : null,
        source: 'added',
        include: true,
      });
    }
  }

  // Template mandates the customer didn't claim: keep the structure, blank the
  // numbers — a template's demo figures are not the customer's and must never
  // be presented as theirs.
  for (const tm of templateMandates) {
    if (claimed.has(tm.id)) continue;
    rows.push({
      id: reId(tm.id),
      name: tm.name,
      streamKey: tm.streamKey,
      definition: tm.definition,
      unit: guessUnit({ name: tm.name }),
      direction: guessDirection(tm.name, guessUnit({ name: tm.name })),
      target: null,
      current: null,
      source: 'template',
      include: true,
    });
  }

  const withNumbers = rows.filter((r) => Number.isFinite(r.target) && Number.isFinite(r.current));
  if (!withNumbers.length) {
    warnings.push('No mandate carries both a target and a current value yet — nothing will be live-tracked until numbers land.');
  }
  if ((input.kpis ?? []).length && !rows.some((r) => r.source === 'matched')) {
    warnings.push('None of your KPIs matched the template by name — they were added as new mandates; check their streams.');
  }

  return {
    template: input.template,
    currency,
    streams: template.streams.map((s) => ({ key: s.key, name: s.name })),
    mandates: rows,
    warnings,
  };
}

/**
 * Turn a committed (reviewed, possibly edited) draft into the artifacts the
 * server installs: brain, agents, tenant, minimal content pack, business
 * context and the tracking plan. Pure — no state touched here.
 */
export function buildArtifacts(commit) {
  const template = brains[commit.template];
  if (!template) throw new Error(`Unknown template "${commit.template}"`);
  const company = commit.company ?? {};
  const orgName = String(company.name ?? '').trim();
  if (!orgName) throw new Error('Organization name is required');
  const currency = company.currency ?? 'AED';
  const entities = (commit.entities ?? []).filter((e) => String(e?.name ?? '').trim());
  const included = (commit.mandates ?? []).filter((m) => m.include !== false && String(m?.name ?? '').trim());
  if (!included.length) throw new Error('At least one mandate must be included');

  const includedIds = new Set(included.map((m) => m.id));
  const keptTemplateIds = new Set(
    template.nodes.filter((n) => n.kind !== 'stream_kpi' || includedIds.has(reId(n.id))).map((n) => n.id),
  );

  // Non-mandate tiers (intents, P&L cascade, signals) clone structurally with
  // their demo figures blanked; mandates come from the reviewed rows.
  const nodes = [];
  for (const n of template.nodes) {
    if (n.kind === 'stream_kpi') continue;
    nodes.push({
      ...n,
      id: reId(n.id),
      currentValue: undefined,
      targetValue: undefined,
      trend: undefined,
      health: undefined,
      status: 'needs_data',
      dataSources: [],
    });
  }
  for (const m of included) {
    const tplNode = template.nodes.find((n) => reId(n.id) === m.id);
    nodes.push({
      id: m.id,
      kind: 'stream_kpi',
      name: m.name,
      streamKey: m.streamKey,
      definition: m.definition || tplNode?.definition || `${m.name} — mandate.`,
      currentValue: displayValue(m.unit, Number(m.current), currency),
      targetValue: displayValue(m.unit, Number(m.target), currency),
      trend: undefined,
      health: undefined,
      status: 'needs_data',
      dataSources: [],
    });
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = template.edges
    .filter((e) => keptTemplateIds.has(e.source) && keptTemplateIds.has(e.target))
    .map((e) => ({ ...e, id: reId(e.id), source: reId(e.source), target: reId(e.target) }))
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  const brain = { industry: CUSTOM_INDUSTRY, streams: template.streams.map((s) => ({ ...s })), nodes, edges };

  // One holder agent per template agent, personas remapped to the seven legacy
  // roles, human owners renamed from the People step. Watch lists follow the
  // re-id'd nodes; exactly one agent keeps streamKey null (the chief).
  const roleInputs = commit.roles ?? {};
  const personOf = (persona) => String(roleInputs[persona]?.person ?? '').trim();
  const templateAgents = commit.__templateAgents; // injected by app.js (shadowOrgs lives there)
  const outAgents = (templateAgents ?? []).map((a) => {
    const persona = a.streamKey === null ? 'coo' : toLegacyPersona(a.persona);
    const person = personOf(persona);
    const initials = person ? person.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : a.humanOwner?.initials ?? '·';
    return {
      ...a,
      id: reId(a.id),
      persona,
      humanOwner: {
        ...a.humanOwner,
        name: person || a.humanOwner?.name || 'Unassigned',
        initials,
        role: roleInputs[persona]?.label || a.humanOwner?.role || persona,
      },
      watchesNodeIds: (a.watchesNodeIds ?? []).map(reId).filter((id) => nodeIds.has(id)),
      openFindings: 0,
      slaBreaches: 0,
      health: 'healthy',
      lastFindingAt: null,
      reportsToAgentId: a.reportsToAgentId ? reId(a.reportsToAgentId) : null,
    };
  });

  const tracked = included.filter((m) => Number.isFinite(Number(m.target)) && Number(m.target) !== 0 && Number.isFinite(Number(m.current)));

  const mark = orgName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'CO';
  const tenant = {
    id: 'custom-org',
    name: orgName,
    mark,
    industry: CUSTOM_INDUSTRY,
    industryLabel: String(company.sector ?? '').trim() || 'Onboarded organization',
    accent: company.accent || '#4F46E5',
    domain: String(company.domain ?? '').trim() || `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.example`,
    tagline: String(company.tagline ?? '').trim() || `${orgName} — every number here has two owners: a person and an agent.`,
    proofPoints: [
      `${tracked.length} of ${included.length} mandates live-tracked across ${brain.streams.length} streams`,
      entities.length ? entities.map((e) => e.name).join(' · ') : 'Single entity',
      `Currency ${currency} · adapted from the ${commit.template} template`,
    ],
  };

  const labels = {};
  for (const [persona, r] of Object.entries(roleInputs)) {
    if (r?.label && String(r.label).trim()) labels[persona] = String(r.label).trim();
  }

  const contentPack = {
    dashboardSummary: {
      greetingName: orgName.split(/\s+/)[0],
      summarySentence: `${orgName} is onboarded: ${included.length} mandates on the Operating Picture, ${tracked.length} live-tracked. Findings, decisions and runs will appear here as the loop runs — nothing is seeded.`,
    },
    pendingDecisions: [],
    pulse: [],
    liveRuns: [],
    topPerformer: null,
    runs: [],
    runDetails: {},
    runExceptions: [],
    runChases: [],
    decisionLedger: [],
    leaderboardHighlights: [],
    leaderboard: [],
    loopSpeed: [],
    outcomeReports: {},
    agentCatalog: [],
  };

  const businessContext = {
    skuDimension: 'Product',
    customerDimension: 'Customer',
    overview: {
      orgName,
      tagline: tenant.tagline,
      narrative: [
        `${orgName} was onboarded from the ${commit.template} template. The Operating Picture carries ${included.length} mandates across ${brain.streams.length} streams; ${tracked.length} are live-tracked from day one.`,
        'Base data (products, customers, channels) has not been loaded yet — this page fills in as datasets land.',
      ],
      stats: [
        { label: 'Mandates', value: String(included.length), note: 'on the Operating Picture' },
        { label: 'Live-tracked', value: String(tracked.length), note: 'real numbers, watched by agents' },
        { label: 'Entities', value: String(entities.length || 1), note: entities.map((e) => e.name).join(' · ') || orgName },
      ],
      divisions: [],
      entities: entities.map((e) => ({ name: e.name, region: e.region || '', role: '' })),
      channels: [],
      // Product doctrine, not customer data — every org gets the same guide.
      // Omitting it crashed the Business overview for onboarded orgs (the
      // client types it as required and renders it unguarded).
      actGuide: [
        { title: 'Start from the number', body: 'Sales by product and sales by customer are the base data. A row marked “drifting” means the agent watching that number has already raised a finding — the link takes you to its thread.' },
        { title: 'The finding is the unit of work', body: 'Each finding names the drift, the evidence, and the role whose call it is. It waits in that role\'s Today queue with an SLA clock. Silence is not neutral: past the SLA it escalates up the role tree.' },
        { title: 'Make the four-A call', body: 'Accept sets a measurable recovery target the agent watches until the number is back. Act opens a solution design. Park sets a re-alert rule. Dismiss requires a reason, which tunes the agent.' },
        { title: 'Nothing is done until the number is back', body: 'Accepted findings appear in Findings → Watching until the recovery target holds. Every call lands in the Decision Ledger, and an assessor returns a verdict later: worked, didn\'t, or too early. That is the company\'s memory of judgment.' },
      ],
    },
    skus: [],
    customers: [],
  };

  // Flat 30-day synthetic history ending at today's reading: the first sweep
  // then judges the org's real present gap to target — no manufactured drama.
  const trackingPlan = tracked.map((m) => ({
    nodeId: m.id,
    unit: m.unit,
    direction: m.direction === 'down_good' ? 'down_good' : 'up_good',
    targetNumeric: Number(m.target),
    currentNumeric: Number(m.current),
    warnPct: 4,
    breachPct: 8,
    entity: entities[0]?.name ?? null,
    region: entities[0]?.region ?? null,
  }));

  return { brain, agents: outAgents, tenant, labels, currency, contentPack, businessContext, trackingPlan };
}

/**
 * A flat 30-day series ending at the onboarded current reading, with a small
 * deterministic wobble. Midnight-UTC snapped for the same reason as
 * seed-tracking.js: (node_id, ts, source) is unique, so a re-commit updates
 * the same rows instead of laying down a second offset series.
 */
export function buildOnboardSeries(nodeId, value, target) {
  const wobble = Math.abs(target || value || 1) * 0.003;
  const midnight = new Date();
  midnight.setUTCHours(0, 0, 0, 0);
  const points = [];
  for (let i = 29; i >= 0; i -= 1) {
    points.push({
      nodeId,
      value: Number((value + Math.sin(i * 1.7) * wobble).toFixed(2)),
      ts: new Date(midnight.getTime() - i * 86_400_000).toISOString(),
      source: 'seed',
    });
  }
  return points;
}
