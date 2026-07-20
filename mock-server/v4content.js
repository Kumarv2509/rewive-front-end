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

// Industry-relevant worker catalogs (Worker Space). Each is scoped to its stream/mandates.
const fmcgAgents = [
  { agentId: 'fmcg-a-forecast-bias', state: 'live', name: 'Forecast Bias Worker', function: 'Demand & supply planning', capabilitiesCount: 4, dataInputs: 'Demand plan · POS · shipments', reviewGate: 'Human approval · step 4', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, guardrails: 'Planning pack · no auto-order over 2 weeks cover', estRuntime: '5–7 min', description: 'Detects systematic over/under-forecast by category and proposes replenishment corrections before fill rate slips.', industry: 'fnb', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Demand planning tool', 'Modern trade POS', 'ERP shipments'], outputsSummary: ['Bias report by category', 'Replenishment adjustments'], roiToDate: { label: 'Measured impact', value: '+AED 1.2M', direction: 'up' }, tokenCostToDate: { tokens: 380000, estCost: '$34.10' }, runsCount: 96, lastRunAt: '1h ago', mandateIds: ['fmcg-k-mape'] },
  { agentId: 'fmcg-a-otif', state: 'live', name: 'OTIF Recovery Worker', function: 'Demand & supply planning', capabilitiesCount: 3, dataInputs: 'Order lines · DC stock', reviewGate: 'Human approval · allocation', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, guardrails: 'Cannot deprioritise a strategic account', estRuntime: '4–6 min', description: 'Predicts case-fill shortfalls and re-allocates constrained stock to protect on-time-in-full for key accounts.', industry: 'fnb', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['ERP order lines', 'DC stock snapshots'], outputsSummary: ['At-risk order list', 'Allocation plan'], roiToDate: { label: 'Penalties avoided', value: '+AED 640k', direction: 'up' }, tokenCostToDate: { tokens: 210000, estCost: '$19.40' }, runsCount: 141, lastRunAt: '3h ago', mandateIds: ['fmcg-k-fill'] },
  { agentId: 'fmcg-a-coldchain', state: 'live', name: 'Cold-Chain Sentinel', function: 'Logistics & distribution', capabilitiesCount: 3, dataInputs: 'Reefer probes · routes', reviewGate: 'Auto-alert · no gate', owner: { name: 'Tariq Aziz', initials: 'TA', avatarBg: '#0F766E' }, guardrails: 'Read-only · escalates, never reroutes', estRuntime: '2–3 min', description: 'Watches refrigerated fleet temperature in transit, isolates recurring excursions to specific vehicles and lanes.', industry: 'fnb', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['Reefer temperature probes', 'TMS route logs'], outputsSummary: ['Excursion alerts', 'Vehicle risk ranking'], roiToDate: { label: 'Spoilage avoided', value: '+AED 310k', direction: 'up' }, tokenCostToDate: { tokens: 156000, estCost: '$14.20' }, runsCount: 220, lastRunAt: '20m ago', mandateIds: ['fmcg-k-cold'] },
  { agentId: 'fmcg-a-tradespend', state: 'live', name: 'Trade-Spend ROI Worker', function: 'Finance · Commercial', capabilitiesCount: 4, dataInputs: 'Trade ledger · POS', reviewGate: 'Human approval · step 3', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, guardrails: 'Flags only · no spend commitments', estRuntime: '6–8 min', description: 'Links promotional spend to actual sell-out and flags promotions buying display instead of incremental volume.', industry: 'fnb', function2: 'finance', persona: 'commercial_finance', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Trade-spend ledger', 'Modern trade POS'], outputsSummary: ['ROI by promotion', 'Cut/keep recommendations'], roiToDate: { label: 'Measured impact', value: '+AED 480k', direction: 'up' }, tokenCostToDate: { tokens: 305000, estCost: '$28.60' }, runsCount: 74, lastRunAt: '5h ago', mandateIds: ['fmcg-k-troi', 'fmcg-k-tradepct'] },
  { agentId: 'fmcg-a-osa', state: 'live', name: 'Shelf Availability Worker', function: 'Commercial & sales', capabilitiesCount: 3, dataInputs: 'POS · store audits', reviewGate: 'Human approval · step 2', owner: { name: 'Layla Nasser', initials: 'LN', avatarBg: '#0E7490' }, guardrails: 'Store-manager sign-off before rep dispatch', estRuntime: '3–5 min', description: 'Pinpoints on-shelf-availability gaps in top stores and the SKUs and time windows driving repeat stockouts.', industry: 'fnb', function2: 'sales', persona: 'store_manager', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Modern trade POS', 'Store audit app'], outputsSummary: ['Stockout heatmap', 'Store visit list'], roiToDate: { label: 'Recovered sales', value: '+AED 220k/mo', direction: 'up' }, tokenCostToDate: { tokens: 188000, estCost: '$17.30' }, runsCount: 132, lastRunAt: '2h ago', mandateIds: ['fmcg-k-osa'] },
  { agentId: 'fmcg-a-waste', state: 'paused', name: 'Line Waste Worker', function: 'Manufacturing', capabilitiesCount: 3, dataInputs: 'Line sensors · material issues', reviewGate: 'Human approval · step 3', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, guardrails: 'No line-speed changes without plant sign-off', estRuntime: '4–6 min', description: 'Correlates waste and scrap with changeover frequency and start-up losses to isolate structural vs operator causes.', industry: 'fnb', function2: 'it', persona: 'operations_head', catalogStatus: 'paused', creationPath: 'studio', inputsSummary: ['Line sensor telemetry', 'ERP material issues'], outputsSummary: ['Waste driver breakdown', 'Changeover recommendations'], roiToDate: { label: 'Margin recovered', value: '+35 bps', direction: 'up' }, tokenCostToDate: { tokens: 142000, estCost: '$13.10' }, runsCount: 58, lastRunAt: '1d ago', mandateIds: ['fmcg-k-waste', 'fmcg-k-cho'] },
];

// Loop speed by mandate (Performance screen): how fast drift on each mandate goes
// from detected → dispositioned → number back at target. Sorted fastest close first.
const fmcgLoopSpeed = [
  { id: 'fmcg-ls-osa', persona: 'sales_supervisor', mandate: 'On-shelf availability', stream: 'Commercial & sales', owner: { name: 'Layla Nasser', initials: 'LN', avatarBg: '#0E7490' }, agent: 'Commercial agent', findings90d: 4, medianTimeToDecide: '3.2h', medianTimeToClose: '6 days', closedInWindowPct: 86, trend: [16, 14, 12, 10, 8, 6], trendColor: '#16A34A' },
  { id: 'fmcg-ls-ppm', persona: 'operations_head', mandate: 'Complaints per million', stream: 'Quality & food safety', owner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D' }, agent: 'Quality agent', findings90d: 2, medianTimeToDecide: '4.5h', medianTimeToClose: '8 days', closedInWindowPct: 90, trend: [13, 12, 12, 10, 9, 8], trendColor: '#16A34A' },
  { id: 'fmcg-ls-fill', persona: 'operations_head', mandate: 'Case fill rate (OTIF)', stream: 'Demand & supply planning', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, agent: 'Planning agent', findings90d: 5, medianTimeToDecide: '9h', medianTimeToClose: '12 days', closedInWindowPct: 74, trend: [18, 17, 15, 14, 13, 12], trendColor: '#16A34A' },
  { id: 'fmcg-ls-mape', persona: 'operations_head', mandate: 'Forecast accuracy', stream: 'Demand & supply planning', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' }, agent: 'Planning agent', findings90d: 3, medianTimeToDecide: '14h', medianTimeToClose: '21 days', closedInWindowPct: 62, trend: [24, 23, 23, 22, 21, 21], trendColor: '#A8A29E' },
  { id: 'fmcg-ls-cold', persona: 'coo', mandate: 'Cold-chain excursions', stream: 'Logistics & distribution', owner: { name: 'Tariq Aziz', initials: 'TA', avatarBg: '#0F766E' }, agent: 'Logistics agent', findings90d: 3, medianTimeToDecide: '26h', medianTimeToClose: '24 days', closedInWindowPct: 55, trend: [20, 21, 22, 23, 23, 24], trendColor: '#D97706' },
  { id: 'fmcg-ls-waste', persona: 'operations_head', mandate: 'Waste & scrap', stream: 'Manufacturing', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, agent: 'Manufacturing agent', findings90d: 2, medianTimeToDecide: '18h', medianTimeToClose: '30 days', closedInWindowPct: 48, trend: [26, 27, 28, 29, 29, 30], trendColor: '#D97706' },
  { id: 'fmcg-ls-trade', persona: 'commercial_finance', mandate: 'Trade spend % of revenue', stream: 'Finance', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, agent: 'Finance agent', findings90d: 2, medianTimeToDecide: '31h', medianTimeToClose: '38 days', closedInWindowPct: 41, trend: [30, 32, 33, 35, 37, 38], trendColor: '#DC2626' },
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
  { agentId: 'hc-a-denial', state: 'live', name: 'Claims Denial Triage Worker', function: 'Revenue cycle', capabilitiesCount: 4, dataInputs: 'Claims · remits · rejection codes', reviewGate: 'Human approval · appeal batch', owner: { name: 'Rashid Al Balushi', initials: 'RB', avatarBg: '#B45309' }, guardrails: 'No auto-submit · human signs each appeal batch', estRuntime: '5–7 min', description: 'Clusters first-pass denials by payer and reason code, drafts appeal packets and routes the batch for sign-off.', industry: 'healthcare', function2: 'finance', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['eClaimLink claims feed', 'Denial code library (AUTH-003 · MNEC-005 · ELIG-001)'], outputsSummary: ['Denial clusters by payer', 'Draft appeal packets'], roiToDate: { label: 'Cash recovered', value: '+AED 7.7M', direction: 'up' }, tokenCostToDate: { tokens: 420000, estCost: '$39.00' }, runsCount: 210, lastRunAt: '1h ago', mandateIds: ['hc-k-denial', 'hc-k-ar'] },
  { agentId: 'hc-a-noshow', state: 'live', name: 'Patient No-Show Predictor', function: 'Patient experience', capabilitiesCount: 3, dataInputs: 'Scheduling · history', reviewGate: 'Human approval · outreach list', owner: { name: 'Fatima Al Marri', initials: 'FA', avatarBg: '#BE185D' }, guardrails: 'Reminder cadence capped · opt-out honoured', estRuntime: '3–5 min', description: 'Scores upcoming appointments for no-show risk and triggers reminder and overbooking cohorts for specialty clinics.', industry: 'healthcare', function2: 'customer_success', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Scheduling system', 'Visit history'], outputsSummary: ['Risk-scored slots', 'Reminder cohort'], roiToDate: { label: 'Slots recovered', value: '+240/mo', direction: 'up' }, tokenCostToDate: { tokens: 190000, estCost: '$17.60' }, runsCount: 168, lastRunAt: '2h ago', mandateIds: ['hc-k-noshow'] },
  { agentId: 'hc-a-readmit', state: 'live', name: 'Readmission Risk Worker', function: 'Clinical operations', capabilitiesCount: 4, dataInputs: 'EMR · meds · social factors', reviewGate: 'Care-team review · always', owner: { name: 'Dr. Meera Nair', initials: 'MN', avatarBg: '#0E7490' }, guardrails: 'Advisory only · never alters a care plan', estRuntime: '4–6 min', description: 'Scores each discharge against a 30-day readmission model and surfaces the drivers for the care team to act on.', industry: 'healthcare', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['EMR feed', 'Medication list'], outputsSummary: ['Risk cohort', 'Follow-up plan'], roiToDate: { label: 'Readmissions avoided', value: '−1.3 pts', direction: 'up' }, tokenCostToDate: { tokens: 260000, estCost: '$24.10' }, runsCount: 64, lastRunAt: '40m ago', mandateIds: ['hc-t-quality'] },
  { agentId: 'hc-a-discharge', state: 'live', name: 'Discharge Flow Worker', function: 'Clinical operations', capabilitiesCount: 3, dataInputs: 'EMR · bed board', reviewGate: 'Human approval · step 3', owner: { name: 'Dr. Meera Nair', initials: 'MN', avatarBg: '#0E7490' }, guardrails: 'Flags placement delays · no discharge decisions', estRuntime: '3–5 min', description: 'Predicts discharge-ready patients and the home-care and step-down placement bottlenecks driving length of stay and bed pressure.', industry: 'healthcare', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['EMR feed', 'Bed board'], outputsSummary: ['Discharge-ready list', 'Bottleneck report'], roiToDate: { label: 'ALOS reduced', value: '−0.4 days', direction: 'up' }, tokenCostToDate: { tokens: 175000, estCost: '$16.20' }, runsCount: 121, lastRunAt: '3h ago', mandateIds: ['hc-k-alos', 'hc-k-bed'] },
  { agentId: 'hc-a-medrec', state: 'live', name: 'Medication Reconciliation Worker', function: 'Pharmacy operations', capabilitiesCount: 4, dataInputs: 'Pharmacy · EMR orders', reviewGate: 'Pharmacist review · always', owner: { name: 'Ravi Menon', initials: 'RM', avatarBg: '#0F766E' }, guardrails: 'Pharmacist signs every flagged interaction', estRuntime: '4–6 min', description: 'Reconciles admission med lists against orders and flags interactions and duplications for pharmacist review.', industry: 'healthcare', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['Pharmacy system', 'EMR orders'], outputsSummary: ['Interaction flags', 'Reconciled list'], roiToDate: { label: 'Errors prevented', value: '−0.5/1k doses', direction: 'up' }, tokenCostToDate: { tokens: 205000, estCost: '$19.00' }, runsCount: 143, lastRunAt: '6h ago', mandateIds: ['hc-k-mederror'] },
  { agentId: 'hc-a-coding', state: 'paused', name: 'Coding Audit Worker', function: 'Revenue cycle', capabilitiesCount: 3, dataInputs: 'Claims · coding rules', reviewGate: 'Human approval · step 2', owner: { name: 'Rashid Al Balushi', initials: 'RB', avatarBg: '#B45309' }, guardrails: 'Suggests edits · coder confirms each', estRuntime: '5–7 min', description: 'Audits claims against payer edit rules before submission to lift the clean-claim rate and cut downstream rejections.', industry: 'healthcare', function2: 'finance', persona: 'cfo', catalogStatus: 'paused', creationPath: 'studio', inputsSummary: ['eClaimLink claims feed', 'Payer edit rules (Daman · Thiqa · Sukoon)'], outputsSummary: ['Edit suggestions', 'Clean-claim forecast'], roiToDate: { label: 'Clean claim rate', value: '+4 pts', direction: 'up' }, tokenCostToDate: { tokens: 150000, estCost: '$13.90' }, runsCount: 52, lastRunAt: '1d ago', mandateIds: ['hc-k-cleanclaim', 'hc-k-denial'] },
];

const healthcare = {
  agentCatalog: hcAgents,
  dashboardSummary: {
    greetingName: 'Kumara',
    summarySentence:
      'Since yesterday, Rewive executed <b style="color:var(--ink)">63 actions</b> across the revenue cycle and clinical ops. Your queue is below.',
  },
  pendingDecisions: [
    { id: 'hc-dec1', icon: '🧾', iconBg: 'var(--red-soft)', title: 'Daman prior-approval rejections doubled · escalated to you', subtitle: 'Payer contracting held it 4 days without a call · ≈ AED 1.4M/mo cash delayed', actionLabel: 'Act', actionVerb: 'act', persona: 'cfo' },
    { id: 'hc-dec2', icon: '⚖️', iconBg: 'var(--amber-soft)', title: 'Sukoon rejecting bundled day-surgery codes the contract says are payable', subtitle: 'Payer contracting agent · 214 claims under MNEC-005 · ≈ AED 3.9M disputed', actionLabel: 'Act', actionVerb: 'act', persona: 'commercial_finance' },
    { id: 'hc-dec3', icon: '📅', iconBg: 'var(--accent-soft)', title: 'No-show risk · 240 specialty slots at risk this month', subtitle: 'Patient Experience Worker · SMS + call reminder cohort ready', actionLabel: 'Release', actionVerb: 'release', persona: 'operations_head' },
    { id: 'hc-dec4', icon: '💰', iconBg: 'var(--teal-soft)', title: 'Days in AR passed 68 against a 45-day plan', subtitle: 'Finance agent · flagged twice, never dispositioned · ≈ AED 31M tied up', actionLabel: 'Review', actionVerb: 'act', persona: 'cfo' },
  ],
  pulse: [
    { id: 'hc-p1', dotColor: 'var(--green)', html: '<b>Clean claim rate</b> recovered to <b>89%</b> after the coding backfill landed — rejections down 2.1 pts.' },
    { id: 'hc-p2', dotColor: 'var(--accent)', html: '<b>Revenue cycle</b> is the fastest function: median appeal turnaround down from <b>9 days to 2 days</b>.' },
    { id: 'hc-p3', dotColor: 'var(--amber)', html: '<b>2 wards</b> are trending over safe nurse-to-patient ratios tonight. <span style="color:var(--accent);font-weight:600;cursor:pointer">Review staffing →</span>' },
  ],
  liveRuns: [
    { id: 'hc-run-readmit', persona: 'operations_head', name: 'Readmission risk · today’s discharges', eta: '~3 min left', percent: 66, stepDescription: 'Step 4 of 6 — scoring 88 discharges' },
    { id: 'hc-run-claims', persona: 'cfo', name: 'Overnight claims scrub · eClaimLink', eta: '~2 min left', percent: 80, stepDescription: 'Step 5 of 6 — applying payer edits' },
    { id: 'hc-run-liability', persona: 'cfo', name: 'Patient liability lookup · pilot desks', eta: '~2 min left', percent: 71, stepDescription: 'Step 4 of 6 — resolving benefits for tomorrow’s co-pay visits' },
    { id: 'hc-run-slotpool', persona: 'coo', name: 'Network slot pool · cross-site availability', eta: '~4 min left', percent: 48, stepDescription: 'Step 3 of 6 — matching deflected demand to open slots' },
    { id: 'hc-run-eligprecheck', persona: 'sales_supervisor', name: 'Overnight eligibility pre-check · tomorrow’s bookings', eta: '~1 min left', percent: 88, stepDescription: 'Step 5 of 6 — querying eClaimLink for 412 patients' },
    { id: 'hc-run-census', persona: 'operations_head', name: 'Bed capacity forecast · 72h', eta: 'finishing', percent: 92, barColor: 'var(--teal)', stepDescription: 'Step 6 of 6 — ward-level projection' },
  ],
  topPerformer: { id: 'hc-james', name: 'Rashid Al Balushi', avatarBg: '#B45309', initials: 'RB', badge: '94% on-time', statLine: 'Closed 28 appeals · paired with Revenue Cycle Worker · recovered AED 4.0M' },
  runs: [
    { id: 'hc-run-readmit', persona: 'operations_head', name: 'Readmission risk · today’s discharges', owner: { name: 'Meera', initials: 'MN', avatarBg: '#0E7490' }, agentName: 'Clinical Risk Worker', status: 'running', duration: '5m 20s', outcome: '—' },
    { id: 'hc-run-claims', persona: 'cfo', name: 'Overnight claims scrub · eClaimLink', owner: { name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, agentName: 'Revenue Cycle Worker', status: 'running', duration: '7m 02s', outcome: '—' },
    { id: 'hc-run-denials', persona: 'cfo', name: 'Denial appeal batch · Daman + Sukoon', owner: { name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, agentName: 'Revenue Cycle Worker', status: 'needs_decision', duration: 'paused 2h', outcome: '38 claims queued' },
    { id: 'hc-run-noshow', persona: 'operations_head', name: 'No-show reminder cohort', owner: { name: 'Fatima', initials: 'FA', avatarBg: '#BE185D' }, agentName: 'Patient Experience Worker', status: 'completed', duration: '4m 11s', outcome: '240 patients contacted' },
    { id: 'hc-run-medrec', persona: 'operations_head', name: 'Medication reconciliation · admissions', owner: { name: 'Ravi', initials: 'RM', avatarBg: '#0F766E' }, agentName: 'Pharmacy Worker', status: 'completed', duration: '6m 40s', outcome: '3 interactions flagged' },
    { id: 'hc-run-liability', persona: 'cfo', name: 'Patient liability lookup · pilot desks', owner: { name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, agentName: 'Liability Worker', status: 'running', duration: '5m 02s', outcome: '—' },
    { id: 'hc-run-poscollect', persona: 'cfo', name: 'Desk collection reconciliation · weekly by site', owner: { name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, agentName: 'Revenue Cycle Worker', status: 'done', duration: '2m 33s', outcome: 'Pilot desks 41% → 47%, control desks flat' },
    { id: 'hc-run-census', persona: 'operations_head', name: 'Bed capacity forecast · 72h', owner: { name: 'Meera', initials: 'MN', avatarBg: '#0E7490' }, agentName: 'Clinical Ops Worker', status: 'running', duration: '8m 44s', outcome: '—' },
    { id: 'hc-run-slotpool', persona: 'coo', name: 'Network slot pool · cross-site availability', owner: { name: 'Kumara', initials: 'KV', avatarBg: '#4F46E5' }, agentName: 'Slot Matching Worker', status: 'running', duration: '4m 11s', outcome: '—' },
    { id: 'hc-run-rota', persona: 'coo', name: 'Rota predictability scan · nursing', owner: { name: 'Noura', initials: 'NK', avatarBg: '#C2410C' }, agentName: 'People Worker', status: 'needs_decision', duration: 'paused 5h', outcome: '3 wards flagged, rota rule change proposed' },
    { id: 'hc-run-eligprecheck', persona: 'sales_supervisor', name: 'Overnight eligibility pre-check · tomorrow’s bookings', owner: { name: 'Omar', initials: 'OS', avatarBg: '#0369A1' }, agentName: 'Eligibility Worker', status: 'running', duration: '6m 38s', outcome: '—' },
    { id: 'hc-run-reminders', persona: 'sales_supervisor', name: 'Reminder coverage audit · all booking horizons', owner: { name: 'Omar', initials: 'OS', avatarBg: '#0369A1' }, agentName: 'Front Office Worker', status: 'failed', duration: '1m 09s', outcome: 'Scheduling template returned no 21+ day cohort' },
    { id: 'hc-run-session', persona: 'store_manager', name: 'Session overrun analysis · Sharjah afternoons', owner: { name: 'Layla', initials: 'LH', avatarBg: '#9333EA' }, agentName: 'Clinic Ops Worker', status: 'done', duration: '3m 47s', outcome: 'Slot length re-based to 17 min on 3 clinics' },
    { id: 'hc-run-wayfind', persona: 'store_manager', name: 'Complaint theme clustering · Sharjah + Abu Dhabi', owner: { name: 'Layla', initials: 'LH', avatarBg: '#9333EA' }, agentName: 'Patient Experience Worker', status: 'done', duration: '2m 15s', outcome: '71% waiting, wayfinding out of top 3' },
    { id: 'hc-run-coding', persona: 'cfo', name: 'Coding audit · weekly', owner: { name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, agentName: 'Coding Audit Worker', status: 'failed', duration: '0m 38s', outcome: 'EMR export timeout · retried ✓' },
  ],
  runDetails: {
    'hc-run-readmit': {
      id: 'hc-run-readmit', persona: 'operations_head', name: 'Readmission risk — today’s discharges', meta: 'Clinical Risk Worker · started 08:40 by Meera · est. finish 08:49', isLive: true,
      steps: [
        { id: 's1', status: 'done', label: 'Pull discharge list', description: '88 discharges · EMR feed · comorbidities joined', duration: '0m 54s' },
        { id: 's2', status: 'done', label: 'Feature build', description: 'Prior admissions, meds, social factors, LACE index', duration: '1m 22s' },
        { id: 's3', status: 'live', label: 'Risk scoring', description: 'Scoring each discharge against the 30-day model…', duration: 'running' },
        { id: 's4', status: 'gate', label: 'Review gate — high-risk cohort', description: 'Will pause for the care team before outreach', duration: 'waiting' },
        { id: 's5', status: 'wait', icon: '5', label: 'Publish risk scorecard', description: 'Cohort list, drivers, recommended follow-up', duration: '—' },
      ],
    },
    'hc-run-liability': {
      id: 'hc-run-liability', persona: 'cfo', name: 'Patient liability lookup — pilot desks', meta: 'Liability Worker · started 07:15 by Rashid · est. finish 07:22', isLive: true,
      steps: [
        { id: 's1', status: 'done', label: 'Pull tomorrow’s co-pay visits', description: '268 visits with an expected patient liability · 3 pilot desks', duration: '0m 33s' },
        { id: 's2', status: 'done', label: 'Request benefits detail from eClaimLink', description: 'Deductible, co-pay and co-insurance per policy', duration: '2m 47s' },
        { id: 's3', status: 'done', label: 'Compute verified liability', description: '241 resolved to an exact figure, 27 returned a range', duration: '0m 58s' },
        { id: 's4', status: 'live', label: 'Publish to the check-in screen', description: 'Writing the verified figure the desk will actually quote…', duration: 'running' },
        { id: 's5', status: 'gate', label: 'Review gate — the 27 ranges', description: 'Will not quote a range to a patient. Held for a human call.', duration: 'waiting' },
        { id: 's6', status: 'wait', icon: '6', label: 'Reconcile against what was collected', description: 'Feeds the weekly desk collection figure by site', duration: '—' },
      ],
    },
    'hc-run-eligprecheck': {
      id: 'hc-run-eligprecheck', persona: 'sales_supervisor', name: 'Overnight eligibility pre-check — tomorrow’s bookings', meta: 'Eligibility Worker · started 23:10 by Omar · est. finish 23:18', isLive: true,
      steps: [
        { id: 's1', status: 'done', label: 'Pull tomorrow’s booked list', description: '412 patients across 3 sites · scheduling system', duration: '0m 41s' },
        { id: 's2', status: 'done', label: 'Match payer and policy number', description: '389 matched from the record, 23 missing a policy number', duration: '1m 05s' },
        { id: 's3', status: 'done', label: 'Query eClaimLink', description: 'Eligibility response requested for 389 patients', duration: '3m 52s' },
        { id: 's4', status: 'live', label: 'Flag the exceptions', description: 'Building the desk worklist for the 23 unmatched plus 11 inactive policies…', duration: 'running' },
        { id: 's5', status: 'gate', label: 'Review gate — inactive policies', description: 'Will pause before anything is said to a patient about cover', duration: 'waiting' },
        { id: 's6', status: 'wait', icon: '6', label: 'Publish desk worklist', description: 'Front desk sees only the visits that still need a check', duration: '—' },
      ],
    },
    'hc-run-session': {
      id: 'hc-run-session', persona: 'store_manager', name: 'Session overrun analysis — Sharjah afternoons', meta: 'Clinic Ops Worker · ran 14:02 by Layla · finished in 3m 47s', isLive: false,
      steps: [
        { id: 's1', status: 'done', label: 'Pull consultation timestamps', description: '6 weeks of afternoon sessions, 4 clinics', duration: '0m 38s' },
        { id: 's2', status: 'done', label: 'Compare booked vs actual slot length', description: '12 min booked, 17 min actual median', duration: '0m 51s' },
        { id: 's3', status: 'done', label: 'Isolate the start-time effect', description: 'Sessions start 11 min late; overrun never recovers within the session', duration: '1m 12s' },
        { id: 's4', status: 'done', label: 'Model the re-based slot', description: '17 min slots hold the session inside 20 min wait at current volume', duration: '1m 06s' },
        { id: 's5', status: 'done', label: 'Publish recommendation', description: 'Re-base 3 worst clinics; protect the 14:00 start', duration: '—' },
      ],
    },
    'hc-run-rota': {
      id: 'hc-run-rota', persona: 'coo', name: 'Rota predictability scan — nursing', meta: 'People Worker · started 06:30 by Noura · paused at the review gate', isLive: false,
      steps: [
        { id: 's1', status: 'done', label: 'Pull 12 months of published rotas', description: 'All sites · HRIS · shift changes within 7 days of the shift', duration: '1m 18s' },
        { id: 's2', status: 'done', label: 'Score predictability by ward', description: '3 wards change more than 30% of shifts inside a week', duration: '2m 04s' },
        { id: 's3', status: 'done', label: 'Join to exit interviews', description: 'The same 3 wards account for 6 of 10 rota-cited leavers', duration: '0m 47s' },
        { id: 's4', status: 'gate', label: 'Review gate — proposed rota rule', description: 'No shift change inside 7 days without the nurse agreeing. Waiting on the COO.', duration: 'paused 5h' },
        { id: 's5', status: 'wait', icon: '5', label: 'Publish to ward managers', description: 'Rule, affected wards, and the cover plan for the transition', duration: '—' },
      ],
    },
  },
  runExceptions: [
    { id: 'hc-exc1', runId: 'hc-run-coding', runName: 'Coding audit · weekly', severity: 'error', message: 'EMR bulk export timed out after 3 retries — run failed.', status: 'open', createdAt: '2h ago' },
    { id: 'hc-exc2', runId: 'hc-run-denials', runName: 'Denial appeal batch · Daman + Sukoon', severity: 'warning', message: 'Worker is unsure which appeal template fits 4 edge-case MNEC-005 rejections — needs your input.', status: 'open', createdAt: '2h ago' },
    { id: 'hc-exc3', runId: 'hc-run-reminders', runName: 'Reminder coverage audit · all booking horizons', severity: 'error', message: 'Scheduling template returned an empty 21+ day cohort — the worker cannot tell whether coverage is zero or the query is wrong. Run failed rather than reporting 0%.', status: 'open', createdAt: '5h ago' },
    { id: 'hc-exc4', runId: 'hc-run-slotpool', runName: 'Network slot pool · cross-site availability', severity: 'warning', message: 'Abu Dhabi slot inventory has not been published to the shared pool — matching is running on 2 of 3 sites.', status: 'open', createdAt: '1h ago' },
  ],
  runChases: [
    { id: 'hc-chase1', runId: 'hc-run-denials', runName: 'Denial appeal batch · Daman + Sukoon', trigger: 'sla', note: 'Appeal batch has waited 2h with no sign-off — the eClaimLink resubmission window closes in 36h.', escalatedTo: 'Revenue cycle director', createdAt: '40m ago' },
  ],
  // decisionStats derived server-side — see mock-server/halfyear.js.
  decisionLedger: [
    { id: 'hc-led17', persona: 'cfo', title: 'Act — put verified patient liability on the check-in screen', subtitle: 'Desk collection stuck at 41% while patient liability share rose 6 points', madeBy: { type: 'human', name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Revenue cycle agent' }, date: '16 Jul', verdict: 'too_early', measuredImpact: { text: 'pilot desks 41% → 47%, control flat', direction: 'up' }, function: 'finance', findingId: 'hc-f-poscash', assessorNote: 'Assessor agent: three pilot desks are running 47% against 41% at the control desks over two weeks — the right direction, but two weeks is not the eight-week exit condition and the pilot desks are the three busiest, which is not a representative sample. Too early. Note this also releases the front-office trip-wire on desk waivers, which was acknowledged because the benefits display was not in that team’s control.', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates' },
    { id: 'hc-led9', persona: 'cfo', title: 'Accept — coding backfill, watch the clean claim rate', subtitle: 'Clean claim rate fell to 82% after three senior coders left', madeBy: { type: 'human', name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Revenue cycle agent' }, date: '26 Jun', verdict: 'too_early', measuredImpact: { text: 'measuring… 89% of a 93% exit condition', direction: 'flat' }, function: 'finance', findingId: 'hc-f-4', assessorNote: 'Assessor agent: the backfill was already approved, so this was accepted with an exit condition rather than acted on. Clean claim rate is 89% against the 93% exit condition — two of the six required weeks are on the board. Too early to call.', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led11', persona: 'sales_supervisor', title: 'Acknowledge — desk co-pay waivers, trip-wire armed', subtitle: 'Collection skipped when the patient disputes the amount, 1 in 9 visits', madeBy: { type: 'human', name: 'Omar', initials: 'OS', avatarBg: '#0369A1' }, informedBy: { type: 'agent', name: 'Front office agent' }, date: '11 Jul', verdict: 'too_early', measuredImpact: { text: 'trip-wire armed at 15% of visits', direction: 'flat' }, function: 'operations', findingId: 'hc-f-fo-poscash', assessorNote: 'Assessor agent: acknowledged rather than acted on, because the fix — a live benefits display at the desk — is not in this team’s control. The trip-wire fires if waivers pass 15% of visits, or if the display ships and the rate does not move within four weeks. Nothing to assess until one of those happens.', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates' },
    { id: 'hc-led12', persona: 'store_manager', title: 'Accept — signage and check-in script rework, watch site NPS', subtitle: 'Sharjah NPS fell to 31 after the paediatrics / dermatology floor swap', madeBy: { type: 'human', name: 'Layla', initials: 'LH', avatarBg: '#9333EA' }, informedBy: { type: 'agent', name: 'Patient experience agent' }, date: '02 Jul', verdict: 'too_early', measuredImpact: { text: 'measuring… NPS 37 of a 42 exit condition', direction: 'flat' }, function: 'operations', findingId: 'hc-f-cm-nps', assessorNote: 'Assessor agent: NPS has recovered from 31 to 37 against a 42 exit condition, with three of the six required weeks on the board. Wayfinding has dropped out of the top three complaint themes. Trending right, too early to call.', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates' },
    { id: 'hc-led10', persona: 'fpa', title: 'Re-base the cash forecast on collections, not billings', subtitle: 'Four consecutive months of collections missing forecast', madeBy: { type: 'human', name: 'Anita', initials: 'AM', avatarBg: '#1D4ED8' }, informedBy: { type: 'agent', name: 'Finance agent' }, date: '02 Jun', verdict: 'worked', measuredImpact: { text: 'forecast miss 9% → 2.4%', direction: 'up' }, function: 'finance', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led1', persona: 'cfo', title: 'Batch-appeal rejected claims (Daman + Sukoon)', subtitle: 'Prior-approval rejection surge, May', madeBy: { type: 'human', name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Revenue Cycle Worker' }, date: '12 May', verdict: 'worked', measuredImpact: { text: '+AED 2.3M recovered', direction: 'up' }, function: 'finance', findingId: 'hc-f-1', assessorNote: 'Assessor agent: first-pass denial rate for the two payers fell from 11.8% to 7.4% over six weeks — confirmed against the same eClaimLink remittance feed that raised the finding.', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led2', persona: 'operations_head', title: 'Open a discharge lounge on medical wards', subtitle: 'ALOS driver — home-care and step-down placement delays', madeBy: { type: 'human', name: 'Meera', initials: 'MN', avatarBg: '#0E7490' }, informedBy: { type: 'agent', name: 'Clinical Ops Worker' }, date: '30 Apr', verdict: 'worked', measuredImpact: { text: '−0.4 days ALOS', direction: 'up' }, function: 'operations', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led3', persona: 'operations_head', title: 'SMS + call reminders for high-risk no-shows', subtitle: 'Sharjah medical centres pilot', madeBy: { type: 'human', name: 'Fatima', initials: 'FA', avatarBg: '#BE185D' }, informedBy: { type: 'agent', name: 'Patient Experience Worker' }, date: '22 Apr', verdict: 'too_early', measuredImpact: { text: 'measuring…', direction: 'flat' }, function: 'operations', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates' },
    { id: 'hc-led4', persona: 'cfo', title: 'Switch to biosimilar for infusion therapy', subtitle: 'Formulary review Q2', madeBy: { type: 'human', name: 'Ravi', initials: 'RM', avatarBg: '#0F766E' }, informedBy: { type: 'agent', name: 'Pharmacy Worker' }, date: '15 Apr', verdict: 'worked', measuredImpact: { text: '+AED 770k/yr', direction: 'up' }, function: 'pharmacy', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led8', persona: 'commercial_finance', title: 'Act — renegotiate the AXA / GIG Gulf outpatient tariff', subtitle: 'Realized rate running 9% below the contracted schedule', madeBy: { type: 'human', name: 'Sana', initials: 'SQ', avatarBg: '#7C3AED' }, informedBy: { type: 'agent', name: 'Payer contracting agent' }, date: '18 Mar', verdict: 'not_worked', measuredImpact: { text: '−6.5% vs contracted tariff', direction: 'down' }, function: 'finance', findingId: 'hc-f-h2', assessorNote: 'Assessor agent: the renegotiation and fee-schedule re-map corrected the mapping errors but not the downcoding behaviour. Realized rate closed the period at −6.5% against a −2% exit condition, so the loop closed without the number coming back. The same pattern is now open as the Sukoon bundled-code dispute at JLT.', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led15', persona: 'coo', title: 'Accept — harmonise the medication-error definition before judging the rate', subtitle: 'Three sites counting one number three different ways', madeBy: { type: 'human', name: 'Kumara', initials: 'KV', avatarBg: '#4F46E5' }, informedBy: { type: 'agent', name: 'Chief of staff agent' }, date: '05 Jul', verdict: 'too_early', measuredImpact: { text: 'measuring… 2 of 3 sites migrated', direction: 'flat' }, function: 'operations', findingId: 'hc-f-coo-safety', assessorNote: 'Assessor agent: no verdict is possible until the definition is common — judging a rate built from three different counting rules would produce a confident answer to the wrong question. Two of three sites have migrated. Re-baseline is due once the third lands.', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led16', persona: 'coo', title: 'Act — re-base evening ED cover on the arrival curve', subtitle: 'Door-to-provider at 61 minutes on evening shifts', madeBy: { type: 'human', name: 'Kumara', initials: 'KV', avatarBg: '#4F46E5' }, informedBy: { type: 'agent', name: 'Clinical ops agent' }, date: '10 Apr', verdict: 'worked', measuredImpact: { text: '61 min → 26 min evening door-to-provider', direction: 'up' }, function: 'operations', findingId: 'hc-f-coo-h1', assessorNote: 'Assessor agent: held at or under 28 minutes for six consecutive weeks, and daytime performance did not regress — this added capacity in the right hours rather than moving it. Loop closed 21 Jun.', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led13', persona: 'store_manager', title: 'Act — re-base Saturday capacity on actual attendance', subtitle: 'Saturday overbooking at 130% pushed waits past an hour', madeBy: { type: 'human', name: 'Layla', initials: 'LH', avatarBg: '#9333EA' }, informedBy: { type: 'agent', name: 'Patient experience agent' }, date: '23 Apr', verdict: 'worked', measuredImpact: { text: '64 min → 17 min Saturday wait', direction: 'up' }, function: 'operations', findingId: 'hc-f-cm-h1', assessorNote: 'Assessor agent: Saturday wait held under 20 minutes for six consecutive weeks once capacity was matched to attendance rather than to the old no-show assumption — confirmed against scheduling and check-in timestamps. Loop closed 24 Jun.', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates' },
    { id: 'hc-led14', persona: 'sales_supervisor', title: 'Act — move insurance card capture to the booking call', subtitle: 'Card details chased at the desk on 3 in 10 visits', madeBy: { type: 'human', name: 'Omar', initials: 'OS', avatarBg: '#0369A1' }, informedBy: { type: 'agent', name: 'Front office agent' }, date: '18 Mar', verdict: 'worked', measuredImpact: { text: 'desk capture 71% → 96%', direction: 'up' }, function: 'operations', assessorNote: 'Assessor agent: capturing the card at booking rather than at arrival cut registration handling time by 2.4 minutes per visit and removed the most common cause of an incomplete claim record. Held for eight weeks.', entity: 'Medcare Medical Centres — Sharjah', region: 'Sharjah & Northern Emirates' },
    { id: 'hc-led6', persona: 'operations_head', title: 'Accept — tighten JLT theatre block release rules', subtitle: 'Theatre utilization stuck below 65% through Q1', madeBy: { type: 'human', name: 'Meera', initials: 'MN', avatarBg: '#0E7490' }, informedBy: { type: 'agent', name: 'Clinical ops agent' }, date: '06 Mar', verdict: 'worked', measuredImpact: { text: '+AED 4.0M theatre revenue / qtr', direction: 'up' }, function: 'operations', findingId: 'hc-f-h1', assessorNote: 'Assessor agent: utilization held above 75% for four straight weeks after the block-release change — loop closed 15 May.', entity: 'Medcare Day Surgery — JLT', region: 'Dubai' },
    { id: 'hc-led7', persona: 'cfo', title: 'Accept — registration eligibility checklist + auto-verify', subtitle: 'February rejection episode, two medical centres', madeBy: { type: 'human', name: 'Rashid', initials: 'RB', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Revenue cycle agent' }, date: '09 Feb', verdict: 'worked', measuredImpact: { text: '−2.1 pts denial rate', direction: 'up' }, function: 'finance', findingId: 'hc-f-0', assessorNote: 'Assessor agent: ELIG-001 rejections cleared and the denial rate held under 8.5% for six weeks after the registration fix — loop closed 10 Apr.', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
    { id: 'hc-led5', persona: 'cfo', title: 'Auto-verify eligibility under AED 1,100 self-pay', subtitle: 'Process decision · worker autonomous', madeBy: { type: 'agent', name: 'Revenue Cycle Worker' }, informedBy: { type: 'policy', name: 'policy' }, date: 'ongoing', verdict: 'worked', measuredImpact: { text: '18h / month saved', direction: 'up' }, function: 'finance', entity: 'Medcare Hospital Al Safa', region: 'Dubai' },
  ],
  leaderboardHighlights: [
    { id: 'hc-h1', medal: '🥇', tag: 'Most effective · people', name: 'Rashid Al Balushi', avatarBg: '#B45309', initials: 'RB', statLine: '28 appeals · 94% on-time · AED 4.0M recovered' },
    { id: 'hc-h2', medal: '🤖', tag: 'Top worker', name: 'Revenue Cycle Worker', avatarBg: '#4F46E5', initials: 'RC', statLine: '210 runs · 98.6% success · AED 7.7M recovered' },
    { id: 'hc-h3', medal: '⚡', tag: 'Best human + worker pair', name: 'Meera + Clinical Ops Worker', avatarBg: '#0E7490', initials: 'MN', statLine: 'ALOS 5.4 → 4.6 days' },
  ],
  leaderboard: [
    { id: 'hc-l1', persona: 'cfo', type: 'human', name: 'Rashid Al Balushi', initials: 'RB', avatarBg: '#B45309', actionsClosed: 28, onTimePct: 94, decisionWinRatePct: 80, timeSaved: '14h', trend: [15, 12, 13, 9, 6, 3], trendColor: '#16A34A' },
    { id: 'hc-l2', persona: 'cfo', type: 'agent', name: 'Revenue Cycle Worker', initials: 'RC', avatarBg: '#4F46E5', actionsClosed: 210, onTimePct: 98.6, decisionWinRatePct: 79, timeSaved: '88h', trend: [16, 13, 11, 10, 7, 4], trendColor: '#16A34A' },
    { id: 'hc-l3', persona: 'operations_head', type: 'human', name: 'Dr. Meera Nair', initials: 'MN', avatarBg: '#0E7490', actionsClosed: 24, onTimePct: 90, decisionWinRatePct: 86, timeSaved: '9h', trend: [13, 11, 12, 8, 8, 5], trendColor: '#16A34A' },
    { id: 'hc-l4', persona: 'fpa', type: 'human', name: 'Anita Mathew', initials: 'AM', avatarBg: '#1D4ED8', actionsClosed: 19, onTimePct: 91, decisionWinRatePct: 77, timeSaved: '8h', trend: [14, 12, 11, 10, 9, 7], trendColor: '#16A34A' },
    { id: 'hc-l5', persona: 'commercial_finance', type: 'human', name: 'Sana Qureshi', initials: 'SQ', avatarBg: '#7C3AED', actionsClosed: 12, onTimePct: 68, decisionWinRatePct: 55, timeSaved: '4h', trend: [18, 19, 20, 22, 24, 26], trendColor: '#DC2626' },
    { id: 'hc-l6', persona: 'operations_head', type: 'human', name: 'Fatima Al Marri', initials: 'FA', avatarBg: '#BE185D', actionsClosed: 17, onTimePct: 88, decisionWinRatePct: 72, timeSaved: '6h', trend: [10, 12, 9, 11, 8, 7], trendColor: '#D97706' },
    { id: 'hc-l7', persona: 'operations_head', type: 'agent', name: 'Clinical Risk Worker', initials: 'CR', avatarBg: '#4F46E5', actionsClosed: 64, onTimePct: 97, decisionWinRatePct: 71, timeSaved: '31h', trend: [8, 10, 7, 9, 10, 8], trendColor: '#A8A29E' },
    { id: 'hc-l8', persona: 'operations_head', type: 'human', name: 'Ravi Menon', initials: 'RM', avatarBg: '#0F766E', actionsClosed: 15, onTimePct: 86, decisionWinRatePct: 73, timeSaved: '5h', trend: [12, 10, 13, 10, 9, 9], trendColor: '#A8A29E' },
  ],
  loopSpeed: [
    { id: 'hc-ls-denial', persona: 'cfo', mandate: 'Claim denial rate', stream: 'Revenue cycle', owner: { name: 'Rashid Al Balushi', initials: 'RB', avatarBg: '#B45309' }, agent: 'Revenue cycle agent', findings90d: 4, medianTimeToDecide: '4h', medianTimeToClose: '9 days', closedInWindowPct: 84, trend: [22, 19, 16, 13, 11, 9], trendColor: '#16A34A' },
    { id: 'hc-ls-noshow', persona: 'operations_head', mandate: 'No-show rate', stream: 'Patient experience', owner: { name: 'Fatima Al Marri', initials: 'FA', avatarBg: '#BE185D' }, agent: 'Patient experience agent', findings90d: 3, medianTimeToDecide: '7h', medianTimeToClose: '14 days', closedInWindowPct: 76, trend: [20, 19, 17, 16, 15, 14], trendColor: '#16A34A' },
    { id: 'hc-ls-cleanclaim', persona: 'cfo', mandate: 'Clean claim rate', stream: 'Revenue cycle', owner: { name: 'Rashid Al Balushi', initials: 'RB', avatarBg: '#B45309' }, agent: 'Revenue cycle agent', findings90d: 3, medianTimeToDecide: '11h', medianTimeToClose: '16 days', closedInWindowPct: 70, trend: [21, 20, 19, 18, 17, 16], trendColor: '#16A34A' },
    { id: 'hc-ls-alos', persona: 'operations_head', mandate: 'Average length of stay', stream: 'Clinical operations', owner: { name: 'Dr. Meera Nair', initials: 'MN', avatarBg: '#0E7490' }, agent: 'Clinical ops agent', findings90d: 2, medianTimeToDecide: '16h', medianTimeToClose: '25 days', closedInWindowPct: 60, trend: [28, 27, 27, 26, 25, 25], trendColor: '#A8A29E' },
    { id: 'hc-ls-mederror', persona: 'operations_head', mandate: 'Medication error rate', stream: 'Pharmacy operations', owner: { name: 'Ravi Menon', initials: 'RM', avatarBg: '#0F766E' }, agent: 'Pharmacy agent', findings90d: 1, medianTimeToDecide: '9h', medianTimeToClose: '28 days', closedInWindowPct: 58, trend: [30, 29, 29, 28, 28, 28], trendColor: '#A8A29E' },
    { id: 'hc-ls-ar', persona: 'fpa', mandate: 'Days in AR', stream: 'Finance', owner: { name: 'Anita Mathew', initials: 'AM', avatarBg: '#1D4ED8' }, agent: 'Finance agent', findings90d: 3, medianTimeToDecide: '22h', medianTimeToClose: '34 days', closedInWindowPct: 47, trend: [26, 28, 30, 31, 33, 34], trendColor: '#D97706' },
    { id: 'hc-ls-tariff', persona: 'commercial_finance', mandate: 'Realized rate vs contracted tariff', stream: 'Revenue cycle', owner: { name: 'Sana Qureshi', initials: 'SQ', avatarBg: '#7C3AED' }, agent: 'Payer contracting agent', findings90d: 4, medianTimeToDecide: '38h', medianTimeToClose: '52 days', closedInWindowPct: 33, trend: [34, 38, 41, 45, 48, 52], trendColor: '#DC2626' },
    { id: 'hc-ls-agency', persona: 'coo', mandate: 'Agency staffing %', stream: 'People', owner: { name: 'Noura Khalid', initials: 'NK', avatarBg: '#C2410C' }, agent: 'People agent', findings90d: 2, medianTimeToDecide: '29h', medianTimeToClose: '41 days', closedInWindowPct: 39, trend: [33, 35, 36, 38, 40, 41], trendColor: '#DC2626' },
  ],
  outcomeReports: {
    latest: {
      runId: 'latest', title: 'Revenue Cycle Outcome — May 2026', runMeta: 'Revenue Cycle Worker · run completed in 7m 12s · approved by Rashid', published: true,
      scoreCards: [
        { id: 'sc1', label: 'Days in AR', value: '68', deltaLabel: '▲ 23 days vs plan', deltaTone: 'red', sparkline: [9, 11, 13, 16, 17, 20, 21, 23], sparklineColor: '#DC2626' },
        { id: 'sc2', label: 'Denial rate', value: '11.8%', deltaLabel: '▲ 3.8 pts vs target', deltaTone: 'red', sparkline: [8, 10, 9, 13, 12, 17, 19, 22], sparklineColor: '#DC2626' },
        { id: 'sc3', label: 'Clean claim rate', value: '89%', deltaLabel: '▲ recovering', deltaTone: 'green', sparkline: [15, 14, 16, 14, 15, 13, 14, 13], sparklineColor: '#16A34A' },
        { id: 'sc4', label: 'POS collections', value: '41%', deltaLabel: '◷ watch', deltaTone: 'amber', sparkline: [18, 16, 17, 14, 16, 13, 15, 12], sparklineColor: '#D97706' },
      ],
      insights: [
        { id: 'i1', icon: '🎯', iconBg: 'var(--red-soft)', title: 'Rejections are concentrated in two payers', text: '78% of the rejection step comes from Daman and Sukoon, which tightened prior approval rules without contractual notice — a contract problem, not a coding one.' },
        { id: 'i2', icon: '📉', iconBg: 'var(--amber-soft)', title: 'Clean claim rate drives AR days', text: 'Every point of clean-claim rate is worth roughly 1.5 days of AR — the eClaimLink edit backlog is the lever.' },
        { id: 'i3', icon: '💡', iconBg: 'var(--green-soft)', title: 'Point-of-service collection is the quiet win', text: 'Lifting POS collections from 41% to 60% at the Sharjah centres would pull ≈ AED 5.1M forward with no impact on patients already covered.' },
        { id: 'i4', icon: '🔁', iconBg: 'var(--teal-soft)', title: 'The batch-appeal decision is confirmed', text: 'The Daman + Sukoon appeal batch (Decision Ledger, 12 May) recovered +AED 2.3M — verdict updated to "Worked".' },
      ],
      actions: [
        { id: 'a1', title: 'Automate prior approval checks for Daman and Sukoon', subtitle: 'Est. −3 pts rejection rate · owner suggested: Rashid', assigned: false, assignedTo: 'Rashid', actionType: 'assign' },
        { id: 'a2', title: 'Add POS collection prompts at registration', subtitle: 'Est. +AED 5.1M pulled forward · owner: Fatima', assigned: false, assignedTo: 'Fatima', actionType: 'assign' },
        { id: 'a3', title: 'Re-run the scrub with June remit data', subtitle: 'Scheduled run · 1 July 07:00', assigned: false, actionType: 'schedule' },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Manufacturing
// ---------------------------------------------------------------------------
const mfgAgents = [
  { agentId: 'mfg-a-predmaint', state: 'live', name: 'Predictive Maintenance Worker', function: 'Maintenance', capabilitiesCount: 4, dataInputs: 'CMMS · vibration · runtime', reviewGate: 'Human approval · PM schedule', owner: { name: 'Hassan Jaber', initials: 'HJ', avatarBg: '#B45309' }, guardrails: 'Proposes PMs · planner releases work orders', estRuntime: '5–7 min', description: 'Predicts bearing and hydraulic failures on constrained assets and pulls preventive work forward before breakdown.', industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['CMMS work orders', 'Vibration sensors'], outputsSummary: ['Failure risk ranking', 'PM schedule'], roiToDate: { label: 'Downtime avoided', value: '−14 h/wk', direction: 'up' }, tokenCostToDate: { tokens: 340000, estCost: '$31.50' }, runsCount: 178, lastRunAt: '1h ago', mandateIds: ['mfg-k-unplanned', 'mfg-k-pmcomp'] },
  { agentId: 'mfg-a-oee', state: 'live', name: 'OEE Loss Analyst', function: 'Production', capabilitiesCount: 3, dataInputs: 'MES telemetry', reviewGate: 'Shift-lead review · step 4', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, guardrails: 'No line-speed changes without sign-off', estRuntime: '4–6 min', description: 'Decomposes shift OEE into availability, performance and quality losses and ranks the top recoverable causes.', industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['MES historian'], outputsSummary: ['Loss tree', 'Top-3 actions'], roiToDate: { label: 'OEE gained', value: '+4 pts', direction: 'up' }, tokenCostToDate: { tokens: 220000, estCost: '$20.40' }, runsCount: 132, lastRunAt: '2h ago', mandateIds: ['mfg-k-oee'] },
  { agentId: 'mfg-a-supotif', state: 'live', name: 'Supplier OTIF Worker', function: 'Supplier network', capabilitiesCount: 3, dataInputs: 'PO lines · receipts', reviewGate: 'Human approval · dual-source', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#0E7490' }, guardrails: 'Recommends only · no PO commitments', estRuntime: '4–6 min', description: 'Ranks suppliers by on-time-in-full and isolates the few vendors gating the majority of late customer orders.', industry: 'manufacturing', function2: 'procurement', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['ERP purchase orders', 'Supplier promise dates'], outputsSummary: ['Supplier scorecard', 'Dual-source shortlist'], roiToDate: { label: 'OTIF gained', value: '+9 pts', direction: 'up' }, tokenCostToDate: { tokens: 180000, estCost: '$16.70' }, runsCount: 98, lastRunAt: '4h ago', mandateIds: ['mfg-k-supotd'] },
  { agentId: 'mfg-a-scrap', state: 'live', name: 'Scrap Root-Cause Worker', function: 'Quality', capabilitiesCount: 4, dataInputs: 'QC inspections · MES', reviewGate: 'Human approval · step 3', owner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D' }, guardrails: 'No tooling changes without quality sign-off', estRuntime: '5–7 min', description: 'Traces scrap spikes to part families, tooling and process windows to separate defects from operator variation.', industry: 'manufacturing', function2: 'it', persona: 'store_manager', catalogStatus: 'live', creationPath: 'studio', inputsSummary: ['QC inspections', 'MES telemetry'], outputsSummary: ['Root-cause report', 'Containment actions'], roiToDate: { label: 'Scrap reduced', value: '−0.8 pt', direction: 'up' }, tokenCostToDate: { tokens: 240000, estCost: '$22.30' }, runsCount: 76, lastRunAt: '5h ago', mandateIds: ['mfg-k-scrap'] },
  { agentId: 'mfg-a-changeover', state: 'live', name: 'Changeover SMED Worker', function: 'Production', capabilitiesCount: 3, dataInputs: 'MES · changeover logs', reviewGate: 'Shift-lead review', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, guardrails: 'Advisory · crew confirms sequence', estRuntime: '3–5 min', description: 'Breaks changeovers into internal and external steps and proposes a shorter, standardized sequence per SKU pair.', industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat', inputsSummary: ['MES telemetry', 'Changeover logs'], outputsSummary: ['SMED playbook', 'Time-saving estimate'], roiToDate: { label: 'Changeover cut', value: '−12 min', direction: 'up' }, tokenCostToDate: { tokens: 150000, estCost: '$13.90' }, runsCount: 61, lastRunAt: '1d ago', mandateIds: ['mfg-k-throughput'] },
  { agentId: 'mfg-a-energy', state: 'paused', name: 'Energy-per-Unit Worker', function: 'Production · Finance', capabilitiesCount: 3, dataInputs: 'Meters · production counts', reviewGate: 'Human approval · step 2', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, guardrails: 'Flags only · no equipment control', estRuntime: '3–4 min', description: 'Tracks energy consumed per unit and flags compressor leaks and idle-running equipment eroding unit cost.', industry: 'manufacturing', function2: 'finance', persona: 'cfo', catalogStatus: 'paused', creationPath: 'studio', inputsSummary: ['Energy meters', 'Production counts'], outputsSummary: ['Energy-per-unit trend', 'Leak/idle flags'], roiToDate: { label: 'Unit cost', value: '−1.2%', direction: 'up' }, tokenCostToDate: { tokens: 120000, estCost: '$11.10' }, runsCount: 44, lastRunAt: '2d ago', mandateIds: ['mfg-k-costvar'] },
];

const manufacturing = {
  agentCatalog: mfgAgents,
  dashboardSummary: {
    greetingName: 'Kumara',
    summarySentence:
      'Since yesterday, Rewive executed <b style="color:var(--ink)">71 actions</b> across production and maintenance. Your queue is below.',
  },
  pendingDecisions: [
    { id: 'mfg-dec1', icon: '🛠️', iconBg: 'var(--red-soft)', title: 'Press line · PM overdue, breakdown risk in 5 days', subtitle: 'Maintenance Worker recommends pulling PMs forward · 22h/wk downtime at stake', actionLabel: 'Act', actionVerb: 'act', persona: 'operations_head' },
    { id: 'mfg-dec2', icon: '📦', iconBg: 'var(--amber-soft)', title: 'Castings supplier · 2 vendors gate 60% of late orders', subtitle: 'Supplier Worker proposes dual-sourcing · OTIF 84%→95%', actionLabel: 'Approve', actionVerb: 'approve', persona: 'cfo' },
    { id: 'mfg-dec3', icon: '🔧', iconBg: 'var(--teal-soft)', title: 'B-housing scrap doubled after tooling refresh', subtitle: 'Production Worker · vendor inspection report ready for review', actionLabel: 'Review', actionVerb: 'act', persona: 'store_manager' },
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
  topPerformer: { id: 'mfg-hassan', name: 'Hassan Jaber', avatarBg: '#B45309', initials: 'HJ', badge: '93% on-time', statLine: 'Closed 26 work orders · paired with Maintenance Worker · 19h downtime avoided' },
  runs: [
    { id: 'mfg-run-oee', persona: 'operations_head', name: 'OEE loss analysis · Line 3 shift', owner: { name: 'Priya', initials: 'PR', avatarBg: '#7C3AED' }, agentName: 'Production Worker', status: 'running', duration: '5m 05s', outcome: '—' },
    { id: 'mfg-run-pm', persona: 'operations_head', name: 'PM schedule optimizer · week 28', owner: { name: 'Hassan', initials: 'HJ', avatarBg: '#B45309' }, agentName: 'Maintenance Worker', status: 'running', duration: '6m 30s', outcome: '—' },
    { id: 'mfg-run-supplier', persona: 'cfo', name: 'Supplier OTIF scorecard', owner: { name: 'Omar', initials: 'OF', avatarBg: '#0E7490' }, agentName: 'Supplier Worker', status: 'needs_decision', duration: 'paused 2h', outcome: '2 vendors flagged' },
    { id: 'mfg-run-scrap', persona: 'store_manager', name: 'Scrap root-cause · B-housing', owner: { name: 'Amira', initials: 'AH', avatarBg: '#BE185D' }, agentName: 'Quality Worker', status: 'completed', duration: '7m 18s', outcome: 'tooling defect confirmed' },
    { id: 'mfg-run-energy', persona: 'cfo', name: 'Energy-per-unit scan · daily', owner: { name: 'Priya', initials: 'PR', avatarBg: '#7C3AED' }, agentName: 'Production Worker', status: 'completed', duration: '3m 12s', outcome: '1 flag · compressor leak' },
    { id: 'mfg-run-spares', persona: 'operations_head', name: 'Spare-parts reorder · weekly', owner: { name: 'Hassan', initials: 'HJ', avatarBg: '#B45309' }, agentName: 'Maintenance Worker', status: 'failed', duration: '0m 44s', outcome: 'ERP timeout · retried ✓' },
  ],
  runDetails: {
    'mfg-run-oee': {
      id: 'mfg-run-oee', persona: 'operations_head', name: 'OEE loss analysis — Line 3, night shift', meta: 'Production Worker · started 22:10 by Priya · est. finish 22:19', isLive: true,
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
    { id: 'mfg-exc2', runId: 'mfg-run-supplier', runName: 'Supplier OTIF scorecard', severity: 'warning', message: 'Worker is unsure how to weight 3 partial deliveries — needs your input.', status: 'open', createdAt: '3h ago' },
  ],
  runChases: [
    { id: 'mfg-chase1', runId: 'mfg-run-supplier', runName: 'Supplier OTIF scorecard', trigger: 'sla', note: 'Dual-sourcing decision has waited 2h — the castings shortage hits final assembly Thursday.', escalatedTo: 'Supply chain manager', createdAt: '55m ago' },
  ],
  // decisionStats derived server-side — see mock-server/halfyear.js.
  decisionLedger: [
    { id: 'mfg-led1', persona: 'operations_head', title: 'Pull PMs forward on the press line', subtitle: 'Unplanned downtime driver, Q2', madeBy: { type: 'human', name: 'Hassan', initials: 'HJ', avatarBg: '#B45309' }, informedBy: { type: 'agent', name: 'Maintenance Worker' }, date: '12 May', verdict: 'worked', measuredImpact: { text: '−14 h/wk downtime', direction: 'up' }, function: 'maintenance', findingId: 'mfg-f-1', assessorNote: 'Assessor agent: unplanned downtime on the constraint line fell from 22 h/wk to 9 h/wk within four weeks of restoring PM compliance — confirmed against the same CMMS work-order feed.', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
    { id: 'mfg-led2', persona: 'cfo', title: 'Dual-source two castings suppliers', subtitle: 'OTIF slide root cause', madeBy: { type: 'human', name: 'Omar', initials: 'OF', avatarBg: '#0E7490' }, informedBy: { type: 'agent', name: 'Supplier Worker' }, date: '29 Apr', verdict: 'worked', measuredImpact: { text: '+9 pts OTIF', direction: 'up' }, function: 'procurement', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
    { id: 'mfg-led3', persona: 'operations_head', title: 'Standardize changeovers on Line 3', subtitle: 'SMED pilot', madeBy: { type: 'human', name: 'Priya', initials: 'PR', avatarBg: '#7C3AED' }, informedBy: { type: 'agent', name: 'Production Worker' }, date: '21 Apr', verdict: 'too_early', measuredImpact: { text: 'measuring…', direction: 'flat' }, function: 'operations', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
    { id: 'mfg-led4', persona: 'store_manager', title: 'Return B-housing tooling to vendor', subtitle: 'Scrap spike after refresh', madeBy: { type: 'human', name: 'Amira', initials: 'AH', avatarBg: '#BE185D' }, informedBy: { type: 'agent', name: 'Quality Worker' }, date: '15 Apr', verdict: 'worked', measuredImpact: { text: '−0.8 pt scrap', direction: 'up' }, function: 'quality', entity: 'Plant 2 — Dammam', region: 'KSA' },
    { id: 'mfg-led5', persona: 'cfo', title: 'Auto-release POs under $1k to approved vendors', subtitle: 'Process decision · worker autonomous', madeBy: { type: 'agent', name: 'Maintenance Worker' }, informedBy: { type: 'policy', name: 'policy' }, date: 'ongoing', verdict: 'worked', measuredImpact: { text: '15h / month saved', direction: 'up' }, function: 'procurement', entity: 'Plant 1 — Jebel Ali', region: 'UAE' },
  ],
  leaderboardHighlights: [
    { id: 'mfg-h1', medal: '🥇', tag: 'Most effective · people', name: 'Hassan Jaber', avatarBg: '#B45309', initials: 'HJ', statLine: '26 work orders · 93% on-time · 19h downtime avoided' },
    { id: 'mfg-h2', medal: '🤖', tag: 'Top worker', name: 'Maintenance Worker', avatarBg: '#4F46E5', initials: 'MA', statLine: '178 runs · 98.1% success · $1.4M avoided' },
    { id: 'mfg-h3', medal: '⚡', tag: 'Best human + worker pair', name: 'Priya + Production Worker', avatarBg: '#7C3AED', initials: 'PR', statLine: 'OEE 64% → 71%' },
  ],
  leaderboard: [
    { id: 'mfg-l1', persona: 'operations_head', type: 'human', name: 'Hassan Jaber', initials: 'HJ', avatarBg: '#B45309', actionsClosed: 26, onTimePct: 93, decisionWinRatePct: 82, timeSaved: '13h', trend: [15, 12, 13, 9, 6, 3], trendColor: '#16A34A' },
    { id: 'mfg-l2', persona: 'operations_head', type: 'agent', name: 'Maintenance Worker', initials: 'MA', avatarBg: '#4F46E5', actionsClosed: 178, onTimePct: 98.1, decisionWinRatePct: 78, timeSaved: '76h', trend: [16, 13, 11, 10, 7, 4], trendColor: '#16A34A' },
    { id: 'mfg-l3', persona: 'operations_head', type: 'human', name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED', actionsClosed: 23, onTimePct: 91, decisionWinRatePct: 85, timeSaved: '10h', trend: [13, 11, 12, 8, 8, 5], trendColor: '#16A34A' },
    { id: 'mfg-l4', persona: 'cfo', type: 'human', name: 'Omar Farouk', initials: 'OF', avatarBg: '#0E7490', actionsClosed: 18, onTimePct: 88, decisionWinRatePct: 73, timeSaved: '6h', trend: [10, 12, 9, 11, 8, 7], trendColor: '#D97706' },
    { id: 'mfg-l5', persona: 'operations_head', type: 'agent', name: 'Production Worker', initials: 'PA', avatarBg: '#4F46E5', actionsClosed: 61, onTimePct: 97, decisionWinRatePct: 70, timeSaved: '30h', trend: [8, 10, 7, 9, 10, 8], trendColor: '#A8A29E' },
    { id: 'mfg-l6', persona: 'store_manager', type: 'human', name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D', actionsClosed: 16, onTimePct: 86, decisionWinRatePct: 74, timeSaved: '5h', trend: [12, 10, 13, 10, 9, 9], trendColor: '#A8A29E' },
  ],
  loopSpeed: [
    { id: 'mfg-ls-unplanned', persona: 'operations_head', mandate: 'Unplanned downtime', stream: 'Maintenance', owner: { name: 'Hassan Jaber', initials: 'HJ', avatarBg: '#B45309' }, agent: 'Maintenance agent', findings90d: 3, medianTimeToDecide: '5h', medianTimeToClose: '8 days', closedInWindowPct: 82, trend: [20, 17, 14, 12, 10, 8], trendColor: '#16A34A' },
    { id: 'mfg-ls-scrap', persona: 'operations_head', mandate: 'Scrap rate', stream: 'Production', owner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED' }, agent: 'Production agent', findings90d: 3, medianTimeToDecide: '8h', medianTimeToClose: '13 days', closedInWindowPct: 73, trend: [19, 18, 16, 15, 14, 13], trendColor: '#16A34A' },
    { id: 'mfg-ls-supotd', persona: 'cfo', mandate: 'Supplier OTIF', stream: 'Supplier network', owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#0E7490' }, agent: 'Supplier network agent', findings90d: 2, medianTimeToDecide: '13h', medianTimeToClose: '22 days', closedInWindowPct: 64, trend: [26, 25, 24, 24, 23, 22], trendColor: '#16A34A' },
    { id: 'mfg-ls-fpy', persona: 'store_manager', mandate: 'First-pass yield', stream: 'Quality', owner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D' }, agent: 'Quality agent', findings90d: 2, medianTimeToDecide: '15h', medianTimeToClose: '26 days', closedInWindowPct: 57, trend: [27, 27, 26, 26, 26, 26], trendColor: '#A8A29E' },
    { id: 'mfg-ls-costvar', persona: 'cfo', mandate: 'Cost variance vs standard', stream: 'Finance', owner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8' }, agent: 'Finance agent', findings90d: 2, medianTimeToDecide: '24h', medianTimeToClose: '34 days', closedInWindowPct: 45, trend: [29, 30, 31, 32, 33, 34], trendColor: '#D97706' },
    { id: 'mfg-ls-nearmiss', persona: 'coo', mandate: 'Near-miss reporting', stream: 'Safety', owner: { name: 'Noura Khalid', initials: 'NK', avatarBg: '#C2410C' }, agent: 'Safety agent', findings90d: 1, medianTimeToDecide: '36h', medianTimeToClose: '44 days', closedInWindowPct: 35, trend: [36, 38, 39, 41, 43, 44], trendColor: '#DC2626' },
  ],
  outcomeReports: {
    latest: {
      runId: 'latest', title: 'Production Outcome — May 2026', runMeta: 'Production Worker · run completed in 7m 44s · approved by Priya', published: true,
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
