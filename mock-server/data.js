// Seed data mirroring the original static prototype, used by the mock API server.

export const currentUser = {
  name: 'Kumara Vijayan',
  initials: 'KV',
  avatarBg: '#4F46E5',
  role: 'Co-founder · Admin',
  isAdmin: true,
  defaultPersona: 'operations_head',
};

export const personaKpiOverrides = {
  store_manager: {
    actionsExecutedToday: { value: 22, delta: { label: '▲ 4 vs yesterday', direction: 'up' } },
    agentsActiveNow: { value: 3, delta: { label: '1 running', direction: 'flat' } },
    timeSavedThisWeek: { value: '9h', delta: { label: '▲ 2h vs last week', direction: 'up' } },
    onTimeExecution: { value: '91%', delta: { label: '▼ 1 pt', direction: 'down' } },
  },
  cfo: {
    actionsExecutedToday: { value: 34, delta: { label: '▲ 6% vs yesterday', direction: 'up' } },
    agentsActiveNow: { value: 5, delta: { label: '2 running', direction: 'flat' } },
    timeSavedThisWeek: { value: '18h', delta: { label: '▲ 3h vs last week', direction: 'up' } },
    onTimeExecution: { value: '96%', delta: { label: '▲ 1 pt', direction: 'up' } },
  },
  operations_head: {
    actionsExecutedToday: { value: 31, delta: { label: '▲ 8% vs yesterday', direction: 'up' } },
    agentsActiveNow: { value: 4, delta: { label: '2 running', direction: 'flat' } },
    timeSavedThisWeek: { value: '14h', delta: { label: '▲ 4h vs last week', direction: 'up' } },
    onTimeExecution: { value: '93%', delta: { label: '▲ 1 pt', direction: 'up' } },
  },
};

export const dashboardSummary = {
  greetingName: 'Kumara',
  summarySentence:
    'Since yesterday, Rewive executed <b style="color:var(--ink)">87 actions</b> across Finance and HR. Your queue is below.',
  kpis: {
    actionsExecutedToday: { value: 87, delta: { label: '▲ 12% vs yesterday', direction: 'up' } },
    decisionsPending: { value: 4, delta: { label: '2 urgent', direction: 'flat' } },
    agentsActiveNow: { value: 12, delta: { label: '3 running', direction: 'flat' } },
    timeSavedThisWeek: { value: '41h', delta: { label: '▲ 9h vs last week', direction: 'up' } },
    onTimeExecution: { value: '94%', delta: { label: '▲ 2 pts', direction: 'up' } },
  },
};

export let pendingDecisions = [
  {
    id: 'dec1',
    icon: '📊',
    iconBg: 'var(--amber-soft)',
    title: 'FP&A Margin Run · variance commentary ready',
    subtitle: 'Profitability Agent · needs approval before it reaches the board pack',
    actionLabel: 'Approve',
    actionVerb: 'approve',
    persona: 'cfo',
  },
  {
    id: 'dec2',
    icon: '⚠️',
    iconBg: 'var(--red-soft)',
    title: 'Pricing anomaly · SKU 4417 margin −6.2% in KSA',
    subtitle: 'Anomaly Agent recommends repricing · est. impact +AED 84k / qtr',
    actionLabel: 'Act',
    actionVerb: 'act',
    persona: 'commercial_finance',
  },
  {
    id: 'dec3',
    icon: '🧾',
    iconBg: 'var(--teal-soft)',
    title: 'Month-end close · 2 reconciliation exceptions',
    subtitle: 'Close Agent paused at review gate · waiting 3h 12m',
    actionLabel: 'Clear',
    actionVerb: 'clear',
    persona: 'cfo',
  },
  {
    id: 'dec4',
    icon: '👥',
    iconBg: 'var(--accent-soft)',
    title: 'HR Screening · 14 candidates shortlisted for review',
    subtitle: 'Screening Agent · confidence 92% · Devaki tagged as reviewer',
    actionLabel: 'Release',
    actionVerb: 'release',
    persona: 'operations_head',
  },
  {
    id: 'dec5',
    icon: '🚚',
    iconBg: 'var(--amber-soft)',
    title: 'Vendor invoice cost drainer · consolidation ready for sign-off',
    subtitle: 'Signal Studio · 3 overlapping logistics vendors identified',
    actionLabel: 'Review',
    actionVerb: 'act',
    persona: 'operations_head',
  },
];

export const pulse = [
  {
    id: 'p1',
    dotColor: 'var(--green)',
    html: '<b>78% of decisions</b> made through Rewive this quarter are confirmed as <b>worked</b> — up from 61% last quarter.',
  },
  {
    id: 'p2',
    dotColor: 'var(--accent)',
    html: '<b>Finance</b> is the fastest function: median time-to-decision down from <b>2.1 days to 4 hours</b>.',
  },
  {
    id: 'p3',
    dotColor: 'var(--amber)',
    html: '<b>3 actions</b> from last week\'s margin review are still unassigned. <span style="color:var(--accent);font-weight:600;cursor:pointer">Assign now →</span>',
  },
];

export const liveRuns = [
  {
    id: 'run-fpa-may',
    name: 'FP&A Full Analysis · May data',
    eta: '~4 min left',
    percent: 62,
    stepDescription: 'Step 4 of 6 — building margin waterfall',
  },
  {
    id: 'run-cashflow-q3',
    name: 'Cash-flow Forecast · Q3',
    eta: '~2 min left',
    percent: 81,
    stepDescription: 'Step 5 of 6 — scenario synthesis',
  },
  {
    id: 'run-hr-eng',
    name: 'HR Screening · Eng cohort',
    eta: 'finishing',
    percent: 93,
    barColor: 'var(--teal)',
    stepDescription: 'Step 6 of 6 — ranking candidates',
  },
];

export const topPerformer = {
  id: 'sanju',
  name: 'Sanju Mathew',
  avatarBg: '#0D9488',
  initials: 'SJ',
  badge: '96% on-time',
  statLine: 'Closed 31 actions · paired with Profitability Agent · 11h saved',
};

export const runDetails = {
  'run-fpa-may': {
    id: 'run-fpa-may',
    name: 'FP&A Full Analysis — May 2026 actuals',
    meta: 'Margin Leakage Agent · started 14:02 by Sanju · est. finish 14:11 (9 min total)',
    isLive: true,
    steps: [
      { id: 's1', status: 'done', label: 'Ingest & validate data', description: '3 files · 41,209 rows · columns auto-detected (Budget, Actual, SKU, Region)', duration: '1m 12s' },
      { id: 's2', status: 'done', label: 'Variance analysis', description: 'Budget vs actuals across 6 regions · 14 variances above threshold', duration: '2m 04s' },
      { id: 's3', status: 'live', label: 'Margin waterfall', description: 'Decomposing gross-margin bridge by price, volume, mix, cost…', duration: 'running' },
      { id: 's4', status: 'gate', label: "Review gate — variance commentary", description: "Will pause for Praveen's approval before publishing", duration: 'waiting' },
      { id: 's5', status: 'wait', icon: '5', label: 'Publish outcome scorecard', description: 'Scorecard, narrative, recommended actions', duration: '—' },
    ],
  },
};

export const runs = [
  { id: 'run-cashflow-q3', name: 'Cash-flow Forecast · Q3', owner: { name: 'Ganesh', initials: 'GR', avatarBg: '#4F46E5' }, agentName: 'Forecast Agent', status: 'running', duration: '6m 12s', outcome: '—' },
  { id: 'run-hr-eng', name: 'HR Screening · Eng cohort', owner: { name: 'Devaki', initials: 'DH', avatarBg: '#0D9488' }, agentName: 'Screening Agent', status: 'running', duration: '8m 47s', outcome: '—' },
  { id: 'run-close-may', name: 'Month-end close · May', owner: { name: 'Praveen', initials: 'PJ', avatarBg: '#D97706' }, agentName: 'Close Agent', status: 'needs_decision', duration: 'paused 3h', outcome: '2 exceptions' },
  { id: 'run-profit-gcc', name: 'Profitability by customer · GCC', owner: { name: 'Sanju', initials: 'SJ', avatarBg: '#0D9488' }, agentName: 'Profitability Agent', status: 'completed', duration: '7m 31s', outcome: '+AED 84k found' },
  { id: 'run-anomaly-daily', name: 'Pricing anomaly scan · daily', owner: { name: 'Ganesh', initials: 'GR', avatarBg: '#4F46E5' }, agentName: 'Anomaly Agent', status: 'completed', duration: '3m 02s', outcome: '1 flag · SKU 4417' },
  { id: 'run-vendor-recon', name: 'Vendor reconciliation · weekly', owner: { name: 'Devaki', initials: 'DH', avatarBg: '#0D9488' }, agentName: 'Recon Agent', status: 'failed', duration: '0m 41s', outcome: 'source timeout · retried ✓' },
];

export const runExceptions = [
  { id: 'exc1', runId: 'run-vendor-recon', runName: 'Vendor reconciliation · weekly', severity: 'error', message: 'Source SFTP connection timed out after 3 retries — run failed.', status: 'open', createdAt: '2h ago' },
  { id: 'exc2', runId: 'run-close-may', runName: 'Month-end close · May', severity: 'warning', message: 'Agent is unsure how to classify 2 reconciliation exceptions — needs your input.', status: 'open', createdAt: '3h ago' },
  { id: 'exc3', runId: 'run-anomaly-daily', runName: 'Pricing anomaly scan · daily', severity: 'info', message: 'Connector latency was elevated for 4 minutes, retried automatically, no data lost.', status: 'resolved', createdAt: '1d ago' },
];

export const runChases = [
  { id: 'chase1', runId: 'run-close-may', runName: 'Month-end close · May', trigger: 'sla', note: 'Review gate has waited 3h 12m with no response — past the 2h service window.', escalatedTo: 'Praveen Jagadeesan’s manager', createdAt: '1h ago' },
];

export const decisionStats = {
  trackedQtd: { value: 142, delta: { label: '▲ 38 vs last qtr', direction: 'up' } },
  winRate: { value: '78%', delta: { label: '▲ from 61%', direction: 'up' } },
  medianTimeToDecision: { value: '4.0h', delta: { label: 'was 2.1 days', direction: 'up' } },
  measuredImpactQtd: { value: 'AED 1.2M', delta: { label: '31 decisions measured', direction: 'flat' } },
};

export const decisionLedger = [
  { id: 'led0', title: 'Accept — OSA back above 96% in top-40 stores', subtitle: 'On-shelf availability finding · exit condition watched', madeBy: { type: 'human', name: 'Layla Nasser', initials: 'LN', avatarBg: '#0D9488' }, informedBy: { type: 'agent', name: 'Commercial counterpart' }, date: '02 Jun', verdict: 'too_early', measuredImpact: { text: 'measuring…', direction: 'flat' }, function: 'finance', findingId: 'fmcg-f-5' },
  { id: 'led1', title: 'Reprice SKU 2210 family in UAE', subtitle: 'Margin leakage driver #1, May run', madeBy: { type: 'human', name: 'Praveen', initials: 'PJ', avatarBg: '#D97706' }, informedBy: { type: 'agent', name: 'Profitability Agent' }, date: '12 May', verdict: 'worked', measuredImpact: { text: '+AED 210k / qtr', direction: 'up' }, function: 'finance', originatingSignalId: 'sig1', assessorNote: 'Assessor agent: margin on the SKU 4417/2210 family recovered from -6.2% to -1.1% within 6 weeks of repricing, well ahead of the 3-week target — independently confirmed against the same gross-margin field used to raise the original signal.' },
  { id: 'led2', title: 'Consolidate 3 logistics vendors', subtitle: 'Cost optimization recommendation', madeBy: { type: 'human', name: 'Ganesh', initials: 'GR', avatarBg: '#4F46E5' }, informedBy: { type: 'agent', name: 'Cost Agent' }, date: '28 Apr', verdict: 'worked', measuredImpact: { text: '+AED 95k / qtr', direction: 'up' }, function: 'procurement', originatingSignalId: 'sig3', assessorNote: 'Assessor agent: invoice overlap across the 3 flagged vendors dropped to zero after consolidation — confirmed against the same vendor invoice feed, closing the signal that raised it.' },
  { id: 'led3', title: 'Hold hiring for support roles', subtitle: 'Forecast showed demand dip', madeBy: { type: 'human', name: 'Devaki', initials: 'DH', avatarBg: '#0D9488' }, informedBy: { type: 'agent', name: 'Forecast Agent' }, date: '21 Apr', verdict: 'too_early', measuredImpact: { text: 'measuring…', direction: 'flat' }, function: 'hr' },
  { id: 'led4', title: 'Extend payment terms — distributor KSA', subtitle: 'Cash-flow scenario B', madeBy: { type: 'human', name: 'Praveen', initials: 'PJ', avatarBg: '#D97706' }, informedBy: { type: 'agent', name: 'Forecast Agent' }, date: '14 Apr', verdict: 'not_worked', measuredImpact: { text: '−AED 40k DSO cost', direction: 'down' }, function: 'finance' },
  { id: 'led5', title: 'Shift Q2 spend to performance channels', subtitle: 'Customer-mix insight, March run', madeBy: { type: 'human', name: 'Sanju', initials: 'SJ', avatarBg: '#0D9488' }, informedBy: { type: 'agent', name: 'Profitability Agent' }, date: '02 Apr', verdict: 'worked', measuredImpact: { text: '+18% ROAS', direction: 'up' }, function: 'finance' },
  { id: 'led6', title: 'Auto-approve invoices < AED 500', subtitle: 'Process decision · agent autonomous', madeBy: { type: 'agent', name: 'Close Agent' }, informedBy: { type: 'policy', name: 'policy' }, date: 'ongoing', verdict: 'worked', measuredImpact: { text: '22h / month saved', direction: 'up' }, function: 'finance' },
];

export const leaderboardHighlights = [
  { id: 'h1', medal: '🥇', tag: 'Most efficient · people', name: 'Sanju Mathew', avatarBg: '#0D9488', initials: 'SJ', statLine: '31 actions · 96% on-time · 11h saved' },
  { id: 'h2', medal: '🤖', tag: 'Top agent', name: 'Profitability Agent', avatarBg: '#4F46E5', initials: 'PA', statLine: '124 runs · 99.2% success · AED 389k impact' },
  { id: 'h3', medal: '⚡', tag: 'Best human + agent pair', name: 'Praveen + Close Agent', avatarBg: '#D97706', initials: 'PJ', statLine: 'Close time 9 days → 3 days' },
];

export const leaderboard = [
  { id: 'l1', type: 'human', name: 'Sanju Mathew', initials: 'SJ', avatarBg: '#0D9488', actionsClosed: 31, onTimePct: 96, decisionWinRatePct: 83, timeSaved: '11h', trend: [16, 13, 14, 9, 7, 3], trendColor: '#16A34A' },
  { id: 'l2', type: 'agent', name: 'Profitability Agent', initials: 'PA', avatarBg: '#4F46E5', actionsClosed: 124, onTimePct: 99.2, decisionWinRatePct: 81, timeSaved: '64h', trend: [14, 12, 10, 10, 6, 4], trendColor: '#16A34A' },
  { id: 'l3', type: 'human', name: 'Praveen Jagadeesan', initials: 'PJ', avatarBg: '#D97706', actionsClosed: 22, onTimePct: 91, decisionWinRatePct: 88, timeSaved: '—', trend: [15, 11, 12, 8, 8, 5], trendColor: '#16A34A' },
  { id: 'l4', type: 'human', name: 'Devaki Habib', initials: 'DH', avatarBg: '#0D9488', actionsClosed: 19, onTimePct: 87, decisionWinRatePct: 74, timeSaved: '6h', trend: [10, 12, 9, 11, 8, 7], trendColor: '#D97706' },
  { id: 'l5', type: 'agent', name: 'Forecast Agent', initials: 'FA', avatarBg: '#4F46E5', actionsClosed: 58, onTimePct: 98, decisionWinRatePct: 69, timeSaved: '29h', trend: [8, 10, 7, 9, 10, 8], trendColor: '#A8A29E' },
  { id: 'l6', type: 'human', name: 'Ganesh Rajasekaran', initials: 'GR', avatarBg: '#4F46E5', actionsClosed: 17, onTimePct: 84, decisionWinRatePct: 71, timeSaved: '4h', trend: [12, 10, 13, 10, 9, 9], trendColor: '#A8A29E' },
];

export const outcomeReports = {
  latest: {
    runId: 'latest',
    title: 'FP&A Outcome — May 2026',
    runMeta: 'Margin Leakage Agent · run completed in 8m 41s · approved by Praveen',
    published: true,
    scoreCards: [
      { id: 'sc1', label: 'Revenue', value: 'AED 12.4M', deltaLabel: '▲ 6.2% vs budget', deltaTone: 'green', sparkline: [24, 21, 22, 16, 17, 12, 9, 5], sparklineColor: '#16A34A' },
      { id: 'sc2', label: 'Gross margin', value: '31.8%', deltaLabel: '▼ 1.4 pts vs budget', deltaTone: 'red', sparkline: [8, 10, 9, 13, 12, 17, 19, 22], sparklineColor: '#DC2626' },
      { id: 'sc3', label: 'Opex ratio', value: '18.2%', deltaLabel: '▲ on plan', deltaTone: 'green', sparkline: [15, 14, 16, 14, 15, 13, 14, 13], sparklineColor: '#16A34A' },
      { id: 'sc4', label: 'Cash conversion', value: '87 days', deltaLabel: '◷ watch', deltaTone: 'amber', sparkline: [18, 16, 17, 14, 16, 13, 15, 12], sparklineColor: '#D97706' },
    ],
    insights: [
      { id: 'i1', icon: '🎯', iconBg: 'var(--red-soft)', title: 'Margin leakage is concentrated, not systemic', text: '82% of the 1.4-pt margin miss comes from just two SKU families (2210, 4417) in UAE and KSA — price erosion, not cost inflation.' },
      { id: 'i2', icon: '📉', iconBg: 'var(--amber-soft)', title: 'Discounting is outpacing volume gains', text: 'Channel discounts rose 3.1 pts QoQ but drove only 0.8 pts of volume — negative price-volume trade in 4 of 6 regions.' },
      { id: 'i3', icon: '💡', iconBg: 'var(--green-soft)', title: 'Top-20 customers are healthier than the book', text: 'Contribution margin for the top 20 is up 2.2 pts; leakage sits in the long tail — a mix problem you can fix with floor pricing.' },
      { id: 'i4', icon: '🔁', iconBg: 'var(--teal-soft)', title: "Last quarter's repricing decision is confirmed", text: 'The SKU 2210 reprice (Decision Ledger, 12 May) is tracking +AED 210k/qtr — verdict updated to "Worked".' },
    ],
    actions: [
      { id: 'a1', title: 'Set floor pricing on SKU 4417 family — KSA', subtitle: 'Est. +AED 84k/qtr · owner suggested: Sanju', assigned: false, assignedTo: 'Sanju', actionType: 'assign' },
      { id: 'a2', title: 'Cap channel discounts at 12% for long tail', subtitle: 'Est. +0.6 pts margin · owner suggested: Praveen', assigned: false, assignedTo: 'Praveen', actionType: 'assign' },
      { id: 'a3', title: 'Re-run analysis with June market data', subtitle: 'Scheduled run · 1 July 09:00', assigned: false, actionType: 'schedule' },
    ],
  },
};

export function makeAgentBuilderSession() {
  return {
    detectedTemplate: 'FP&A template detected',
    messages: [
      {
        id: 'm1',
        role: 'user',
        text: 'I need an FP&A agent that analyses my P&L and tells me where margin is leaking — something my finance team can run themselves.',
      },
      {
        id: 'm2',
        role: 'bot',
        stepType: 'capabilities',
        stepLabel: 'Step 1 · Capabilities',
        text: "Good — that maps to our FP&A function pack. Which analyses should it run? I've pre-selected the usual four:",
        choices: [
          { id: 'c1', label: 'Variance analysis', selected: true },
          { id: 'c2', label: 'Margin waterfall', selected: true },
          { id: 'c3', label: 'Profitability by customer', selected: true },
          { id: 'c4', label: 'KPI scorecard', selected: true },
          { id: 'c5', label: 'Cash-flow forecast', selected: false },
          { id: 'c6', label: 'Anomaly detection', selected: false },
        ],
      },
      {
        id: 'm3',
        role: 'bot',
        stepType: 'data_context',
        stepLabel: 'Step 2 · Data context',
        text: 'What data will the team have when they run it? The agent adapts to whatever is ticked at run time.',
        choices: [
          { id: 'd1', label: 'P&L data', selected: true },
          { id: 'd2', label: 'Pricing data', selected: true },
          { id: 'd3', label: 'Customer mapping', selected: true },
          { id: 'd4', label: 'Market data', selected: false },
        ],
      },
      {
        id: 'm4',
        role: 'bot',
        stepType: 'plan',
        stepLabel: 'Step 3 · The plan',
        text: "Here's what I'll build. Everything below runs under the hood — your team only sees inputs and outcomes.",
        plan: {
          name: 'Margin Leakage Agent',
          estRuntime: '7–9 min',
          steps: [
            { n: 1, text: 'Ingest & validate P&L, pricing, customer files (auto-detect columns)' },
            { n: 2, text: 'Run variance + margin waterfall across products and regions' },
            { n: 3, text: 'Rank leakage drivers · flag anomalies above 2% threshold' },
            { n: 4, text: 'Review gate — a human approves before anything is shared' },
            { n: 5, text: 'Publish outcome scorecard + recommended actions' },
          ],
        },
      },
    ],
  };
}

export function makeDraftPreview() {
  return {
    state: 'draft',
    name: 'Margin Leakage Agent',
    function: 'FP&A · Finance',
    capabilitiesCount: 4,
    dataInputs: 'P&L · Pricing · Customers',
    reviewGate: 'Human approval · step 4',
    owner: { name: 'Praveen J.', initials: 'PJ', avatarBg: '#D97706' },
    guardrails: 'Finance pack · PII off',
    estRuntime: '7–9 min',
  };
}

// ============ v2 ============

// ---------- Data Connectors ----------
export const connectorTypes = [
  {
    id: 'snowflake', name: 'Snowflake', icon: '❄️', isCustom: false,
    description: 'Connect a Snowflake warehouse for analytics queries.',
    fields: [
      { key: 'account', label: 'Account', inputType: 'text', required: true },
      { key: 'warehouse', label: 'Warehouse', inputType: 'text', required: true },
      { key: 'database', label: 'Database', inputType: 'text', required: true },
      { key: 'username', label: 'Username', inputType: 'text', required: true },
      { key: 'password', label: 'Password', inputType: 'password', required: true },
    ],
  },
  {
    id: 'dynamics', name: 'Microsoft Dynamics', icon: '🟦', isCustom: false,
    description: 'Sync CRM/ERP records from Dynamics 365.',
    fields: [
      { key: 'tenantUrl', label: 'Tenant URL', inputType: 'url', required: true },
      { key: 'clientId', label: 'Client ID', inputType: 'text', required: true },
      { key: 'clientSecret', label: 'Client secret', inputType: 'password', required: true },
    ],
  },
  {
    id: 'salesforce', name: 'Salesforce', icon: '☁️', isCustom: false,
    description: 'Pull opportunities, accounts and pipeline data.',
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', inputType: 'url', required: true },
      { key: 'apiToken', label: 'API token', inputType: 'password', required: true },
    ],
  },
  {
    id: 'sftp', name: 'SFTP', icon: '📁', isCustom: false,
    description: 'Pull files on a schedule from an SFTP server.',
    fields: [
      { key: 'host', label: 'Host', inputType: 'text', required: true },
      { key: 'port', label: 'Port', inputType: 'text', required: true },
      { key: 'username', label: 'Username', inputType: 'text', required: true },
      { key: 'password', label: 'Password', inputType: 'password', required: true },
      { key: 'remotePath', label: 'Remote path', inputType: 'text', required: false },
    ],
  },
  {
    id: 'onedrive', name: 'OneDrive', icon: '🟩', isCustom: false,
    description: 'Read spreadsheets/documents from a OneDrive folder.',
    fields: [
      { key: 'folderUrl', label: 'Folder URL', inputType: 'url', required: true },
      { key: 'accessToken', label: 'Access token', inputType: 'password', required: true },
    ],
  },
  {
    id: 'sharepoint', name: 'SharePoint', icon: '🟪', isCustom: false,
    description: 'Read lists/libraries from a SharePoint site.',
    fields: [
      { key: 'siteUrl', label: 'Site URL', inputType: 'url', required: true },
      { key: 'accessToken', label: 'Access token', inputType: 'password', required: true },
    ],
  },
  {
    id: 'anaplan', name: 'Anaplan', icon: '📐', isCustom: false,
    description: 'Import planning drivers and budget lines from Anaplan.',
    fields: [
      { key: 'workspaceId', label: 'Workspace ID', inputType: 'text', required: true },
      { key: 'modelId', label: 'Model ID', inputType: 'text', required: true },
      { key: 'apiToken', label: 'API token', inputType: 'password', required: true },
    ],
  },
  {
    id: 'adaptive_planning', name: 'Workday Adaptive Planning', icon: '🧮', isCustom: false,
    description: 'Import planning drivers and budget lines from Adaptive Planning.',
    fields: [
      { key: 'instanceUrl', label: 'Instance URL', inputType: 'url', required: true },
      { key: 'apiToken', label: 'API token', inputType: 'password', required: true },
    ],
  },
];

export const connections = [
  { id: 'conn1', connectorTypeId: 'salesforce', connectorTypeName: 'Salesforce', name: 'Salesforce — Sales Cloud', status: 'active', owner: { name: 'Ganesh', initials: 'GR', avatarBg: '#4F46E5' }, createdDate: '02 Apr', lastSyncedAt: '5 min ago', config: { instanceUrl: 'https://rewive.my.salesforce.com' } },
  { id: 'conn2', connectorTypeId: 'snowflake', connectorTypeName: 'Snowflake', name: 'Snowflake — Finance DW', status: 'approved', owner: { name: 'Praveen', initials: 'PJ', avatarBg: '#D97706' }, createdDate: '14 Apr', lastSyncedAt: '1h ago', config: { account: 'rewive-fin', warehouse: 'ANALYTICS_WH', database: 'FINANCE' } },
  { id: 'conn3', connectorTypeId: 'sftp', connectorTypeName: 'SFTP', name: 'Vendor invoices SFTP', status: 'pending', owner: { name: 'Devaki', initials: 'DH', avatarBg: '#0D9488' }, createdDate: '20 Jun', lastSyncedAt: null, config: { host: 'sftp.vendor.com', port: '22' } },
  { id: 'conn4', connectorTypeId: 'dynamics', connectorTypeName: 'Microsoft Dynamics', name: 'Dynamics 365 — Ops', status: 'pending', owner: { name: 'Sanju', initials: 'SJ', avatarBg: '#0D9488' }, createdDate: '21 Jun', lastSyncedAt: null, config: { tenantUrl: 'https://rewive.crm.dynamics.com' } },
  { id: 'conn5', connectorTypeId: 'sharepoint', connectorTypeName: 'SharePoint', name: 'HR policies SharePoint', status: 'rejected', owner: { name: 'Devaki', initials: 'DH', avatarBg: '#0D9488' }, createdDate: '18 Jun', lastSyncedAt: null, config: { siteUrl: 'https://rewive.sharepoint.com/hr' } },
  { id: 'conn6', connectorTypeId: 'onedrive', connectorTypeName: 'OneDrive', name: 'Budget workbook sync', status: 'error', owner: { name: 'Ganesh', initials: 'GR', avatarBg: '#4F46E5' }, createdDate: '10 Jun', lastSyncedAt: '3 days ago', config: { folderUrl: 'https://rewive-my.sharepoint.com/budget' }, errorMessage: 'Access token expired' },
  { id: 'conn7', connectorTypeId: 'anaplan', connectorTypeName: 'Anaplan', name: 'Anaplan — FY26 Operating Plan', status: 'active', owner: { name: 'Praveen', initials: 'PJ', avatarBg: '#D97706' }, createdDate: '15 Jun', lastSyncedAt: '2h ago', config: { workspaceId: 'ws-rewive', modelId: 'model-fy26-opplan' } },
];

// ---------- KPI Library (onboarding: pick KPIs by industry, or import from a planning tool) ----------
export const kpiCatalog = [
  // Hospital
  { id: 'kpi-alos', name: 'Average Length of Stay (ALOS)', segment: 'hospital', category: 'operational',
    definition: 'Average number of days a patient spends admitted in the facility.',
    formula: 'Total inpatient days ÷ Total discharges',
    driversNeeded: [{ name: 'Admission timestamp', dataSource: 'EHR / ADT feed' }, { name: 'Discharge timestamp', dataSource: 'EHR / ADT feed' }] },
  { id: 'kpi-occupancy', name: 'Bed Occupancy Rate', segment: 'hospital', category: 'operational',
    definition: 'Share of staffed beds occupied at a point in time.',
    formula: 'Occupied bed-days ÷ Available bed-days',
    driversNeeded: [{ name: 'Bed census', dataSource: 'EHR / ADT feed' }, { name: 'Staffed bed count', dataSource: 'Facilities / bed management system' }] },
  { id: 'kpi-readmission', name: '30-Day Readmission Rate', segment: 'hospital', category: 'clinical',
    definition: 'Share of discharged patients readmitted within 30 days.',
    formula: 'Readmissions within 30 days ÷ Total discharges',
    driversNeeded: [{ name: 'Discharge records', dataSource: 'EHR / ADT feed' }, { name: 'Readmission events', dataSource: 'EHR / ADT feed' }] },
  { id: 'kpi-netmargin', name: 'Net Profit Margin', segment: 'hospital', category: 'financial',
    definition: 'Profitability after all operating expenses.',
    formula: '(Total revenue − Total expenses) ÷ Total revenue',
    driversNeeded: [{ name: 'Revenue', dataSource: 'Finance / GL system' }, { name: 'Operating expenses', dataSource: 'Finance / GL system' }] },
  { id: 'kpi-daysinar', name: 'Days in Accounts Receivable', segment: 'hospital', category: 'financial',
    definition: 'Average days to collect payment after billing.',
    formula: 'AR balance ÷ (Net credit revenue ÷ 365)',
    driversNeeded: [{ name: 'AR balance', dataSource: 'Billing / RCM system' }, { name: 'Net credit revenue', dataSource: 'Billing / RCM system' }] },
  { id: 'kpi-claimtime', name: 'Average Claim Processing Time', segment: 'hospital', category: 'financial',
    definition: 'Average time to process and get paid on an insurance claim.',
    formula: 'Avg(Claim payment date − Claim submission date)',
    driversNeeded: [{ name: 'Claim submission date', dataSource: 'Billing / RCM system' }, { name: 'Claim payment date', dataSource: 'Billing / RCM system' }] },
  { id: 'kpi-revperfte', name: 'Revenue per Clinical FTE', segment: 'hospital', category: 'operational',
    definition: 'Revenue generated per full-time clinical staff member.',
    formula: 'Revenue by department ÷ Clinical headcount',
    driversNeeded: [{ name: 'Revenue by department', dataSource: 'Finance / GL system' }, { name: 'Clinical headcount', dataSource: 'HR / staffing system' }] },
  { id: 'kpi-hcahps', name: 'Patient Satisfaction Score', segment: 'hospital', category: 'patient_experience',
    definition: 'Composite score from post-discharge patient experience surveys (HCAHPS-style).',
    formula: 'Avg(survey responses)',
    driversNeeded: [{ name: 'Survey responses', dataSource: 'Patient survey platform' }] },
  { id: 'kpi-hai', name: 'Hospital-Acquired Infection Rate', segment: 'hospital', category: 'clinical',
    definition: 'Infections acquired during an inpatient stay, per patient days.',
    formula: 'Infection events ÷ Patient days × 1,000',
    driversNeeded: [{ name: 'Infection events', dataSource: 'Infection control / EHR' }, { name: 'Patient days', dataSource: 'EHR / ADT feed' }] },

  // Clinic
  { id: 'kpi-noshow', name: 'No-Show Rate', segment: 'clinic', category: 'operational',
    definition: 'Share of booked appointments the patient does not attend.',
    formula: 'No-shows ÷ Total scheduled appointments',
    driversNeeded: [{ name: 'Appointment bookings', dataSource: 'Scheduling system' }, { name: 'Check-in events', dataSource: 'Scheduling system' }] },
  { id: 'kpi-arppv', name: 'Average Revenue per Visit', segment: 'clinic', category: 'financial',
    definition: 'Average revenue generated from each patient encounter.',
    formula: 'Total visit charges ÷ Total visits',
    driversNeeded: [{ name: 'Visit charges', dataSource: 'Billing system' }, { name: 'Visit count', dataSource: 'Scheduling system' }] },
  { id: 'kpi-newpatient', name: 'New Patient Volume Share', segment: 'clinic', category: 'operational',
    definition: 'New patients as a share of total monthly visits.',
    formula: 'New patient visits ÷ Total visits',
    driversNeeded: [{ name: 'Patient records', dataSource: 'EHR' }, { name: 'Visit records', dataSource: 'Scheduling system' }] },
  { id: 'kpi-utilization', name: 'Provider Utilization Rate', segment: 'clinic', category: 'operational',
    definition: 'Share of available provider capacity that is booked.',
    formula: 'Booked slots ÷ Available slots',
    driversNeeded: [{ name: 'Provider schedules', dataSource: 'Scheduling system' }, { name: 'Booked slots', dataSource: 'Scheduling system' }] },
  { id: 'kpi-nextappt', name: 'Days to Next Available Appointment', segment: 'clinic', category: 'operational',
    definition: 'How far out a new patient has to book, a proxy for access and capacity.',
    formula: 'Next open slot date − Today',
    driversNeeded: [{ name: 'Open slot calendar', dataSource: 'Scheduling system' }] },
  { id: 'kpi-denial', name: 'Claim Denial Rate', segment: 'clinic', category: 'financial',
    definition: 'Share of submitted claims denied by the payer.',
    formula: 'Denied claims ÷ Submitted claims',
    driversNeeded: [{ name: 'Submitted claims', dataSource: 'Billing / RCM system' }, { name: 'Denied claims', dataSource: 'Billing / RCM system' }] },

  // Pharmacy chain
  { id: 'kpi-gmrx', name: 'Gross Margin per Script', segment: 'pharmacy', category: 'financial',
    definition: 'Cash margin earned on each dispensed prescription after drug cost.',
    formula: '(Reimbursement − Drug cost) per script',
    driversNeeded: [{ name: 'Dispensing records', dataSource: 'Pharmacy dispensing / POS system' }, { name: 'Wholesaler invoice cost', dataSource: 'Procurement / wholesaler feed' }] },
  { id: 'kpi-gdr', name: 'Generic Dispensing Rate', segment: 'pharmacy', category: 'operational',
    definition: 'Share of prescriptions dispensed as generics rather than brand.',
    formula: 'Generic scripts ÷ Total scripts',
    driversNeeded: [{ name: 'NDC-level dispensing data', dataSource: 'Pharmacy dispensing system' }] },
  { id: 'kpi-scriptvol', name: 'Script Volume', segment: 'pharmacy', category: 'operational',
    definition: 'Total prescriptions dispensed in the period.',
    formula: 'Count(dispensing events)',
    driversNeeded: [{ name: 'Dispensing records', dataSource: 'Pharmacy dispensing / POS system' }] },
  { id: 'kpi-dir', name: 'DIR Fee Impact', segment: 'pharmacy', category: 'financial',
    definition: 'Retroactive PBM direct and indirect remuneration fees reducing effective reimbursement.',
    formula: 'Sum(DIR fee assessments)',
    driversNeeded: [{ name: 'PBM remittance data', dataSource: 'PBM remittance feed' }] },
  { id: 'kpi-invturns', name: 'Inventory Turnover', segment: 'pharmacy', category: 'operational',
    definition: 'How many times inventory is sold and replaced over the period.',
    formula: 'Cost of goods sold ÷ Average inventory value',
    driversNeeded: [{ name: 'Stock levels', dataSource: 'Inventory management system' }, { name: 'Cost of goods sold', dataSource: 'Finance / GL system' }] },
  { id: 'kpi-pdc', name: 'Medication Adherence (PDC)', segment: 'pharmacy', category: 'clinical',
    definition: 'Proportion of days covered by refills for a chronic medication.',
    formula: 'Days covered by fills ÷ Days in period',
    driversNeeded: [{ name: 'Refill history', dataSource: 'Pharmacy dispensing system' }, { name: 'Claims history', dataSource: 'PBM claims feed' }] },

  // FMCG — Manufacturing
  { id: 'kpi-oee', name: 'Overall Equipment Effectiveness (OEE)', segment: 'manufacturing', category: 'operational',
    definition: 'How much of planned production time is truly productive across availability, performance and quality.',
    formula: 'Availability × Performance × Quality',
    driversNeeded: [{ name: 'Line runtime & stops', dataSource: 'Plant telemetry / MES' }, { name: 'Good units vs total units', dataSource: 'MES quality log' }] },
  { id: 'kpi-waste', name: 'Waste & Scrap %', segment: 'manufacturing', category: 'operational',
    definition: 'Share of material lost to waste and scrap against the production standard.',
    formula: 'Waste + scrap volume ÷ Total input volume',
    driversNeeded: [{ name: 'Line waste log', dataSource: 'Line sensor telemetry' }, { name: 'Production volumes', dataSource: 'MES / production orders' }] },
  { id: 'kpi-changeover', name: 'Changeover Time', segment: 'manufacturing', category: 'operational',
    definition: 'Average time to switch a line between SKUs — the hidden capacity tax.',
    formula: 'Sum(changeover minutes) ÷ Number of changeovers',
    driversNeeded: [{ name: 'Changeover events', dataSource: 'MES / line schedule' }] },
  // FMCG — Distribution
  { id: 'kpi-otif', name: 'Case Fill Rate (OTIF)', segment: 'distribution', category: 'operational',
    definition: 'Share of ordered cases delivered on time and in full to customers.',
    formula: 'Cases delivered OTIF ÷ Cases ordered',
    driversNeeded: [{ name: 'Customer orders', dataSource: 'ERP / order management' }, { name: 'Delivery confirmations', dataSource: 'TMS / EPOD' }] },
  { id: 'kpi-coldchain', name: 'Cold-Chain Excursions', segment: 'distribution', category: 'operational',
    definition: 'Temperature excursions per month across the refrigerated fleet.',
    formula: 'Count(excursions above threshold) per month',
    driversNeeded: [{ name: 'Reefer temperature probes', dataSource: 'Fleet telematics' }, { name: 'Route & vehicle master', dataSource: 'TMS' }] },
  { id: 'kpi-truckutil', name: 'Truck Utilization', segment: 'distribution', category: 'financial',
    definition: 'Share of available truck capacity actually used — cost per case follows it.',
    formula: 'Loaded capacity ÷ Available capacity',
    driversNeeded: [{ name: 'Load plans', dataSource: 'TMS' }, { name: 'Fleet availability', dataSource: 'Fleet management system' }] },
  // FMCG — Retail & trade
  { id: 'kpi-osa', name: 'On-Shelf Availability (OSA)', segment: 'retail_trade', category: 'operational',
    definition: 'Share of SKUs on shelf and sellable in tracked stores — the revenue you can only lose once.',
    formula: 'SKUs available on shelf ÷ SKUs listed',
    driversNeeded: [{ name: 'Store POS feed', dataSource: 'Modern trade POS' }, { name: 'Store audits', dataSource: 'Field sales app' }] },
  { id: 'kpi-tsroi', name: 'Trade-Spend ROI', segment: 'retail_trade', category: 'financial',
    definition: 'Incremental sell-out generated per dirham of promotional spend.',
    formula: 'Incremental sell-out value ÷ Trade spend',
    driversNeeded: [{ name: 'Trade-spend ledger', dataSource: 'TPM / finance system' }, { name: 'Sell-out volumes', dataSource: 'Modern trade POS' }] },
  { id: 'kpi-forecastacc', name: 'Forecast Accuracy', segment: 'retail_trade', category: 'operational',
    definition: 'How close the demand forecast lands to actual sell-in, by category.',
    formula: '1 − |Forecast − Actual| ÷ Actual',
    driversNeeded: [{ name: 'Demand forecast', dataSource: 'Planning system' }, { name: 'Actual sell-in', dataSource: 'ERP shipments' }] },
];

// ---------- Agent Space ----------
export const agentCatalog = [
  {
    agentId: 'agent-margin-leakage', state: 'live', name: 'Margin Leakage Agent', function: 'FP&A · Finance',
    capabilitiesCount: 4, dataInputs: 'P&L · Pricing · Customers', reviewGate: 'Human approval · step 4',
    owner: { name: 'Praveen J.', initials: 'PJ', avatarBg: '#D97706' }, guardrails: 'Finance pack · PII off', estRuntime: '7–9 min',
    description: 'Analyses P&L and pricing data to find where margin is leaking, ranked by driver.',
    industry: 'financial_services', function2: 'finance', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['P&L data', 'Pricing data', 'Customer mapping'], outputsSummary: ['Outcome scorecard', 'Recommended actions'],
    roiToDate: { label: 'Measured impact', value: '+$389k', direction: 'up' }, tokenCostToDate: { tokens: 412000, estCost: '$38.20' },
    runsCount: 124, lastRunAt: '2h ago',
  },
  {
    agentId: 'agent-forecast', state: 'live', name: 'Forecast Agent', function: 'FP&A · Finance',
    capabilitiesCount: 3, dataInputs: 'Cash-flow · Pipeline', reviewGate: 'Human approval before publish',
    owner: { name: 'Ganesh', initials: 'GR', avatarBg: '#4F46E5' }, guardrails: 'Finance pack', estRuntime: '5–8 min',
    description: 'Builds cash-flow and demand forecasts across scenarios.',
    industry: 'financial_services', function2: 'finance', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Cash-flow data', 'Pipeline data'], outputsSummary: ['Forecast scenarios'],
    roiToDate: { label: 'Time saved', value: '29h', direction: 'up' }, tokenCostToDate: { tokens: 198000, estCost: '$19.40' },
    runsCount: 58, lastRunAt: '6h ago',
  },
  {
    agentId: 'agent-screening', state: 'live', name: 'Screening Agent', function: 'Talent · HR',
    capabilitiesCount: 2, dataInputs: 'Resumes · Job requisitions', reviewGate: 'Human review before release',
    owner: { name: 'Devaki', initials: 'DH', avatarBg: '#0D9488' }, guardrails: 'HR pack · PII on, masked', estRuntime: '3–5 min',
    description: 'Shortlists and ranks candidates against job requisitions.',
    industry: 'general', function2: 'hr', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Resumes', 'Job requisitions'], outputsSummary: ['Ranked shortlist'],
    roiToDate: { label: 'Time saved', value: '14h', direction: 'up' }, tokenCostToDate: { tokens: 76000, estCost: '$7.10' },
    runsCount: 31, lastRunAt: '1d ago',
  },
  {
    agentId: 'agent-recipe-cost', state: 'live', name: 'Recipe Cost Agent', function: 'Menu Engineering',
    capabilitiesCount: 3, dataInputs: 'Supplier invoices · Recipe BOMs', reviewGate: 'Human approval before menu repricing',
    owner: { name: 'Sanju Mathew', initials: 'SJ', avatarBg: '#0D9488' }, guardrails: 'F&B pack', estRuntime: '4–6 min',
    description: 'Tracks ingredient cost drift against recipe bills-of-material and flags menu items losing margin.',
    industry: 'fnb', function2: 'finance', persona: 'store_manager', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Supplier invoices', 'Recipe BOMs'], outputsSummary: ['Menu margin report', 'Repricing recommendations'],
    roiToDate: { label: 'Measured impact', value: '+$62k', direction: 'up' }, tokenCostToDate: { tokens: 94000, estCost: '$8.70' },
    runsCount: 47, lastRunAt: '5h ago',
  },
  {
    agentId: 'agent-spoilage', state: 'live', name: 'Spoilage & Waste Agent', function: 'Operations',
    capabilitiesCount: 2, dataInputs: 'POS data · Inventory counts', reviewGate: 'None — autonomous',
    owner: { name: 'Devaki Habib', initials: 'DH', avatarBg: '#0D9488' }, guardrails: 'F&B pack', estRuntime: '2–3 min',
    description: 'Cross-references sales against inventory draw-down to estimate spoilage and waste by location.',
    industry: 'fnb', function2: 'it', persona: 'store_manager', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['POS data', 'Inventory counts'], outputsSummary: ['Waste report by location'],
    roiToDate: { label: 'Measured impact', value: '+$21k', direction: 'up' }, tokenCostToDate: { tokens: 38000, estCost: '$3.50' },
    runsCount: 89, lastRunAt: '40m ago',
  },
  {
    agentId: 'agent-noshow', state: 'live', name: 'Patient No-Show Predictor', function: 'Scheduling',
    capabilitiesCount: 3, dataInputs: 'Appointment history · EHR scheduling feed', reviewGate: 'Human review before overbooking',
    owner: { name: 'Lena Farouk', initials: 'LF', avatarBg: '#0D9488' }, guardrails: 'Healthcare pack · PHI masked', estRuntime: '3–4 min',
    description: 'Predicts appointment no-show risk and recommends safe overbooking slots to protect clinician utilization.',
    industry: 'healthcare', function2: 'customer_success', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Appointment history', 'EHR scheduling feed'], outputsSummary: ['Risk-scored schedule', 'Overbooking recommendations'],
    roiToDate: { label: 'Utilization gain', value: '+11%', direction: 'up' }, tokenCostToDate: { tokens: 121000, estCost: '$11.40' },
    runsCount: 63, lastRunAt: '3h ago',
  },
  {
    agentId: 'agent-claims-denial', state: 'live', name: 'Claims Denial Triage Agent', function: 'Revenue Cycle',
    capabilitiesCount: 4, dataInputs: 'Claims data · Payer rules', reviewGate: 'Human approval before resubmission',
    owner: { name: 'Anita Krishnan', initials: 'AK', avatarBg: '#D97706' }, guardrails: 'Healthcare pack · PHI masked', estRuntime: '5–7 min',
    description: 'Classifies denied claims by root cause and drafts resubmission packets for the highest-recovery cases first.',
    industry: 'healthcare', function2: 'finance', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Claims data', 'Payer rules'], outputsSummary: ['Denial root-cause report', 'Resubmission drafts'],
    roiToDate: { label: 'Recovered revenue', value: '+$145k', direction: 'up' }, tokenCostToDate: { tokens: 167000, estCost: '$15.60' },
    runsCount: 52, lastRunAt: '1d ago',
  },
  {
    agentId: 'agent-shrinkage', state: 'live', name: 'Inventory Shrinkage Agent', function: 'Loss Prevention',
    capabilitiesCount: 3, dataInputs: 'POS data · Stock counts · CCTV event logs', reviewGate: 'Human review before flags escalate',
    owner: { name: 'Ganesh Rajasekaran', initials: 'GR', avatarBg: '#4F46E5' }, guardrails: 'Retail pack', estRuntime: '4–5 min',
    description: 'Correlates point-of-sale, stock counts and event logs to flag stores with abnormal shrinkage patterns.',
    industry: 'retail', function2: 'finance', persona: 'store_manager', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['POS data', 'Stock counts', 'CCTV event logs'], outputsSummary: ['Store risk ranking', 'Investigation packets'],
    roiToDate: { label: 'Measured impact', value: '+$98k', direction: 'up' }, tokenCostToDate: { tokens: 142000, estCost: '$13.20' },
    runsCount: 36, lastRunAt: '8h ago',
  },
  {
    agentId: 'agent-assortment', state: 'live', name: 'Assortment Optimization Agent', function: 'Merchandising',
    capabilitiesCount: 3, dataInputs: 'Sales history · Planogram data', reviewGate: 'Human approval before planogram change',
    owner: { name: 'Sanju Mathew', initials: 'SJ', avatarBg: '#0D9488' }, guardrails: 'Retail pack', estRuntime: '6–8 min',
    description: 'Recommends shelf-space reallocation by store cluster based on sell-through and basket affinity.',
    industry: 'retail', function2: 'sales', persona: 'store_manager', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Sales history', 'Planogram data'], outputsSummary: ['Planogram change recommendations'],
    roiToDate: { label: 'Measured impact', value: '+$54k', direction: 'up' }, tokenCostToDate: { tokens: 88000, estCost: '$8.10' },
    runsCount: 21, lastRunAt: '2d ago',
  },
  {
    agentId: 'agent-predictive-maintenance', state: 'live', name: 'Predictive Maintenance Agent', function: 'Plant Operations',
    capabilitiesCount: 4, dataInputs: 'IoT sensor feed · Maintenance logs', reviewGate: 'Human approval before scheduling downtime',
    owner: { name: 'Praveen Jagadeesan', initials: 'PJ', avatarBg: '#D97706' }, guardrails: 'Manufacturing pack', estRuntime: '8–10 min',
    description: 'Scores equipment failure risk from sensor telemetry and proposes a maintenance schedule that minimizes downtime cost.',
    industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['IoT sensor feed', 'Maintenance logs'], outputsSummary: ['Failure risk scores', 'Maintenance schedule'],
    roiToDate: { label: 'Downtime avoided', value: '+340h', direction: 'up' }, tokenCostToDate: { tokens: 205000, estCost: '$19.10' },
    runsCount: 44, lastRunAt: '6h ago',
  },
  {
    agentId: 'agent-defect-vision', state: 'live', name: 'Defect Vision Agent', function: 'Quality Control',
    capabilitiesCount: 2, dataInputs: 'Line camera feed · Defect taxonomy', reviewGate: 'Human review before line stop',
    owner: { name: 'Ganesh Rajasekaran', initials: 'GR', avatarBg: '#4F46E5' }, guardrails: 'Manufacturing pack', estRuntime: '1–2 min',
    description: 'Flags visual defects on the production line in real time against a configurable defect taxonomy.',
    industry: 'manufacturing', function2: 'it', persona: 'operations_head', catalogStatus: 'paused', creationPath: 'chat',
    inputsSummary: ['Line camera feed', 'Defect taxonomy'], outputsSummary: ['Defect alerts'],
    roiToDate: { label: 'Measured impact', value: '—', direction: 'flat' }, tokenCostToDate: { tokens: 12000, estCost: '$1.10' },
    runsCount: 6, lastRunAt: '9d ago',
  },
  {
    agentId: 'agent-freight-exception', state: 'live', name: 'Freight Exception Agent', function: 'Logistics Ops',
    capabilitiesCount: 3, dataInputs: 'Carrier tracking feed · SLA terms', reviewGate: 'None — autonomous',
    owner: { name: 'Devaki Habib', initials: 'DH', avatarBg: '#0D9488' }, guardrails: 'Logistics pack', estRuntime: '3–4 min',
    description: 'Watches in-transit shipments against carrier SLAs and auto-drafts exception claims for late or damaged freight.',
    industry: 'logistics', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Carrier tracking feed', 'SLA terms'], outputsSummary: ['Exception claims', 'SLA breach report'],
    roiToDate: { label: 'Measured impact', value: '+$37k', direction: 'up' }, tokenCostToDate: { tokens: 65000, estCost: '$6.00' },
    runsCount: 112, lastRunAt: '20m ago',
  },
  {
    agentId: 'agent-route-optimizer', state: 'live', name: 'Last-Mile Route Optimizer', function: 'Fleet Ops',
    capabilitiesCount: 3, dataInputs: 'Delivery orders · Live traffic feed', reviewGate: 'Human approval for route changes mid-shift',
    owner: { name: 'Ganesh Rajasekaran', initials: 'GR', avatarBg: '#4F46E5' }, guardrails: 'Logistics pack', estRuntime: '2–3 min',
    description: 'Re-sequences last-mile delivery routes against live traffic to cut fuel cost and missed delivery windows.',
    industry: 'logistics', function2: 'it', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Delivery orders', 'Live traffic feed'], outputsSummary: ['Optimized route plan'],
    roiToDate: { label: 'Fuel cost saved', value: '+$18k', direction: 'up' }, tokenCostToDate: { tokens: 51000, estCost: '$4.70' },
    runsCount: 201, lastRunAt: '5m ago',
  },
  {
    agentId: 'agent-churn-risk', state: 'live', name: 'Churn Risk Agent', function: 'Customer Success',
    capabilitiesCount: 3, dataInputs: 'Product usage telemetry · Support tickets', reviewGate: 'Human review before outreach',
    owner: { name: 'Lena Farouk', initials: 'LF', avatarBg: '#0D9488' }, guardrails: 'Technology pack', estRuntime: '4–5 min',
    description: 'Scores accounts by churn risk from usage decay and support sentiment, and drafts a save-play for CS to act on.',
    industry: 'technology', function2: 'customer_success', persona: 'cfo', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Product usage telemetry', 'Support tickets'], outputsSummary: ['Risk-scored account list', 'Save-play drafts'],
    roiToDate: { label: 'Retained ARR', value: '+$210k', direction: 'up' }, tokenCostToDate: { tokens: 178000, estCost: '$16.50' },
    runsCount: 67, lastRunAt: '1h ago',
  },
  {
    agentId: 'agent-vendor-risk', state: 'live', name: 'Vendor Risk Agent', function: 'Procurement',
    capabilitiesCount: 3, dataInputs: 'Vendor financials · News/sanctions feed', reviewGate: 'Human approval before vendor suspension',
    owner: { name: 'Praveen Jagadeesan', initials: 'PJ', avatarBg: '#D97706' }, guardrails: 'Finance pack', estRuntime: '5–6 min',
    description: 'Monitors vendor financial health and adverse news to flag supply-chain risk before it disrupts operations.',
    industry: 'manufacturing', function2: 'procurement', persona: 'operations_head', catalogStatus: 'live', creationPath: 'chat',
    inputsSummary: ['Vendor financials', 'News/sanctions feed'], outputsSummary: ['Vendor risk ranking'],
    roiToDate: { label: 'Risk avoided', value: '3 flagged', direction: 'up' }, tokenCostToDate: { tokens: 71000, estCost: '$6.60' },
    runsCount: 28, lastRunAt: '11h ago',
  },
  {
    agentId: 'agent-lease-abstraction', state: 'draft', name: 'Lease Abstraction Agent', function: 'Portfolio Ops',
    capabilitiesCount: 2, dataInputs: 'Lease PDFs · Portfolio register', reviewGate: 'Human review before register update',
    owner: { name: 'Rohan Mehta', initials: 'RM', avatarBg: '#4F46E5' }, guardrails: 'Real estate pack', estRuntime: '6–9 min',
    description: 'Extracts key terms (rent escalation, break clauses, renewal dates) from lease PDFs into the portfolio register.',
    industry: 'real_estate', function2: 'finance', persona: 'cfo', catalogStatus: 'draft', creationPath: 'chat',
    inputsSummary: ['Lease PDFs', 'Portfolio register'], outputsSummary: ['Structured lease abstracts'],
    roiToDate: { label: 'Measured impact', value: '—', direction: 'flat' }, tokenCostToDate: { tokens: 4000, estCost: '$0.40' },
    runsCount: 2, lastRunAt: '3d ago',
  },
];

// ---------- Agent Studio ----------
export function makeSeedWorkflow(id, name) {
  const now = new Date().toISOString();
  return {
    id,
    name: name || 'Untitled workflow',
    status: 'draft',
    version: 1,
    publishedVersion: null,
    owner: { name: 'Kumara Vijayan', initials: 'KV', avatarBg: '#4F46E5' },
    createdAt: now,
    updatedAt: now,
    nodes: [
      { id: 'n-input', kind: 'input', label: 'Input', position: { x: 40, y: 220 }, sourceType: 'synthetic', syntheticDatasetId: 'sample-finance' },
      { id: 'n-process', kind: 'process', label: 'Process', position: { x: 420, y: 80 }, instructions: '', generatedPrompt: '', generatedAt: null },
      { id: 'n-output', kind: 'output', label: 'Output', position: { x: 980, y: 220 }, outputType: 'json', destinationLabel: 'output.json' },
    ],
    edges: [
      { id: 'e1', source: 'n-input', target: 'n-process' },
      { id: 'e2', source: 'n-process', target: 'n-output' },
    ],
  };
}

const promptTemplates = [
  { match: /overdue|late|delay/i, template: 'Identify all records where the relevant date field exceeds the expected threshold, flag them as overdue, and summarize by owner and age bucket.' },
  { match: /margin|profit|cost/i, template: 'Compute margin/profitability deltas across the configured dimensions, rank the largest negative drivers, and surface the top contributors.' },
  { match: /forecast|predict|trend/i, template: 'Project the trend forward using the historical series provided, output a scenario range (low/base/high), and flag any inflection points.' },
  { match: /anomaly|outlier|unusual/i, template: 'Scan the incoming records for values outside the normal range for their category, flag anomalies above a 2 standard-deviation threshold.' },
];

export function generatePromptFromInstructions(instructions) {
  const hit = promptTemplates.find((t) => t.match.test(instructions));
  if (hit) return hit.template;
  return `You are an agent that ${instructions || 'processes the configured input'}. Process the input data accordingly and produce structured output matching the configured output type.`;
}

const outputPreviews = {
  mcp: '{"mcpResponse": "ok", "resourcesUpdated": 3}',
  connector: 'Wrote 128 rows back to the configured connection.',
  excel: 'Generated mock Excel workbook · 24 rows × 6 columns.',
  ppt: 'Generated mock PPT deck · 6 slides.',
  json: '{"rows": 24, "summary": "mock output"}',
  pdf: 'Generated mock PDF report · 4 pages.',
  word: 'Generated mock Word document · 3 pages.',
};

export function getOutputPreview(outputType) {
  return outputPreviews[outputType] ?? 'Generated mock output.';
}

// ---------- Signal Studio ----------
export const suggestedSignals = [
  { id: 'sig1', name: 'KSA SKU margin erosion', description: 'Margin on SKU 4417 family has fallen 6.2% in KSA over the trailing quarter.', category: 'derailer', sourceConnectionIds: ['conn1', 'conn2'], computableNow: true, approvalStatus: 'suggested', lineage: [{ connectionId: 'conn2', fieldsUsed: ['gross_margin', 'sku_family', 'region'] }], persona: 'store_manager' },
  { id: 'sig2', name: 'Support hiring demand dip', description: 'Forecasted support ticket volume is trending below plan — a hiring-hold candidate.', category: 'laggard', sourceConnectionIds: ['conn1'], computableNow: true, approvalStatus: 'pending_review', lineage: [{ connectionId: 'conn1', fieldsUsed: ['ticket_volume', 'region'] }], persona: 'operations_head' },
  { id: 'sig3', name: 'Vendor invoice cost drainer', description: 'Three logistics vendors show overlapping invoice line items — consolidation candidate.', category: 'cost_drainer', sourceConnectionIds: ['conn3'], computableNow: false, approvalStatus: 'suggested', lineage: [{ connectionId: 'conn3', fieldsUsed: ['vendor_name', 'line_item'] }], persona: 'operations_head' },
  { id: 'sig4', name: 'Discount-driven revenue leakage', description: 'Channel discounts rose 3.1 pts QoQ but only drove 0.8 pts of volume — a negative price-volume trade.', category: 'revenue_leakage', sourceConnectionIds: ['conn1'], computableNow: true, approvalStatus: 'approved', lineage: [{ connectionId: 'conn1', fieldsUsed: ['discount_pct', 'volume'] }], persona: 'cfo' },
  { id: 'sig5', name: 'DSO drift — KSA distributor', description: 'Days sales outstanding for the KSA distributor has drifted 12 days above target.', category: 'derailer', sourceConnectionIds: ['conn2'], computableNow: true, approvalStatus: 'suggested', lineage: [{ connectionId: 'conn2', fieldsUsed: ['dso', 'region'] }], persona: 'cfo' },
];

export const signalDetails = {
  sig1: {
    signalId: 'sig1',
    whySurfaced: 'Margin on the SKU 4417 family has fallen 6.2% in KSA over the trailing quarter, crossing the derailer threshold for two consecutive months.',
    prognosis: { impactRange: 'SAR 180,000 - 260,000', confidence: 'high', trend: 'down', timeframe: 'next quarter' },
    piiMasked: true,
    piiUnmaskRequested: false,
    datasetRows: [
      { date: '18 Jun', label: 'SKU 4417-A repricing', maskedField: 'E****42', variance: '-6.8%' },
      { date: '11 Jun', label: 'SKU 4417-B repricing', maskedField: 'E****42', variance: '-5.9%' },
      { date: '04 Jun', label: 'SKU 4417-A repricing', maskedField: 'E****19', variance: '-4.1%' },
    ],
    similarSignals: [
      {
        id: 'sim1', label: 'UAE, same SKU family - 3.4% erosion, resolved this spring', scope: 'same_group',
        priorSolution: {
          summary: 'Renegotiated the supplier rebate tier and repriced two slow movers.',
          verdict: 'worked', cost: 'SAR 12,000', valueGenerated: 'SAR 96,000',
          timeline: [
            { label: 'Solution design started', date: '02 Apr' },
            { label: 'Approved, handed to dev for the rebate connector', date: '05 Apr' },
            { label: 'Repricing went live', date: '14 Apr' },
            { label: 'Verdict: worked', date: '30 May' },
          ],
        },
      },
      { id: 'sim2', label: 'Affiliated group company, packaged foods division - same pattern', scope: 'restricted', accessRequested: false },
    ],
  },
  sig2: {
    signalId: 'sig2',
    whySurfaced: 'Forecasted support ticket volume has fallen below plan for three straight weeks, a leading indicator that current hiring plans may overshoot demand.',
    prognosis: { impactRange: 'AED 40,000 - 70,000', confidence: 'medium', trend: 'down', timeframe: 'next 2 quarters' },
    piiMasked: true,
    piiUnmaskRequested: false,
    datasetRows: [
      { date: '20 Jun', label: 'Weekly ticket volume, region 1', maskedField: 'M****07', variance: '-9.2%' },
      { date: '13 Jun', label: 'Weekly ticket volume, region 1', maskedField: 'M****07', variance: '-7.5%' },
    ],
    similarSignals: [
      { id: 'sim3', label: 'North America support org saw the same dip last year', scope: 'same_group', priorSolution: { summary: 'Paused one open req and redeployed to onboarding.', verdict: 'worked', cost: 'AED 0', valueGenerated: 'AED 52,000', timeline: [{ label: 'Solution design started', date: '11 Jan' }, { label: 'Approved, no dev needed', date: '12 Jan' }, { label: 'Verdict: worked', date: '20 Mar' }] } },
    ],
  },
  sig3: {
    signalId: 'sig3',
    whySurfaced: 'Three logistics vendors show overlapping invoice line items for the same lanes, a consolidation candidate that is not yet computable end to end.',
    prognosis: { impactRange: 'AED 18,000 - 30,000', confidence: 'low', trend: 'flat', timeframe: 'ongoing' },
    piiMasked: true,
    piiUnmaskRequested: false,
    datasetRows: [
      { date: '15 Jun', label: 'Vendor invoice overlap, lane 4', maskedField: 'V****88', variance: '+2.1%' },
    ],
    similarSignals: [],
  },
  sig4: {
    signalId: 'sig4',
    whySurfaced: 'Channel discounts rose 3.1 points quarter over quarter but only drove 0.8 points of volume, a negative price-volume trade already approved for a KPI ticket.',
    prognosis: { impactRange: 'AED 95,000 - 140,000', confidence: 'high', trend: 'down', timeframe: 'this quarter' },
    piiMasked: true,
    piiUnmaskRequested: false,
    datasetRows: [
      { date: '01 Jun', label: 'Channel discount ladder, tier 2', maskedField: 'D****21', variance: '+3.1%' },
    ],
    similarSignals: [],
  },
  sig5: {
    signalId: 'sig5',
    whySurfaced: 'Days sales outstanding for the KSA distributor has drifted 12 days above target over 6 weeks, tracking with a change in invoice approval routing.',
    prognosis: { impactRange: 'SAR 220,000 working capital', confidence: 'medium', trend: 'down', timeframe: 'next 6 weeks' },
    piiMasked: true,
    piiUnmaskRequested: false,
    datasetRows: [
      { date: '19 Jun', label: 'Invoice approval routing, KSA', maskedField: 'F****55', variance: '+12 days' },
    ],
    similarSignals: [
      { id: 'sim4', label: 'Affiliated group company, same distributor network', scope: 'restricted', accessRequested: false },
    ],
  },
};

export const reviewCommittee = [
  { userId: 'u-cfo', name: 'Anita Krishnan', initials: 'AK', avatarBg: '#D97706', title: 'CFO' },
  { userId: 'u-ceo', name: 'Rohan Mehta', initials: 'RM', avatarBg: '#4F46E5', title: 'CEO' },
  { userId: 'u-coo', name: 'Lena Farouk', initials: 'LF', avatarBg: '#0D9488', title: 'COO' },
];

export const kpiTickets = [
  {
    id: 'tix1', signalId: 'sig4', signalName: 'Discount-driven revenue leakage', status: 'in_progress',
    assignedTo: { name: 'Sanju', initials: 'SJ', avatarBg: '#0D9488' },
    comments: [
      { id: 'c1', authorName: 'Anita Krishnan', authorInitials: 'AK', authorAvatarBg: '#D97706', text: 'Approved — please cap long-tail discounts and report back in 2 weeks.', createdAt: '20 Jun', stageAtComment: 'new' },
      { id: 'c2', authorName: 'Sanju Mathew', authorInitials: 'SJ', authorAvatarBg: '#0D9488', text: 'Acknowledged, pulling the discount ladder now.', createdAt: '21 Jun', stageAtComment: 'acknowledged' },
    ],
    createdAt: '20 Jun', updatedAt: '21 Jun', lineage: [{ connectionId: 'conn1', fieldsUsed: ['discount_pct', 'volume'] }],
  },
];

// ---------- People directory (shared) ----------
export const peopleDirectory = [
  { userId: 'u-sanju', name: 'Sanju Mathew', initials: 'SJ', avatarBg: '#0D9488', roles: ['Approver', 'Finance'] },
  { userId: 'u-praveen', name: 'Praveen Jagadeesan', initials: 'PJ', avatarBg: '#D97706', roles: ['Approver', 'Finance'] },
  { userId: 'u-devaki', name: 'Devaki Habib', initials: 'DH', avatarBg: '#0D9488', roles: ['HR'] },
  { userId: 'u-ganesh', name: 'Ganesh Rajasekaran', initials: 'GR', avatarBg: '#4F46E5', roles: ['Procurement'] },
  { userId: 'u-cfo', name: 'Anita Krishnan', initials: 'AK', avatarBg: '#D97706', roles: ['Committee', 'CFO'] },
  { userId: 'u-ceo', name: 'Rohan Mehta', initials: 'RM', avatarBg: '#4F46E5', roles: ['Committee', 'CEO'] },
  { userId: 'u-coo', name: 'Lena Farouk', initials: 'LF', avatarBg: '#0D9488', roles: ['Committee', 'COO'] },
  { userId: 'u-aisha', name: 'Aisha Rahman', initials: 'AR', avatarBg: '#4F46E5', roles: ['Platform', 'Developer'] },
];

// ---------- Audit log (shared) ----------
export const auditLog = [
  { id: 'al1', entityType: 'connection', entityId: 'conn1', action: 'created connection', actorName: 'Ganesh Rajasekaran', timestamp: '02 Apr' },
  { id: 'al2', entityType: 'connection', entityId: 'conn1', action: 'approved connection', actorName: 'Kumara Vijayan', timestamp: '02 Apr' },
  { id: 'al3', entityType: 'connection', entityId: 'conn2', action: 'created connection', actorName: 'Praveen Jagadeesan', timestamp: '14 Apr' },
  { id: 'al4', entityType: 'connection', entityId: 'conn2', action: 'approved connection', actorName: 'Kumara Vijayan', timestamp: '14 Apr' },
];
