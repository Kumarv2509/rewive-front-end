// Per-industry operational content for the non-brain surfaces (Command Center,
// Runs, Decision Ledger, People, Outcomes). FMCG reuses the original v3 seed
// (which was always FMCG/finance-flavoured); Healthcare and Manufacturing are
// authored to match. The v4 endpoints pick a pack by the current org profile.
import {
  dashboardSummary as fmcgDashboard,
  pendingDecisions as fmcgPending,
  pulse as fmcgPulse,
  liveRuns as fmcgLiveRuns,
  topPerformer as fmcgTopPerformer,
  runs as fmcgRuns,
  runDetails as fmcgRunDetails,
  runExceptions as fmcgExceptions,
  runChases as fmcgChases,
  decisionLedger as fmcgLedger,
  leaderboardHighlights as fmcgHighlights,
  leaderboard as fmcgLeaderboard,
  outcomeReports as fmcgOutcomes,
} from './data.js';

// Industry-relevant agent catalogs (Agent Space). Each is scoped to its stream/mandates.
const fmcgAgents = [
  { agentId: 'fmcg-a-forecast-bias', state: 'live', name: 'Forecast Bias Agent', function: 'Demand & supply planning', capabilitiesCount: 4, dataInputs: 'Demand plan · POS · shipments', reviewGate: 'Human approval · step 4', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, guardrails: 'Planning pack · no auto-order over 2 weeks cover', estRuntime: '5–7 min', description: 'Detects systematic over/under-forecast by category and proposes replenishment corrections before fill rate slips.', industry: 'fnb', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Demand planning tool', 'Modern trade POS', 'ERP shipments'], outputsSummary: ['Bias report by category', 'Replenishment adjustments'], roiToDate: { label: 'Measured impact', value: '+AED 1.2M', direction: 'up' }, tokenCostToDate: { tokens: 380000, estCost: '$34.10' }, runsCount: 96, lastRunAt: '1h ago' },
  { agentId: 'fmcg-a-otif', state: 'live', name: 'OTIF Recovery Agent', function: 'Demand & supply planning', capabilitiesCount: 3, dataInputs: 'Order lines · DC stock', reviewGate: 'Human approval · allocation', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, guardrails: 'Cannot deprioritise a strategic account', estRuntime: '4–6 min', description: 'Predicts case-fill shortfalls and re-allocates constrained stock to protect on-time-in-full for key accounts.', industry: 'fnb', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['ERP order lines', 'DC stock snapshots'], outputsSummary: ['At-risk order list', 'Allocation plan'], roiToDate: { label: 'Penalties avoided', value: '+AED 640k', direction: 'up' }, tokenCostToDate: { tokens: 210000, estCost: '$19.40' }, runsCount: 141, lastRunAt: '3h ago' },
  { agentId: 'fmcg-a-coldchain', state: 'live', name: 'Cold-Chain Sentinel', function: 'Logistics & distribution', capabilitiesCount: 3, dataInputs: 'Reefer probes · routes', reviewGate: 'Auto-alert · no gate', owner: { name: 'Tariq Aziz', initials: 'TA', avatarBg: '#0F766E' }, guardrails: 'Read-only · escalates, never reroutes', estRuntime: '2–3 min', description: 'Watches refrigerated fleet temperature in transit, isolates recurring excursions to specific vehicles and lanes.', industry: 'fnb', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['Reefer temperature probes', 'TMS route logs'], outputsSummary: ['Excursion alerts', 'Vehicle risk ranking'], roiToDate: { label: 'Spoilage avoided', value: '+AED 310k', direction: 'up' }, tokenCostToDate: { tokens: 156000, estCost: '$14.20' }, runsCount: 220, lastRunAt: '20m ago' },
  { agentId: 'fmcg-a-tradespend', state: 'live', name: 'Trade-Spend ROI Agent', function: 'Finance · Commercial', capabilitiesCount: 4, dataInputs: 'Trade ledger · POS', reviewGate: 'Human approval · step 3', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, guardrails: 'Flags only · no spend commitments', estRuntime: '6–8 min', description: 'Links promotional spend to actual sell-out and flags promotions buying display instead of incremental volume.', industry: 'fnb', function2: 'finance', persona: 'commercial_finance', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Trade-spend ledger', 'Modern trade POS'], outputsSummary: ['ROI by promotion', 'Cut/keep recommendations'], roiToDate: { label: 'Measured impact', value: '+AED 480k', direction: 'up' }, tokenCostToDate: { tokens: 305000, estCost: '$28.60' }, runsCount: 74, lastRunAt: '5h ago' },
  { agentId: 'fmcg-a-osa', state: 'live', name: 'Shelf Availability Agent', function: 'Commercial & sales', capabilitiesCount: 3, dataInputs: 'POS · store audits', reviewGate: 'Human approval · step 2', owner: { name: 'Layla Nasser', initials: 'LN', avatarBg: '#0E7490' }, guardrails: 'Store-manager sign-off before rep dispatch', estRuntime: '3–5 min', description: 'Pinpoints on-shelf-availability gaps in top stores and the SKUs and time windows driving repeat stockouts.', industry: 'fnb', function2: 'sales', persona: 'store_manager', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Modern trade POS', 'Store audit app'], outputsSummary: ['Stockout heatmap', 'Store visit list'], roiToDate: { label: 'Recovered sales', value: '+AED 220k/mo', direction: 'up' }, tokenCostToDate: { tokens: 188000, estCost: '$17.30' }, runsCount: 132, lastRunAt: '2h ago' },
  { agentId: 'fmcg-a-waste', state: 'paused', name: 'Line Waste Agent', function: 'Manufacturing', capabilitiesCount: 3, dataInputs: 'Line sensors · material issues', reviewGate: 'Human approval · step 3', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, guardrails: 'No line-speed changes without plant sign-off', estRuntime: '4–6 min', description: 'Correlates waste and scrap with changeover frequency and start-up losses to isolate structural vs operator causes.', industry: 'fnb', function2: 'it', persona: 'operations_head', catalogStatus: 'paused', creationPath: 'studio', inputsSummary: ['Line sensor telemetry', 'ERP material issues'], outputsSummary: ['Waste driver breakdown', 'Changeover recommendations'], roiToDate: { label: 'Margin recovered', value: '+35 bps', direction: 'up' }, tokenCostToDate: { tokens: 142000, estCost: '$13.10' }, runsCount: 58, lastRunAt: '1d ago' },
];

// Loop speed by mandate (Performance screen): how fast drift on each mandate goes
// from detected → dispositioned → number back at target. Sorted fastest close first.
const fmcgLoopSpeed = [
  { id: 'fmcg-ls-osa', persona: 'sales_supervisor', mandate: 'On-shelf availability', stream: 'Commercial & sales', owner: { name: 'Layla Nasser', initials: 'LN', avatarBg: '#0E7490' }, counterpart: 'Commercial counterpart', findings90d: 4, medianTimeToDecide: '3.2h', medianTimeToClose: '6 days', closedInWindowPct: 86, trend: [16, 14, 12, 10, 8, 6], trendColor: '#16A34A' },
  { id: 'fmcg-ls-ppm', persona: 'operations_head', mandate: 'Complaints per million', stream: 'Quality & food safety', owner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D' }, counterpart: 'Quality counterpart', findings90d: 2, medianTimeToDecide: '4.5h', medianTimeToClose: '8 days', closedInWindowPct: 90, trend: [13, 12, 12, 10, 9, 8], trendColor: '#16A34A' },
  { id: 'fmcg-ls-fill', persona: 'operations_head', mandate: 'Case fill rate (OTIF)', stream: 'Demand & supply planning', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, counterpart: 'Planning counterpart', findings90d: 5, medianTimeToDecide: '9h', medianTimeToClose: '12 days', closedInWindowPct: 74, trend: [18, 17, 15, 14, 13, 12], trendColor: '#16A34A' },
  { id: 'fmcg-ls-mape', persona: 'operations_head', mandate: 'Forecast accuracy', stream: 'Demand & supply planning', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, counterpart: 'Planning counterpart', findings90d: 3, medianTimeToDecide: '14h', medianTimeToClose: '21 days', closedInWindowPct: 62, trend: [24, 23, 23, 22, 21, 21], trendColor: '#A8A29E' },
  { id: 'fmcg-ls-cold', persona: 'coo', mandate: 'Cold-chain excursions', stream: 'Logistics & distribution', owner: { name: 'Tariq Aziz', initials: 'TA', avatarBg: '#0F766E' }, counterpart: 'Logistics counterpart', findings90d: 3, medianTimeToDecide: '26h', medianTimeToClose: '24 days', closedInWindowPct: 55, trend: [20, 21, 22, 23, 23, 24], trendColor: '#D97706' },
  { id: 'fmcg-ls-waste', persona: 'operations_head', mandate: 'Waste & scrap', stream: 'Manufacturing', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, counterpart: 'Manufacturing counterpart', findings90d: 2, medianTimeToDecide: '18h', medianTimeToClose: '30 days', closedInWindowPct: 48, trend: [26, 27, 28, 29, 29, 30], trendColor: '#D97706' },
  { id: 'fmcg-ls-trade', persona: 'commercial_finance', mandate: 'Trade spend % of revenue', stream: 'Finance', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, counterpart: 'Finance counterpart', findings90d: 2, medianTimeToDecide: '31h', medianTimeToClose: '38 days', closedInWindowPct: 41, trend: [30, 32, 33, 35, 37, 38], trendColor: '#DC2626' },
];

const fmcg = {
  dashboardSummary: fmcgDashboard,
  pendingDecisions: fmcgPending,
  pulse: fmcgPulse,
  liveRuns: fmcgLiveRuns,
  topPerformer: fmcgTopPerformer,
  runs: fmcgRuns,
  runDetails: fmcgRunDetails,
  runExceptions: fmcgExceptions,
  runChases: fmcgChases,
  decisionLedger: fmcgLedger,
  leaderboardHighlights: fmcgHighlights,
  leaderboard: fmcgLeaderboard,
  loopSpeed: fmcgLoopSpeed,
  outcomeReports: fmcgOutcomes,
  agentCatalog: fmcgAgents,
};

// ---------------------------------------------------------------------------
// Healthcare
// ---------------------------------------------------------------------------
const hcAgents = [
  { agentId: 'hc-a-denial', state: 'live', name: 'Claims Denial Triage Agent', function: 'Revenue cycle', capabilitiesCount: 4, dataInputs: 'Claims · remits · denial codes', reviewGate: 'Human approval · appeal batch', owner: { name: 'James Okafor', initials: 'JO', avatarBg: '#B45309' }, guardrails: 'No auto-submit · human signs each appeal batch', estRuntime: '5–7 min', description: 'Clusters first-pass denials by payer and reason, drafts appeal packets and routes the batch for sign-off.', industry: 'healthcare', function2: 'finance', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Claims clearinghouse', 'Denial code library'], outputsSummary: ['Denial clusters', 'Draft appeal packets'], roiToDate: { label: 'Cash recovered', value: '+$2.1M', direction: 'up' }, tokenCostToDate: { tokens: 420000, estCost: '$39.00' }, runsCount: 210, lastRunAt: '1h ago' },
  { agentId: 'hc-a-noshow', state: 'live', name: 'Patient No-Show Predictor', function: 'Patient experience', capabilitiesCount: 3, dataInputs: 'Scheduling · history', reviewGate: 'Human approval · outreach list', owner: { name: 'Fatima Al Marri', initials: 'FA', avatarBg: '#BE185D' }, guardrails: 'Reminder cadence capped · opt-out honoured', estRuntime: '3–5 min', description: 'Scores upcoming appointments for no-show risk and triggers reminder and overbooking cohorts for specialty clinics.', industry: 'healthcare', function2: 'customer_success', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Scheduling system', 'Visit history'], outputsSummary: ['Risk-scored slots', 'Reminder cohort'], roiToDate: { label: 'Slots recovered', value: '+240/mo', direction: 'up' }, tokenCostToDate: { tokens: 190000, estCost: '$17.60' }, runsCount: 168, lastRunAt: '2h ago' },
  { agentId: 'hc-a-readmit', state: 'live', name: 'Readmission Risk Agent', function: 'Clinical operations', capabilitiesCount: 4, dataInputs: 'EMR · meds · social factors', reviewGate: 'Care-team review · always', owner: { name: 'Dr. Maya Suresh', initials: 'MS', avatarBg: '#0E7490' }, guardrails: 'Advisory only · never alters a care plan', estRuntime: '4–6 min', description: 'Scores each discharge against a 30-day readmission model and surfaces the drivers for the care team to act on.', industry: 'healthcare', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['EMR feed', 'Medication list'], outputsSummary: ['Risk cohort', 'Follow-up plan'], roiToDate: { label: 'Readmissions avoided', value: '−1.3 pts', direction: 'up' }, tokenCostToDate: { tokens: 260000, estCost: '$24.10' }, runsCount: 64, lastRunAt: '40m ago' },
  { agentId: 'hc-a-discharge', state: 'live', name: 'Discharge Flow Agent', function: 'Clinical operations', capabilitiesCount: 3, dataInputs: 'EMR · bed board', reviewGate: 'Human approval · step 3', owner: { name: 'Dr. Maya Suresh', initials: 'MS', avatarBg: '#0E7490' }, guardrails: 'Flags placement delays · no discharge decisions', estRuntime: '3–5 min', description: 'Predicts discharge-ready patients and the placement bottlenecks driving length of stay and bed pressure.', industry: 'healthcare', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['EMR feed', 'Bed board'], outputsSummary: ['Discharge-ready list', 'Bottleneck report'], roiToDate: { label: 'ALOS reduced', value: '−0.4 days', direction: 'up' }, tokenCostToDate: { tokens: 175000, estCost: '$16.20' }, runsCount: 121, lastRunAt: '3h ago' },
  { agentId: 'hc-a-medrec', state: 'live', name: 'Medication Reconciliation Agent', function: 'Pharmacy operations', capabilitiesCount: 4, dataInputs: 'Pharmacy · EMR orders', reviewGate: 'Pharmacist review · always', owner: { name: 'Ravi Menon', initials: 'RM', avatarBg: '#0F766E' }, guardrails: 'Pharmacist signs every flagged interaction', estRuntime: '4–6 min', description: 'Reconciles admission med lists against orders and flags interactions and duplications for pharmacist review.', industry: 'healthcare', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Pharmacy system', 'EMR orders'], outputsSummary: ['Interaction flags', 'Reconciled list'], roiToDate: { label: 'Errors prevented', value: '−0.5/1k doses', direction: 'up' }, tokenCostToDate: { tokens: 205000, estCost: '$19.00' }, runsCount: 143, lastRunAt: '6h ago' },
  { agentId: 'hc-a-coding', state: 'paused', name: 'Coding Audit Agent', function: 'Revenue cycle', capabilitiesCount: 3, dataInputs: 'Claims · coding rules', reviewGate: 'Human approval · step 2', owner: { name: 'James Okafor', initials: 'JO', avatarBg: '#B45309' }, guardrails: 'Suggests edits · coder confirms each', estRuntime: '5–7 min', description: 'Audits claims against payer edit rules before submission to lift the clean-claim rate and cut downstream denials.', industry: 'healthcare', function2: 'finance', persona: 'cfo', catalogStatus: 'paused', creationPath: 'studio', inputsSummary: ['Claims clearinghouse', 'Payer edit rules'], outputsSummary: ['Edit suggestions', 'Clean-claim forecast'], roiToDate: { label: 'Clean claim rate', value: '+4 pts', direction: 'up' }, tokenCostToDate: { tokens: 150000, estCost: '$13.90' }, runsCount: 52, lastRunAt: '1d ago' },
];

const healthcare = {
  agentCatalog: hcAgents,
  dashboardSummary: {
    greetingName: 'Kumara',
    summarySentence:
      'Since yesterday, Rewive executed <b style="color:var(--ink)">63 actions</b> across the revenue cycle and clinical ops. Your queue is below.',
  },
  pendingDecisions: [
    { id: 'hc-dec1', icon: '🧾', iconBg: 'var(--red-soft)', title: 'Denial surge · 2 payers changed prior-auth rules', subtitle: 'Revenue Cycle Agent recommends a batch appeal · ≈ $380k/mo at stake', actionLabel: 'Act', actionVerb: 'act', persona: 'cfo' },
    { id: 'hc-dec2', icon: '🛏️', iconBg: 'var(--amber-soft)', title: 'Discharge delays · 11 beds held on social-care placement', subtitle: 'Clinical Ops Agent proposes a discharge lounge · ALOS 4.9→4.5', actionLabel: 'Approve', actionVerb: 'approve', persona: 'operations_head' },
    { id: 'hc-dec3', icon: '📅', iconBg: 'var(--accent-soft)', title: 'No-show risk · 240 specialty slots at risk this month', subtitle: 'Patient Experience Agent · SMS + call reminder cohort ready', actionLabel: 'Release', actionVerb: 'release', persona: 'operations_head' },
    { id: 'hc-dec4', icon: '💊', iconBg: 'var(--teal-soft)', title: 'Biosimilar switch available · $210k/yr formulary saving', subtitle: 'Pharmacy Agent · clinically equivalent, needs P&T sign-off', actionLabel: 'Review', actionVerb: 'act', persona: 'cfo' },
  ],
  pulse: [
    { id: 'hc-p1', dotColor: 'var(--green)', html: '<b>Clean claim rate</b> recovered to <b>86%</b> after the coding-edit fix — denials down 2.1 pts.' },
    { id: 'hc-p2', dotColor: 'var(--accent)', html: '<b>Revenue cycle</b> is the fastest function: median appeal turnaround down from <b>9 days to 2 days</b>.' },
    { id: 'hc-p3', dotColor: 'var(--amber)', html: '<b>2 wards</b> are trending over safe nurse-to-patient ratios tonight. <span style="color:var(--accent);font-weight:600;cursor:pointer">Review staffing →</span>' },
  ],
  liveRuns: [
    { id: 'hc-run-readmit', persona: 'operations_head', name: 'Readmission risk · today’s discharges', eta: '~3 min left', percent: 66, stepDescription: 'Step 4 of 6 — scoring 88 discharges' },
    { id: 'hc-run-claims', persona: 'cfo', name: 'Overnight claims scrub', eta: '~2 min left', percent: 80, stepDescription: 'Step 5 of 6 — applying payer edits' },
    { id: 'hc-run-census', persona: 'operations_head', name: 'Bed capacity forecast · 72h', eta: 'finishing', percent: 92, barColor: 'var(--teal)', stepDescription: 'Step 6 of 6 — ward-level projection' },
  ],
  topPerformer: { id: 'hc-james', name: 'James Okafor', avatarBg: '#B45309', initials: 'JO', badge: '94% on-time', statLine: 'Closed 28 appeals · paired with Revenue Cycle Agent · recovered $1.1M' },
  runs: [
    { id: 'hc-run-readmit', persona: 'operations_head', name: 'Readmission risk · today’s discharges', owner: { name: 'Maya', initials: 'MS', avatarBg: '#0E7490' }, agentName: 'Clinical Risk Agent', status: 'running', duration: '5m 20s', outcome: '—' },
    { id: 'hc-run-claims', persona: 'cfo', name: 'Overnight claims scrub', owner: { name: 'James', initials: 'JO', avatarBg: '#B45309' }, agentName: 'Revenue Cycle Agent', status: 'running', duration: '7m 02s', outcome: '—' },
    { id: 'hc-run-denials', persona: 'cfo', name: 'Denial appeal batch · 2 payers', owner: { name: 'James', initials: 'JO', avatarBg: '#B45309' }, agentName: 'Revenue Cycle Agent', status: 'needs_decision', duration: 'paused 2h', outcome: '38 claims queued' },
    { id: 'hc-run-noshow', persona: 'operations_head', name: 'No-show reminder cohort', owner: { name: 'Fatima', initials: 'FA', avatarBg: '#BE185D' }, agentName: 'Patient Experience Agent', status: 'completed', duration: '4m 11s', outcome: '240 patients contacted' },
    { id: 'hc-run-medrec', persona: 'operations_head', name: 'Medication reconciliation · admissions', owner: { name: 'Ravi', initials: 'RM', avatarBg: '#0F766E' }, agentName: 'Pharmacy Agent', status: 'completed', duration: '6m 40s', outcome: '3 interactions flagged' },
    { id: 'hc-run-coding', persona: 'cfo', name: 'Coding audit · weekly', owner: { name: 'James', initials: 'JO', avatarBg: '#B45309' }, agentName: 'Coding Audit Agent', status: 'failed', duration: '0m 38s', outcome: 'EMR export timeout · retried ✓' },
  ],
  runDetails: {
    'hc-run-readmit': {
      id: 'hc-run-readmit', persona: 'operations_head', name: 'Readmission risk — today’s discharges', meta: 'Clinical Risk Agent · started 08:40 by Maya · est. finish 08:49', isLive: true,
      steps: [
        { id: 's1', status: 'done', label: 'Pull discharge list', description: '88 discharges · EMR feed · comorbidities joined', duration: '0m 54s' },
        { id: 's2', status: 'done', label: 'Feature build', description: 'Prior admissions, meds, social factors, LACE index', duration: '1m 22s' },
        { id: 's3', status: 'live', label: 'Risk scoring', description: 'Scoring each discharge against the 30-day model…', duration: 'running' },
        { id: 's4', status: 'gate', label: 'Review gate — high-risk cohort', description: 'Will pause for the care team before outreach', duration: 'waiting' },
        { id: 's5', status: 'wait', icon: '5', label: 'Publish risk scorecard', description: 'Cohort list, drivers, recommended follow-up', duration: '—' },
      ],
    },
  },
  runExceptions: [
    { id: 'hc-exc1', runId: 'hc-run-coding', runName: 'Coding audit · weekly', severity: 'error', message: 'EMR bulk export timed out after 3 retries — run failed.', status: 'open', createdAt: '2h ago' },
    { id: 'hc-exc2', runId: 'hc-run-denials', runName: 'Denial appeal batch · 2 payers', severity: 'warning', message: 'Agent is unsure which appeal template fits 4 edge-case denials — needs your input.', status: 'open', createdAt: '2h ago' },
  ],
  runChases: [
    { id: 'hc-chase1', runId: 'hc-run-denials', runName: 'Denial appeal batch · 2 payers', trigger: 'sla', note: 'Appeal batch has waited 2h with no sign-off — filing deadline is in 36h.', escalatedTo: 'Revenue cycle director', createdAt: '40m ago' },
  ],
  // decisionStats derived server-side — see mock-server/halfyear.js.
  decisionLedger: [
    { id: 'hc-led1', persona: 'cfo', title: 'Batch-appeal denied claims (2 payers)', subtitle: 'Prior-auth denial surge, May', madeBy: { type: 'human', name: 'James', initials: 'JO', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Revenue Cycle Agent' }, date: '12 May', verdict: 'worked', measuredImpact: { text: '+$620k recovered', direction: 'up' }, function: 'finance', findingId: 'hc-f-1', assessorNote: 'Assessor agent: first-pass denial rate for the two payers fell from 11.8% to 7.4% over six weeks — confirmed against the same clearinghouse feed that raised the finding.', entity: 'Metro General Hospital', region: 'Northeast' },
    { id: 'hc-led2', persona: 'operations_head', title: 'Open a discharge lounge on medical wards', subtitle: 'ALOS driver — placement delays', madeBy: { type: 'human', name: 'Maya', initials: 'MS', avatarBg: '#0E7490' }, informedBy: { type: 'agent', name: 'Clinical Ops Agent' }, date: '30 Apr', verdict: 'worked', measuredImpact: { text: '−0.4 days ALOS', direction: 'up' }, function: 'operations', entity: 'Metro General Hospital', region: 'Northeast' },
    { id: 'hc-led3', persona: 'operations_head', title: 'SMS + call reminders for high-risk no-shows', subtitle: 'Specialty clinics pilot', madeBy: { type: 'human', name: 'Fatima', initials: 'FA', avatarBg: '#BE185D' }, informedBy: { type: 'agent', name: 'Patient Experience Agent' }, date: '22 Apr', verdict: 'too_early', measuredImpact: { text: 'measuring…', direction: 'flat' }, function: 'operations', entity: 'Northside Clinics', region: 'Midwest' },
    { id: 'hc-led4', persona: 'cfo', title: 'Switch to biosimilar for infusion therapy', subtitle: 'Formulary review Q2', madeBy: { type: 'human', name: 'Ravi', initials: 'RM', avatarBg: '#0F766E' }, informedBy: { type: 'agent', name: 'Pharmacy Agent' }, date: '15 Apr', verdict: 'worked', measuredImpact: { text: '+$210k/yr', direction: 'up' }, function: 'pharmacy', entity: 'Metro General Hospital', region: 'Northeast' },
    { id: 'hc-led6', persona: 'operations_head', title: 'Accept — tighten Lakeside OR block release rules', subtitle: 'Block utilization stuck below 65% through Q1', madeBy: { type: 'human', name: 'Maya', initials: 'MS', avatarBg: '#0E7490' }, informedBy: { type: 'agent', name: 'Clinical ops counterpart' }, date: '06 Mar', verdict: 'worked', measuredImpact: { text: '+$1.1M OR revenue / qtr', direction: 'up' }, function: 'operations', findingId: 'hc-f-h1', assessorNote: 'Assessor agent: utilization held above 75% for four straight weeks after the block-release change — loop closed 15 May.', entity: 'Lakeside Surgical Center', region: 'South' },
    { id: 'hc-led7', persona: 'cfo', title: 'Accept — registration eligibility checklist + auto-verify', subtitle: 'February denial episode, two clinics', madeBy: { type: 'human', name: 'James', initials: 'JO', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Revenue cycle counterpart' }, date: '09 Feb', verdict: 'worked', measuredImpact: { text: '−2.1 pts denial rate', direction: 'up' }, function: 'finance', findingId: 'hc-f-0', assessorNote: 'Assessor agent: denial rate held under 8.5% for six weeks after the registration fix — loop closed 10 Apr.', entity: 'Metro General Hospital', region: 'Northeast' },
    { id: 'hc-led5', persona: 'cfo', title: 'Auto-verify eligibility < $300 self-pay', subtitle: 'Process decision · agent autonomous', madeBy: { type: 'agent', name: 'Revenue Cycle Agent' }, informedBy: { type: 'policy', name: 'policy' }, date: 'ongoing', verdict: 'worked', measuredImpact: { text: '18h / month saved', direction: 'up' }, function: 'finance', entity: 'Metro General Hospital', region: 'Northeast' },
  ],
  leaderboardHighlights: [
    { id: 'hc-h1', medal: '🥇', tag: 'Most effective · people', name: 'James Okafor', avatarBg: '#B45309', initials: 'JO', statLine: '28 appeals · 94% on-time · $1.1M recovered' },
    { id: 'hc-h2', medal: '🤖', tag: 'Top agent', name: 'Revenue Cycle Agent', avatarBg: '#4F46E5', initials: 'RC', statLine: '210 runs · 98.6% success · $2.1M recovered' },
    { id: 'hc-h3', medal: '⚡', tag: 'Best human + agent pair', name: 'Maya + Clinical Ops Agent', avatarBg: '#0E7490', initials: 'MS', statLine: 'ALOS 5.4 → 4.6 days' },
  ],
  leaderboard: [
    { id: 'hc-l1', persona: 'cfo', type: 'human', name: 'James Okafor', initials: 'JO', avatarBg: '#B45309', actionsClosed: 28, onTimePct: 94, decisionWinRatePct: 80, timeSaved: '14h', trend: [15, 12, 13, 9, 6, 3], trendColor: '#16A34A' },
    { id: 'hc-l2', persona: 'cfo', type: 'agent', name: 'Revenue Cycle Agent', initials: 'RC', avatarBg: '#4F46E5', actionsClosed: 210, onTimePct: 98.6, decisionWinRatePct: 79, timeSaved: '88h', trend: [16, 13, 11, 10, 7, 4], trendColor: '#16A34A' },
    { id: 'hc-l3', persona: 'operations_head', type: 'human', name: 'Dr. Maya Suresh', initials: 'MS', avatarBg: '#0E7490', actionsClosed: 24, onTimePct: 90, decisionWinRatePct: 86, timeSaved: '9h', trend: [13, 11, 12, 8, 8, 5], trendColor: '#16A34A' },
    { id: 'hc-l4', persona: 'operations_head', type: 'human', name: 'Fatima Al Marri', initials: 'FA', avatarBg: '#BE185D', actionsClosed: 17, onTimePct: 88, decisionWinRatePct: 72, timeSaved: '6h', trend: [10, 12, 9, 11, 8, 7], trendColor: '#D97706' },
    { id: 'hc-l5', persona: 'operations_head', type: 'agent', name: 'Clinical Risk Agent', initials: 'CR', avatarBg: '#4F46E5', actionsClosed: 64, onTimePct: 97, decisionWinRatePct: 71, timeSaved: '31h', trend: [8, 10, 7, 9, 10, 8], trendColor: '#A8A29E' },
    { id: 'hc-l6', persona: 'operations_head', type: 'human', name: 'Ravi Menon', initials: 'RM', avatarBg: '#0F766E', actionsClosed: 15, onTimePct: 86, decisionWinRatePct: 73, timeSaved: '5h', trend: [12, 10, 13, 10, 9, 9], trendColor: '#A8A29E' },
  ],
  loopSpeed: [
    { id: 'hc-ls-denial', persona: 'cfo', mandate: 'Claim denial rate', stream: 'Revenue cycle', owner: { name: 'James Okafor', initials: 'JO', avatarBg: '#B45309' }, counterpart: 'Revenue cycle counterpart', findings90d: 4, medianTimeToDecide: '4h', medianTimeToClose: '9 days', closedInWindowPct: 84, trend: [22, 19, 16, 13, 11, 9], trendColor: '#16A34A' },
    { id: 'hc-ls-noshow', persona: 'operations_head', mandate: 'No-show rate', stream: 'Patient experience', owner: { name: 'Fatima Al Marri', initials: 'FA', avatarBg: '#BE185D' }, counterpart: 'Patient experience counterpart', findings90d: 3, medianTimeToDecide: '7h', medianTimeToClose: '14 days', closedInWindowPct: 76, trend: [20, 19, 17, 16, 15, 14], trendColor: '#16A34A' },
    { id: 'hc-ls-cleanclaim', persona: 'cfo', mandate: 'Clean claim rate', stream: 'Revenue cycle', owner: { name: 'James Okafor', initials: 'JO', avatarBg: '#B45309' }, counterpart: 'Revenue cycle counterpart', findings90d: 3, medianTimeToDecide: '11h', medianTimeToClose: '16 days', closedInWindowPct: 70, trend: [21, 20, 19, 18, 17, 16], trendColor: '#16A34A' },
    { id: 'hc-ls-alos', persona: 'operations_head', mandate: 'Average length of stay', stream: 'Clinical operations', owner: { name: 'Dr. Maya Suresh', initials: 'MS', avatarBg: '#0E7490' }, counterpart: 'Clinical ops counterpart', findings90d: 2, medianTimeToDecide: '16h', medianTimeToClose: '25 days', closedInWindowPct: 60, trend: [28, 27, 27, 26, 25, 25], trendColor: '#A8A29E' },
    { id: 'hc-ls-mederror', persona: 'operations_head', mandate: 'Medication error rate', stream: 'Pharmacy operations', owner: { name: 'Ravi Menon', initials: 'RM', avatarBg: '#0F766E' }, counterpart: 'Pharmacy counterpart', findings90d: 1, medianTimeToDecide: '9h', medianTimeToClose: '28 days', closedInWindowPct: 58, trend: [30, 29, 29, 28, 28, 28], trendColor: '#A8A29E' },
    { id: 'hc-ls-agency', persona: 'coo', mandate: 'Agency staffing %', stream: 'People', owner: { name: 'Noura Khalid', initials: 'NK', avatarBg: '#C2410C' }, counterpart: 'People counterpart', findings90d: 2, medianTimeToDecide: '29h', medianTimeToClose: '41 days', closedInWindowPct: 39, trend: [33, 35, 36, 38, 40, 41], trendColor: '#DC2626' },
  ],
  outcomeReports: {
    latest: {
      runId: 'latest', title: 'Revenue Cycle Outcome — May 2026', runMeta: 'Revenue Cycle Agent · run completed in 7m 12s · approved by James', published: true,
      scoreCards: [
        { id: 'sc1', label: 'Days in AR', value: '48', deltaLabel: '▼ 6 days vs plan', deltaTone: 'green', sparkline: [22, 20, 21, 17, 16, 13, 11, 9], sparklineColor: '#16A34A' },
        { id: 'sc2', label: 'Denial rate', value: '9.2%', deltaLabel: '▲ 2.2 pts vs target', deltaTone: 'red', sparkline: [8, 10, 9, 13, 12, 17, 19, 22], sparklineColor: '#DC2626' },
        { id: 'sc3', label: 'Clean claim rate', value: '86%', deltaLabel: '▲ recovering', deltaTone: 'green', sparkline: [15, 14, 16, 14, 15, 13, 14, 13], sparklineColor: '#16A34A' },
        { id: 'sc4', label: 'POS collections', value: '48%', deltaLabel: '◷ watch', deltaTone: 'amber', sparkline: [18, 16, 17, 14, 16, 13, 15, 12], sparklineColor: '#D97706' },
      ],
      insights: [
        { id: 'i1', icon: '🎯', iconBg: 'var(--red-soft)', title: 'Denials are concentrated in two payers', text: '78% of the denial step comes from two payers that changed prior-authorization rules in April — a rules problem, not a coding one.' },
        { id: 'i2', icon: '📉', iconBg: 'var(--amber-soft)', title: 'Clean claim rate drives AR days', text: 'Every point of clean-claim rate is worth roughly 1.5 days of AR — the coding-edit backlog is the lever.' },
        { id: 'i3', icon: '💡', iconBg: 'var(--green-soft)', title: 'Point-of-service collection is the quiet win', text: 'Lifting POS collections from 48% to 60% would pull ≈$1.4M forward with no impact on patients already covered.' },
        { id: 'i4', icon: '🔁', iconBg: 'var(--teal-soft)', title: 'The batch-appeal decision is confirmed', text: 'The two-payer appeal batch (Decision Ledger, 12 May) recovered +$620k — verdict updated to "Worked".' },
      ],
      actions: [
        { id: 'a1', title: 'Automate prior-auth checks for the two payers', subtitle: 'Est. −3 pts denial rate · owner suggested: James', assigned: false, assignedTo: 'James', actionType: 'assign' },
        { id: 'a2', title: 'Add POS collection prompts at registration', subtitle: 'Est. +$1.4M pulled forward · owner: Fatima', assigned: false, assignedTo: 'Fatima', actionType: 'assign' },
        { id: 'a3', title: 'Re-run the scrub with June remit data', subtitle: 'Scheduled run · 1 July 07:00', assigned: false, actionType: 'schedule' },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Manufacturing
// ---------------------------------------------------------------------------
const mfgAgents = [
  { agentId: 'mfg-a-predmaint', state: 'live', name: 'Predictive Maintenance Agent', function: 'Maintenance', capabilitiesCount: 4, dataInputs: 'CMMS · vibration · runtime', reviewGate: 'Human approval · PM schedule', owner: { name: 'Hassan Jaber', initials: 'HJ', avatarBg: '#B45309' }, guardrails: 'Proposes PMs · planner releases work orders', estRuntime: '5–7 min', description: 'Predicts bearing and hydraulic failures on constrained assets and pulls preventive work forward before breakdown.', industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['CMMS work orders', 'Vibration sensors'], outputsSummary: ['Failure risk ranking', 'PM schedule'], roiToDate: { label: 'Downtime avoided', value: '−14 h/wk', direction: 'up' }, tokenCostToDate: { tokens: 340000, estCost: '$31.50' }, runsCount: 178, lastRunAt: '1h ago' },
  { agentId: 'mfg-a-oee', state: 'live', name: 'OEE Loss Analyst', function: 'Production', capabilitiesCount: 3, dataInputs: 'MES telemetry', reviewGate: 'Shift-lead review · step 4', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, guardrails: 'No line-speed changes without sign-off', estRuntime: '4–6 min', description: 'Decomposes shift OEE into availability, performance and quality losses and ranks the top recoverable causes.', industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['MES historian'], outputsSummary: ['Loss tree', 'Top-3 actions'], roiToDate: { label: 'OEE gained', value: '+4 pts', direction: 'up' }, tokenCostToDate: { tokens: 220000, estCost: '$20.40' }, runsCount: 132, lastRunAt: '2h ago' },
  { agentId: 'mfg-a-supotif', state: 'live', name: 'Supplier OTIF Agent', function: 'Supplier network', capabilitiesCount: 3, dataInputs: 'PO lines · receipts', reviewGate: 'Human approval · dual-source', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#0E7490' }, guardrails: 'Recommends only · no PO commitments', estRuntime: '4–6 min', description: 'Ranks suppliers by on-time-in-full and isolates the few vendors gating the majority of late customer orders.', industry: 'manufacturing', function2: 'procurement', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['ERP purchase orders', 'Supplier promise dates'], outputsSummary: ['Supplier scorecard', 'Dual-source shortlist'], roiToDate: { label: 'OTIF gained', value: '+9 pts', direction: 'up' }, tokenCostToDate: { tokens: 180000, estCost: '$16.70' }, runsCount: 98, lastRunAt: '4h ago' },
  { agentId: 'mfg-a-scrap', state: 'live', name: 'Scrap Root-Cause Agent', function: 'Quality', capabilitiesCount: 4, dataInputs: 'QC inspections · MES', reviewGate: 'Human approval · step 3', owner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D' }, guardrails: 'No tooling changes without quality sign-off', estRuntime: '5–7 min', description: 'Traces scrap spikes to part families, tooling and process windows to separate defects from operator variation.', industry: 'manufacturing', function2: 'it', persona: 'store_manager', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['QC inspections', 'MES telemetry'], outputsSummary: ['Root-cause report', 'Containment actions'], roiToDate: { label: 'Scrap reduced', value: '−0.8 pt', direction: 'up' }, tokenCostToDate: { tokens: 240000, estCost: '$22.30' }, runsCount: 76, lastRunAt: '5h ago' },
  { agentId: 'mfg-a-changeover', state: 'live', name: 'Changeover SMED Agent', function: 'Production', capabilitiesCount: 3, dataInputs: 'MES · changeover logs', reviewGate: 'Shift-lead review', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, guardrails: 'Advisory · crew confirms sequence', estRuntime: '3–5 min', description: 'Breaks changeovers into internal and external steps and proposes a shorter, standardized sequence per SKU pair.', industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['MES telemetry', 'Changeover logs'], outputsSummary: ['SMED playbook', 'Time-saving estimate'], roiToDate: { label: 'Changeover cut', value: '−12 min', direction: 'up' }, tokenCostToDate: { tokens: 150000, estCost: '$13.90' }, runsCount: 61, lastRunAt: '1d ago' },
  { agentId: 'mfg-a-energy', state: 'paused', name: 'Energy-per-Unit Agent', function: 'Production · Finance', capabilitiesCount: 3, dataInputs: 'Meters · production counts', reviewGate: 'Human approval · step 2', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, guardrails: 'Flags only · no equipment control', estRuntime: '3–4 min', description: 'Tracks energy consumed per unit and flags compressor leaks and idle-running equipment eroding unit cost.', industry: 'manufacturing', function2: 'finance', persona: 'cfo', catalogStatus: 'paused', creationPath: 'studio', inputsSummary: ['Energy meters', 'Production counts'], outputsSummary: ['Energy-per-unit trend', 'Leak/idle flags'], roiToDate: { label: 'Unit cost', value: '−1.2%', direction: 'up' }, tokenCostToDate: { tokens: 120000, estCost: '$11.10' }, runsCount: 44, lastRunAt: '2d ago' },
];

const manufacturing = {
  agentCatalog: mfgAgents,
  dashboardSummary: {
    greetingName: 'Kumara',
    summarySentence:
      'Since yesterday, Rewive executed <b style="color:var(--ink)">71 actions</b> across production and maintenance. Your queue is below.',
  },
  pendingDecisions: [
    { id: 'mfg-dec1', icon: '🛠️', iconBg: 'var(--red-soft)', title: 'Press line · PM overdue, breakdown risk in 5 days', subtitle: 'Maintenance Agent recommends pulling PMs forward · 22h/wk downtime at stake', actionLabel: 'Act', actionVerb: 'act', persona: 'operations_head' },
    { id: 'mfg-dec2', icon: '📦', iconBg: 'var(--amber-soft)', title: 'Castings supplier · 2 vendors gate 60% of late orders', subtitle: 'Supplier Agent proposes dual-sourcing · OTIF 84%→95%', actionLabel: 'Approve', actionVerb: 'approve', persona: 'cfo' },
    { id: 'mfg-dec3', icon: '🔧', iconBg: 'var(--teal-soft)', title: 'B-housing scrap doubled after tooling refresh', subtitle: 'Production Agent · vendor inspection report ready for review', actionLabel: 'Review', actionVerb: 'act', persona: 'store_manager' },
  ],
  pulse: [
    { id: 'mfg-p1', dotColor: 'var(--green)', html: '<b>OEE</b> on the constraint line up <b>4 pts</b> after the changeover-standardization pilot.' },
    { id: 'mfg-p2', dotColor: 'var(--accent)', html: '<b>Maintenance</b> is the fastest to act: median work-order turnaround down from <b>3 days to 8 hours</b>.' },
    { id: 'mfg-p3', dotColor: 'var(--amber)', html: '<b>Near-miss reporting</b> is below target on 2 shifts. <span style="color:var(--accent);font-weight:600;cursor:pointer">Review safety →</span>' },
  ],
  liveRuns: [
    { id: 'mfg-run-oee', persona: 'operations_head', name: 'OEE loss analysis · Line 3 shift', eta: '~3 min left', percent: 64, stepDescription: 'Step 4 of 6 — Pareto of stop reasons' },
    { id: 'mfg-run-pm', persona: 'operations_head', name: 'PM schedule optimizer · week 28', eta: '~2 min left', percent: 78, stepDescription: 'Step 5 of 6 — sequencing against production' },
    { id: 'mfg-run-supplier', persona: 'cfo', name: 'Supplier OTIF scorecard', eta: 'finishing', percent: 91, barColor: 'var(--teal)', stepDescription: 'Step 6 of 6 — ranking by gated orders' },
  ],
  topPerformer: { id: 'mfg-hassan', name: 'Hassan Jaber', avatarBg: '#B45309', initials: 'HJ', badge: '93% on-time', statLine: 'Closed 26 work orders · paired with Maintenance Agent · 19h downtime avoided' },
  runs: [
    { id: 'mfg-run-oee', persona: 'operations_head', name: 'OEE loss analysis · Line 3 shift', owner: { name: 'Priya', initials: 'PR', avatarBg: '#7C3AED' }, agentName: 'Production Agent', status: 'running', duration: '5m 05s', outcome: '—' },
    { id: 'mfg-run-pm', persona: 'operations_head', name: 'PM schedule optimizer · week 28', owner: { name: 'Hassan', initials: 'HJ', avatarBg: '#B45309' }, agentName: 'Maintenance Agent', status: 'running', duration: '6m 30s', outcome: '—' },
    { id: 'mfg-run-supplier', persona: 'cfo', name: 'Supplier OTIF scorecard', owner: { name: 'Omar', initials: 'OF', avatarBg: '#0E7490' }, agentName: 'Supplier Agent', status: 'needs_decision', duration: 'paused 2h', outcome: '2 vendors flagged' },
    { id: 'mfg-run-scrap', persona: 'store_manager', name: 'Scrap root-cause · B-housing', owner: { name: 'Amira', initials: 'AH', avatarBg: '#BE185D' }, agentName: 'Quality Agent', status: 'completed', duration: '7m 18s', outcome: 'tooling defect confirmed' },
    { id: 'mfg-run-energy', persona: 'cfo', name: 'Energy-per-unit scan · daily', owner: { name: 'Priya', initials: 'PR', avatarBg: '#7C3AED' }, agentName: 'Production Agent', status: 'completed', duration: '3m 12s', outcome: '1 flag · compressor leak' },
    { id: 'mfg-run-spares', persona: 'operations_head', name: 'Spare-parts reorder · weekly', owner: { name: 'Hassan', initials: 'HJ', avatarBg: '#B45309' }, agentName: 'Maintenance Agent', status: 'failed', duration: '0m 44s', outcome: 'ERP timeout · retried ✓' },
  ],
  runDetails: {
    'mfg-run-oee': {
      id: 'mfg-run-oee', persona: 'operations_head', name: 'OEE loss analysis — Line 3, night shift', meta: 'Production Agent · started 22:10 by Priya · est. finish 22:19', isLive: true,
      steps: [
        { id: 's1', status: 'done', label: 'Pull machine telemetry', description: 'MES historian · 8h shift · counts, speeds, stops', duration: '1m 02s' },
        { id: 's2', status: 'done', label: 'Classify losses', description: 'Availability, performance, quality split by reason code', duration: '1m 40s' },
        { id: 's3', status: 'live', label: 'Pareto of stop reasons', description: 'Ranking downtime by cause and changeover…', duration: 'running' },
        { id: 's4', status: 'gate', label: 'Review gate — top-3 actions', description: 'Will pause for the shift lead before logging', duration: 'waiting' },
        { id: 's5', status: 'wait', icon: '5', label: 'Publish OEE scorecard', description: 'Loss tree, drivers, recommended actions', duration: '—' },
      ],
    },
  },
  runExceptions: [
    { id: 'mfg-exc1', runId: 'mfg-run-spares', runName: 'Spare-parts reorder · weekly', severity: 'error', message: 'ERP purchase-order API timed out after 3 retries — run failed.', status: 'open', createdAt: '2h ago' },
    { id: 'mfg-exc2', runId: 'mfg-run-supplier', runName: 'Supplier OTIF scorecard', severity: 'warning', message: 'Agent is unsure how to weight 3 partial deliveries — needs your input.', status: 'open', createdAt: '3h ago' },
  ],
  runChases: [
    { id: 'mfg-chase1', runId: 'mfg-run-supplier', runName: 'Supplier OTIF scorecard', trigger: 'sla', note: 'Dual-sourcing decision has waited 2h — the castings shortage hits final assembly Thursday.', escalatedTo: 'Supply chain manager', createdAt: '55m ago' },
  ],
  // decisionStats derived server-side — see mock-server/halfyear.js.
  decisionLedger: [
    { id: 'mfg-led1', persona: 'operations_head', title: 'Pull PMs forward on the press line', subtitle: 'Unplanned downtime driver, Q2', madeBy: { type: 'human', name: 'Hassan', initials: 'HJ', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Maintenance Agent' }, date: '12 May', verdict: 'worked', measuredImpact: { text: '−14 h/wk downtime', direction: 'up' }, function: 'maintenance', findingId: 'mfg-f-1', assessorNote: 'Assessor agent: unplanned downtime on the constraint line fell from 22 h/wk to 9 h/wk within four weeks of restoring PM compliance — confirmed against the same CMMS work-order feed.', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
    { id: 'mfg-led2', persona: 'cfo', title: 'Dual-source two castings suppliers', subtitle: 'OTIF slide root cause', madeBy: { type: 'human', name: 'Omar', initials: 'OF', avatarBg: '#0E7490' }, informedBy: { type: 'agent', name: 'Supplier Agent' }, date: '29 Apr', verdict: 'worked', measuredImpact: { text: '+9 pts OTIF', direction: 'up' }, function: 'procurement', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
    { id: 'mfg-led3', persona: 'operations_head', title: 'Standardize changeovers on Line 3', subtitle: 'SMED pilot', madeBy: { type: 'human', name: 'Priya', initials: 'PR', avatarBg: '#7C3AED' }, informedBy: { type: 'agent', name: 'Production Agent' }, date: '21 Apr', verdict: 'too_early', measuredImpact: { text: 'measuring…', direction: 'flat' }, function: 'operations', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
    { id: 'mfg-led4', persona: 'store_manager', title: 'Return B-housing tooling to vendor', subtitle: 'Scrap spike after refresh', madeBy: { type: 'human', name: 'Amira', initials: 'AH', avatarBg: '#BE185D' }, informedBy: { type: 'agent', name: 'Quality Agent' }, date: '15 Apr', verdict: 'worked', measuredImpact: { text: '−0.8 pt scrap', direction: 'up' }, function: 'quality', entity: 'Plant 2 — Dammam', region: 'KSA' },
    { id: 'mfg-led5', persona: 'cfo', title: 'Auto-release POs under $1k to approved vendors', subtitle: 'Process decision · agent autonomous', madeBy: { type: 'agent', name: 'Maintenance Agent' }, informedBy: { type: 'policy', name: 'policy' }, date: 'ongoing', verdict: 'worked', measuredImpact: { text: '15h / month saved', direction: 'up' }, function: 'procurement', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
  ],
  leaderboardHighlights: [
    { id: 'mfg-h1', medal: '🥇', tag: 'Most effective · people', name: 'Hassan Jaber', avatarBg: '#B45309', initials: 'HJ', statLine: '26 work orders · 93% on-time · 19h downtime avoided' },
    { id: 'mfg-h2', medal: '🤖', tag: 'Top agent', name: 'Maintenance Agent', avatarBg: '#4F46E5', initials: 'MA', statLine: '178 runs · 98.1% success · $1.4M avoided' },
    { id: 'mfg-h3', medal: '⚡', tag: 'Best human + agent pair', name: 'Priya + Production Agent', avatarBg: '#7C3AED', initials: 'PR', statLine: 'OEE 64% → 71%' },
  ],
  leaderboard: [
    { id: 'mfg-l1', persona: 'operations_head', type: 'human', name: 'Hassan Jaber', initials: 'HJ', avatarBg: '#B45309', actionsClosed: 26, onTimePct: 93, decisionWinRatePct: 82, timeSaved: '13h', trend: [15, 12, 13, 9, 6, 3], trendColor: '#16A34A' },
    { id: 'mfg-l2', persona: 'operations_head', type: 'agent', name: 'Maintenance Agent', initials: 'MA', avatarBg: '#4F46E5', actionsClosed: 178, onTimePct: 98.1, decisionWinRatePct: 78, timeSaved: '76h', trend: [16, 13, 11, 10, 7, 4], trendColor: '#16A34A' },
    { id: 'mfg-l3', persona: 'operations_head', type: 'human', name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED', actionsClosed: 23, onTimePct: 91, decisionWinRatePct: 85, timeSaved: '10h', trend: [13, 11, 12, 8, 8, 5], trendColor: '#16A34A' },
    { id: 'mfg-l4', persona: 'cfo', type: 'human', name: 'Omar Farouk', initials: 'OF', avatarBg: '#0E7490', actionsClosed: 18, onTimePct: 88, decisionWinRatePct: 73, timeSaved: '6h', trend: [10, 12, 9, 11, 8, 7], trendColor: '#D97706' },
    { id: 'mfg-l5', persona: 'operations_head', type: 'agent', name: 'Production Agent', initials: 'PA', avatarBg: '#4F46E5', actionsClosed: 61, onTimePct: 97, decisionWinRatePct: 70, timeSaved: '30h', trend: [8, 10, 7, 9, 10, 8], trendColor: '#A8A29E' },
    { id: 'mfg-l6', persona: 'store_manager', type: 'human', name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D', actionsClosed: 16, onTimePct: 86, decisionWinRatePct: 74, timeSaved: '5h', trend: [12, 10, 13, 10, 9, 9], trendColor: '#A8A29E' },
  ],
  loopSpeed: [
    { id: 'mfg-ls-unplanned', persona: 'operations_head', mandate: 'Unplanned downtime', stream: 'Maintenance', owner: { name: 'Hassan Jaber', initials: 'HJ', avatarBg: '#B45309' }, counterpart: 'Maintenance counterpart', findings90d: 3, medianTimeToDecide: '5h', medianTimeToClose: '8 days', closedInWindowPct: 82, trend: [20, 17, 14, 12, 10, 8], trendColor: '#16A34A' },
    { id: 'mfg-ls-scrap', persona: 'operations_head', mandate: 'Scrap rate', stream: 'Production', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, counterpart: 'Production counterpart', findings90d: 3, medianTimeToDecide: '8h', medianTimeToClose: '13 days', closedInWindowPct: 73, trend: [19, 18, 16, 15, 14, 13], trendColor: '#16A34A' },
    { id: 'mfg-ls-supotd', persona: 'cfo', mandate: 'Supplier OTIF', stream: 'Supplier network', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#0E7490' }, counterpart: 'Supplier network counterpart', findings90d: 2, medianTimeToDecide: '13h', medianTimeToClose: '22 days', closedInWindowPct: 64, trend: [26, 25, 24, 24, 23, 22], trendColor: '#16A34A' },
    { id: 'mfg-ls-fpy', persona: 'store_manager', mandate: 'First-pass yield', stream: 'Quality', owner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D' }, counterpart: 'Quality counterpart', findings90d: 2, medianTimeToDecide: '15h', medianTimeToClose: '26 days', closedInWindowPct: 57, trend: [27, 27, 26, 26, 26, 26], trendColor: '#A8A29E' },
    { id: 'mfg-ls-costvar', persona: 'cfo', mandate: 'Cost variance vs standard', stream: 'Finance', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, counterpart: 'Finance counterpart', findings90d: 2, medianTimeToDecide: '24h', medianTimeToClose: '34 days', closedInWindowPct: 45, trend: [29, 30, 31, 32, 33, 34], trendColor: '#D97706' },
    { id: 'mfg-ls-nearmiss', persona: 'coo', mandate: 'Near-miss reporting', stream: 'Safety', owner: { name: 'Noura Khalid', initials: 'NK', avatarBg: '#C2410C' }, counterpart: 'Safety counterpart', findings90d: 1, medianTimeToDecide: '36h', medianTimeToClose: '44 days', closedInWindowPct: 35, trend: [36, 38, 39, 41, 43, 44], trendColor: '#DC2626' },
  ],
  outcomeReports: {
    latest: {
      runId: 'latest', title: 'Production Outcome — May 2026', runMeta: 'Production Agent · run completed in 7m 44s · approved by Priya', published: true,
      scoreCards: [
        { id: 'sc1', label: 'OEE', value: '71%', deltaLabel: '▲ 4 pts vs last month', deltaTone: 'green', sparkline: [9, 11, 10, 14, 15, 18, 20, 22], sparklineColor: '#16A34A' },
        { id: 'sc2', label: 'Unplanned downtime', value: '9 h/wk', deltaLabel: '▼ 13h vs plan', deltaTone: 'green', sparkline: [22, 20, 18, 15, 13, 11, 10, 9], sparklineColor: '#16A34A' },
        { id: 'sc3', label: 'Scrap rate', value: '3.1%', deltaLabel: '▲ 1.1 pts vs target', deltaTone: 'red', sparkline: [8, 10, 9, 13, 12, 17, 19, 22], sparklineColor: '#DC2626' },
        { id: 'sc4', label: 'Supplier OTIF', value: '84%', deltaLabel: '◷ watch', deltaTone: 'amber', sparkline: [18, 16, 17, 14, 16, 13, 15, 12], sparklineColor: '#D97706' },
      ],
      insights: [
        { id: 'i1', icon: '🎯', iconBg: 'var(--red-soft)', title: 'Downtime traces to skipped PMs, not bad machines', text: '70% of unplanned stops were bearing and hydraulic failures — PM-preventable — after compliance fell to 76%.' },
        { id: 'i2', icon: '📉', iconBg: 'var(--amber-soft)', title: 'Two suppliers gate most late orders', text: 'Removing two castings suppliers lifts the rest of the base to 96% OTIF — the problem is concentrated, not systemic.' },
        { id: 'i3', icon: '💡', iconBg: 'var(--green-soft)', title: 'Changeover time is the OEE lever', text: 'Cutting changeovers from 42 to 30 minutes would add roughly 3 points of OEE on the constraint with no capex.' },
        { id: 'i4', icon: '🔁', iconBg: 'var(--teal-soft)', title: 'The PM-forward decision is confirmed', text: 'Pulling PMs forward (Decision Ledger, 12 May) cut downtime 14 h/wk — verdict updated to "Worked".' },
      ],
      actions: [
        { id: 'a1', title: 'Lock PM compliance above 95% on the press line', subtitle: 'Est. −13 h/wk downtime · owner suggested: Hassan', assigned: false, assignedTo: 'Hassan', actionType: 'assign' },
        { id: 'a2', title: 'Qualify a second castings supplier', subtitle: 'Est. +9 pts OTIF · owner suggested: Omar', assigned: false, assignedTo: 'Omar', actionType: 'assign' },
        { id: 'a3', title: 'Re-run the loss analysis with June telemetry', subtitle: 'Scheduled run · 1 July 06:00', assigned: false, actionType: 'schedule' },
      ],
    },
  },
};

export const opContent = { fmcg, healthcare, manufacturing };
