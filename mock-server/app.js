import express from 'express';
import cors from 'cors';
import {
  currentUser,
  dashboardSummary,
  pendingDecisions,
  pulse,
  liveRuns,
  topPerformer,
  runDetails,
  runs,
  decisionStats,
  decisionLedger,
  leaderboardHighlights,
  leaderboard,
  outcomeReports,
  makeAgentBuilderSession,
  makeDraftPreview,
  connectorTypes,
  connections,
  agentCatalog,
  makeSeedWorkflow,
  generatePromptFromInstructions,
  getOutputPreview,
  suggestedSignals,
  signalDetails,
  reviewCommittee,
  kpiTickets,
  peopleDirectory,
  auditLog,
  kpiCatalog,
  runExceptions,
  runChases,
} from './data.js';
import {
  orgProfileSeed,
  industryOptions,
  brains,
  shadowOrgs,
  findingsSeed,
  closureKpisSeed,
  plImpactSeed,
} from './v4data.js';
import { opContent } from './v4content.js';
import { plStatementSeed } from './pldata.js';
import { personaScope } from './roles.js';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory mutable state for this server process. Note: on serverless platforms
// (e.g. Vercel) each invocation may hit a different cold instance, so this state
// is not guaranteed to persist across requests there — fine for a mock/demo API,
// not a substitute for a real backend with durable storage.
let pendingDecisionsState = [...pendingDecisions];
const agentSessions = new Map();
const createdAgents = new Map();
const outcomeReportsState = JSON.parse(JSON.stringify(outcomeReports));

// Per-industry operational content (Command Center, Runs, Decisions, People, Outcomes).
// Read-through packs by current org profile; interactive bits get their own mutable state.
const opStateByIndustry = {};
for (const _ind of Object.keys(opContent)) {
  opStateByIndustry[_ind] = {
    pending: JSON.parse(JSON.stringify(opContent[_ind].pendingDecisions)),
    exceptions: JSON.parse(JSON.stringify(opContent[_ind].runExceptions)),
    chases: JSON.parse(JSON.stringify(opContent[_ind].runChases)),
    outcomes: JSON.parse(JSON.stringify(opContent[_ind].outcomeReports)),
    runDetails: JSON.parse(JSON.stringify(opContent[_ind].runDetails)),
  };
}
// v4Industry (defined in the v4 section, hoisted) resolves the current industry at request time.
const op = (req) => opContent[v4Industry(req)];
const opS = (req) => opStateByIndustry[v4Industry(req)];

// ---------- Current user ----------
app.get('/api/v1/me', (req, res) => res.json(currentUser));

// ---------- Dashboard / Command Center ----------
// Every collection item belongs to exactly one persona (role). scope='team'
// widens the lens to the role's whole reporting subtree (hierarchy mode).
function filterByPersona(items, persona, scope) {
  const roles = personaScope(persona, scope);
  return roles ? items.filter((d) => roles.has(d.persona)) : items;
}

// Greeting + summary sentence only. The old kpis block (and its per-persona
// overrides) was display-dead after v5.1 — Today computes its stats from
// findings / approvals / decision-stats, which are role-scoped already.
app.get('/api/v1/dashboard/summary', (req, res) => res.json(op(req).dashboardSummary));

app.get('/api/v1/decisions/pending', (req, res) => res.json(filterByPersona(opS(req).pending, req.query.persona, req.query.scope)));

app.post('/api/v1/decisions/:id/approve', (req, res) => {
  const { id } = req.params;
  const st = opS(req);
  const decision = st.pending.find((d) => d.id === id);
  st.pending = st.pending.filter((d) => d.id !== id);
  res.json(decision ?? { id });
});

app.get('/api/v1/pulse', (req, res) => res.json(op(req).pulse));

app.get('/api/v1/runs/live', (req, res) => res.json(filterByPersona(op(req).liveRuns, req.query.persona, req.query.scope)));

app.get('/api/v1/people/top-performer', (req, res) => res.json(op(req).topPerformer));

// ---------- Runs & Actions ----------
app.get('/api/v1/runs', (req, res) => {
  const { status, persona, scope } = req.query;
  const runs = filterByPersona(op(req).runs, persona, scope);
  const filtered = !status || status === 'all' ? runs : runs.filter((r) => r.status === status);
  res.json(filtered);
});

// ---------- Runs: exception log and chase & escalate ----------
// Registered before the generic '/runs/:id' route below, so literal paths like
// '/runs/exceptions' and '/runs/chases' aren't swallowed as a run id lookup.
app.get('/api/v1/runs/exceptions', (req, res) => {
  const { status } = req.query;
  const exceptions = opS(req).exceptions;
  res.json(status && status !== 'all' ? exceptions.filter((e) => e.status === status) : exceptions);
});

app.post('/api/v1/runs/exceptions/:id/resolve', (req, res) => {
  const exception = opS(req).exceptions.find((e) => e.id === req.params.id);
  if (!exception) return res.status(404).json({ message: 'Exception not found' });
  exception.status = 'resolved';
  logAudit('decision', exception.runId, `resolved exception: ${exception.message}`);
  res.json(exception);
});

app.get('/api/v1/runs/chases', (req, res) => res.json(opS(req).chases));

app.post('/api/v1/runs/:runId/flag-feedback', (req, res) => {
  const st = opS(req);
  const run = op(req).runs.find((r) => r.id === req.params.runId);
  if (!run) return res.status(404).json({ message: 'Run not found' });
  const chase = {
    id: `chase-${Date.now()}`,
    runId: run.id,
    runName: run.name,
    trigger: 'feedback',
    note: req.body.text,
    escalatedTo: 'the agent owner, for tuning',
    createdAt: new Date().toISOString(),
  };
  st.chases = [...st.chases, chase];
  logAudit('decision', run.id, `feedback flagged and escalated: ${req.body.text}`);
  res.json(chase);
});

app.get('/api/v1/runs/:id', (req, res) => {
  const detail = opS(req).runDetails[req.params.id];
  if (!detail) return res.status(404).json({ message: 'Run not found' });
  res.json(detail);
});

app.post('/api/v1/runs/:id/pause', (req, res) => {
  const detail = opS(req).runDetails[req.params.id];
  if (!detail) return res.status(404).json({ message: 'Run not found' });
  detail.paused = true;
  detail.isLive = false;
  logAudit('decision', detail.id, `paused run "${detail.name}"`);
  res.json({ id: detail.id, status: 'paused' });
});

app.post('/api/v1/runs/:id/resume', (req, res) => {
  const detail = opS(req).runDetails[req.params.id];
  if (!detail) return res.status(404).json({ message: 'Run not found' });
  detail.paused = false;
  detail.isLive = true;
  logAudit('decision', detail.id, `resumed run "${detail.name}"`);
  res.json({ id: detail.id, status: 'running' });
});

// ---------- Decision Ledger ----------
app.get('/api/v1/decisions/stats', (req, res) => res.json(op(req).decisionStats));

app.get('/api/v1/decisions', (req, res) => {
  const { function: fn, verdict, persona, scope } = req.query;
  let result = filterByPersona(op(req).decisionLedger, persona, scope);
  if (fn && fn !== 'all') result = result.filter((d) => d.function === fn);
  if (verdict && verdict !== 'all') result = result.filter((d) => d.verdict === verdict);
  res.json(result);
});

// ---------- People & Agents ----------
app.get('/api/v1/leaderboard/highlights', (req, res) => res.json(op(req).leaderboardHighlights));

app.get('/api/v1/leaderboard/loop-speed', (req, res) => res.json(filterByPersona(op(req).loopSpeed, req.query.persona, req.query.scope)));

app.get('/api/v1/leaderboard', (req, res) => {
  const { type, persona, scope } = req.query;
  const leaderboard = filterByPersona(op(req).leaderboard, persona, scope);
  const result = !type || type === 'all' ? leaderboard : leaderboard.filter((l) => l.type === type);
  res.json(result);
});

// ---------- Outcomes ----------
app.get('/api/v1/outcomes/:runId', (req, res) => {
  const report = opS(req).outcomes[req.params.runId];
  if (!report) return res.status(404).json({ message: 'Outcome report not found' });
  res.json(report);
});

app.post('/api/v1/outcomes/:runId/actions/:actionId/assign', (req, res) => {
  const report = opS(req).outcomes[req.params.runId];
  if (!report) return res.status(404).json({ message: 'Outcome report not found' });
  const action = report.actions.find((a) => a.id === req.params.actionId);
  if (action) action.assigned = true;
  res.json(action ?? {});
});

app.post('/api/v1/outcomes/:runId/actions/:actionId/schedule', (req, res) => {
  const report = opS(req).outcomes[req.params.runId];
  if (!report) return res.status(404).json({ message: 'Outcome report not found' });
  const action = report.actions.find((a) => a.id === req.params.actionId);
  if (!action) return res.status(404).json({ message: 'Action not found' });
  action.scheduled = true;
  logAudit('decision', req.params.runId, `scheduled action: ${action.title}`);
  res.json(action);
});

app.post('/api/v1/outcomes/:runId/export', (req, res) => {
  const { format } = req.query;
  res.json({ downloadUrl: `/downloads/${req.params.runId}.${format || 'pdf'}` });
});

app.post('/api/v1/outcomes/:runId/share', (req, res) => {
  res.json({ shareUrl: `https://rewive.app/s/${req.params.runId}-${Date.now()}`, expiresInDays: 30 });
});

// ---------- Agent Builder ----------
function getOrCreateSession(sessionId) {
  if (!agentSessions.has(sessionId)) {
    agentSessions.set(sessionId, makeAgentBuilderSession());
  }
  return agentSessions.get(sessionId);
}

app.get('/api/v1/agent-builder/sessions/:sessionId', (req, res) => {
  res.json(getOrCreateSession(req.params.sessionId));
});

app.post('/api/v1/agent-builder/messages', (req, res) => {
  const { sessionId, text } = req.body;
  const session = getOrCreateSession(sessionId);
  const userMsg = { id: `u-${Date.now()}`, role: 'user', text };
  const botMsg = {
    id: `b-${Date.now()}`,
    role: 'bot',
    text: "Got it — I've noted that and kept the rest of the plan as-is. Use 'Create agent' below when you're ready.",
  };
  session.messages.push(userMsg, botMsg);
  res.json(botMsg);
});

app.patch('/api/v1/agent-builder/sessions/:sessionId/selections', (req, res) => {
  const session = getOrCreateSession(req.params.sessionId);
  const { messageId, choiceId, selected } = req.body;
  const message = session.messages.find((m) => m.id === messageId);
  const choice = message?.choices?.find((c) => c.id === choiceId);
  if (choice) choice.selected = selected;
  res.json({ ok: true });
});

app.get('/api/v1/agent-builder/sessions/:sessionId/preview', (req, res) => {
  const agentId = [...createdAgents.entries()].find(([, a]) => a.sessionId === req.params.sessionId)?.[0];
  if (agentId) return res.json(createdAgents.get(agentId).preview);
  res.json(makeDraftPreview());
});

app.post('/api/v1/agents', (req, res) => {
  const { sessionId } = req.body;
  const session = getOrCreateSession(sessionId);
  const planMessage = session.messages.find((m) => m.stepType === 'plan');
  const agentId = `agent-${Date.now()}`;
  const preview = { ...makeDraftPreview(), state: 'live', name: planMessage?.plan?.name ?? 'New Agent' };
  createdAgents.set(agentId, { sessionId, preview });
  res.json({ agentId, state: 'live', name: preview.name });
});

app.get('/api/v1/agents/:agentId/preview', (req, res) => {
  const entry = createdAgents.get(req.params.agentId);
  if (!entry) return res.status(404).json({ message: 'Agent not found' });
  res.json(entry.preview);
});

// ============ v2 ============

// ---------- Data Connectors ----------
let connectorTypesState = [...connectorTypes];
let connectionsState = [...connections];
let auditLogState = [...auditLog];

function logAudit(entityType, entityId, action, actorName = 'Kumara Vijayan') {
  auditLogState.push({ id: `al-${Date.now()}`, entityType, entityId, action, actorName, timestamp: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) });
}

app.get('/api/v1/connector-types', (req, res) => res.json(connectorTypesState));

app.post('/api/v1/connector-types', (req, res) => {
  const { name, icon, description, fields } = req.body;
  const newType = { id: `custom-${Date.now()}`, name, icon: icon || '🔌', description, fields: fields || [], isCustom: true };
  connectorTypesState = [...connectorTypesState, newType];
  res.json(newType);
});

app.get('/api/v1/connections', (req, res) => {
  const { status } = req.query;
  const result = !status || status === 'all' ? connectionsState : connectionsState.filter((c) => c.status === status);
  res.json(result);
});

// A connection created from a tracked KPI's "Connect" flow carries forKpiId;
// the KPI's dataStatus follows the connection through its approval lifecycle.
function setTrackedKpiDataStatus(kpiId, dataStatus) {
  const kpi = trackedKpisState.find((t) => t.id === kpiId);
  if (kpi) kpi.dataStatus = dataStatus;
  return kpi;
}

app.post('/api/v1/connections', (req, res) => {
  const { connectorTypeId, name, config, forKpiId } = req.body;
  const type = connectorTypesState.find((t) => t.id === connectorTypeId);
  const newConnection = {
    id: `conn-${Date.now()}`,
    connectorTypeId,
    connectorTypeName: type?.name ?? connectorTypeId,
    name,
    status: 'pending',
    owner: { name: 'Kumara Vijayan', initials: 'KV', avatarBg: '#4F46E5' },
    createdDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    lastSyncedAt: null,
    config: config || {},
    ...(forKpiId ? { forKpiId } : {}),
  };
  connectionsState = [...connectionsState, newConnection];
  if (forKpiId) {
    const kpi = setTrackedKpiDataStatus(forKpiId, 'pending_approval');
    if (kpi) logAudit('connection', newConnection.id, `created connection for KPI "${kpi.name}"`);
  } else {
    logAudit('connection', newConnection.id, 'created connection');
  }
  res.json(newConnection);
});

app.post('/api/v1/connections/:id/approve', (req, res) => {
  const conn = connectionsState.find((c) => c.id === req.params.id);
  if (!conn) return res.status(404).json({ message: 'Connection not found' });
  conn.status = 'approved';
  logAudit('connection', conn.id, 'approved connection');
  if (conn.forKpiId) {
    const kpi = setTrackedKpiDataStatus(conn.forKpiId, 'connected');
    if (kpi) logAudit('signal', kpi.id, `data connected for KPI "${kpi.name}" via ${conn.name}`);
  }
  res.json(conn);
});

app.post('/api/v1/connections/:id/reject', (req, res) => {
  const conn = connectionsState.find((c) => c.id === req.params.id);
  if (!conn) return res.status(404).json({ message: 'Connection not found' });
  conn.status = 'rejected';
  logAudit('connection', conn.id, 'rejected connection');
  if (conn.forKpiId) setTrackedKpiDataStatus(conn.forKpiId, 'needs_connection');
  res.json(conn);
});

app.get('/api/v1/connections/:id/signal-coverage', (req, res) => {
  const conn = connectionsState.find((c) => c.id === req.params.id);
  if (!conn) return res.status(404).json({ message: 'Connection not found' });
  const calculableSignalIds = suggestedSignalsState.filter((s) => s.sourceConnectionIds.includes(conn.id)).map((s) => s.id);
  res.json({ connectionId: conn.id, connectionName: conn.name, calculableSignalIds });
});

// ---------- KPI Library (onboarding) ----------
let trackedKpisState = [];

app.get('/api/v1/kpi-catalog', (req, res) => {
  const { segment } = req.query;
  res.json(segment && segment !== 'all' ? kpiCatalog.filter((k) => k.segment === segment) : kpiCatalog);
});

app.get('/api/v1/tracked-kpis', (req, res) => res.json(trackedKpisState));

app.post('/api/v1/tracked-kpis', (req, res) => {
  const entry = kpiCatalog.find((k) => k.id === req.body.kpiId);
  if (!entry) return res.status(404).json({ message: 'KPI not found in catalog' });
  if (trackedKpisState.some((t) => t.id === entry.id)) return res.json(trackedKpisState.find((t) => t.id === entry.id));
  const tracked = {
    id: entry.id,
    name: entry.name,
    segment: entry.segment,
    category: entry.category,
    source: 'catalog',
    driversNeeded: entry.driversNeeded,
    dataStatus: 'needs_connection',
    addedAt: new Date().toISOString(),
  };
  trackedKpisState = [...trackedKpisState, tracked];
  logAudit('signal', entry.id, `started tracking KPI "${entry.name}"`);
  res.json(tracked);
});

app.post('/api/v1/tracked-kpis/custom', (req, res) => {
  const { name, drivers } = req.body;
  const tracked = {
    id: `kpi-custom-${Date.now()}`,
    name,
    segment: null,
    category: null,
    source: 'custom',
    driversNeeded: drivers || [],
    dataStatus: 'needs_connection',
    addedAt: new Date().toISOString(),
  };
  trackedKpisState = [...trackedKpisState, tracked];
  logAudit('signal', tracked.id, `added a custom KPI by drivers: "${name}"`);
  res.json(tracked);
});

app.delete('/api/v1/tracked-kpis/:id', (req, res) => {
  trackedKpisState = trackedKpisState.filter((t) => t.id !== req.params.id);
  res.json({ ok: true });
});

app.post('/api/v1/connections/:id/import-planning-data', (req, res) => {
  const conn = connectionsState.find((c) => c.id === req.params.id);
  if (!conn) return res.status(404).json({ message: 'Connection not found' });
  if (!['anaplan', 'adaptive_planning'].includes(conn.connectorTypeId)) {
    return res.status(400).json({ message: 'This connection is not a planning tool connector' });
  }
  const driversImported = [
    { name: 'Revenue — Volume', value: '128,400 units / month' },
    { name: 'Revenue — Price', value: '$42.10 avg unit price' },
    { name: 'COGS — Unit cost', value: '$18.65 / unit' },
    { name: 'Opex — Headcount', value: '412 FTE' },
  ];
  const budgetLinesImported = [
    { name: 'FY26 Revenue Budget', amount: '$42.0M' },
    { name: 'FY26 Opex Budget', amount: '$18.5M' },
    { name: 'FY26 Capex Budget', amount: '$3.2M' },
  ];
  const importedKpis = driversImported.map((d, i) => ({
    id: `kpi-import-${conn.id}-${i}`,
    name: d.name,
    segment: null,
    category: 'financial',
    source: 'planning_import',
    driversNeeded: [{ name: d.name, dataSource: conn.name }],
    dataStatus: 'connected',
    addedAt: new Date().toISOString(),
  }));
  trackedKpisState = [...trackedKpisState, ...importedKpis.filter((k) => !trackedKpisState.some((t) => t.id === k.id))];
  logAudit('connection', conn.id, `imported drivers and budget from ${conn.name}`);
  res.json({
    connectionId: conn.id,
    connectorName: conn.name,
    driversImported,
    budgetLinesImported,
    importedAt: new Date().toISOString(),
  });
});

// ---------- Agent Space ----------
app.get('/api/v1/agents/catalog', (req, res) => {
  const { function: fn, status, agentType, search, persona, scope } = req.query;
  const studioAgents = [...createdAgents.entries()]
    .filter(([, a]) => a.catalogMeta)
    .map(([agentId, a]) => ({ agentId, ...a.preview, ...a.catalogMeta }));
  // Catalog is scoped to the current operating context; studio-built agents always show.
  let result = filterByPersona([...op(req).agentCatalog, ...studioAgents], persona, scope);
  if (fn && fn !== 'all') result = result.filter((a) => a.function2 === fn);
  if (status && status !== 'all') result = result.filter((a) => a.catalogStatus === status);
  if (agentType && agentType !== 'all') result = result.filter((a) => a.creationPath === agentType);
  if (search) result = result.filter((a) => a.name.toLowerCase().includes(String(search).toLowerCase()));
  res.json(result);
});

app.get('/api/v1/agents/:agentId/catalog-detail', (req, res) => {
  const seedMatch = op(req).agentCatalog.find((a) => a.agentId === req.params.agentId);
  if (seedMatch) return res.json(seedMatch);
  const created = createdAgents.get(req.params.agentId);
  if (created?.catalogMeta) return res.json({ agentId: req.params.agentId, ...created.preview, ...created.catalogMeta });
  res.status(404).json({ message: 'Agent not found' });
});

// ---------- Agent Studio ----------
const workflowsState = new Map();

app.get('/api/v1/workflows', (req, res) => res.json([...workflowsState.values()]));

app.get('/api/v1/workflows/:id', (req, res) => {
  const wf = workflowsState.get(req.params.id);
  if (!wf) return res.status(404).json({ message: 'Workflow not found' });
  res.json(wf);
});

app.post('/api/v1/workflows', (req, res) => {
  const id = `wf-${Date.now()}`;
  const wf = makeSeedWorkflow(id, req.body?.name);
  workflowsState.set(id, wf);
  res.json(wf);
});

app.put('/api/v1/workflows/:id', (req, res) => {
  const existing = workflowsState.get(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Workflow not found' });
  const updated = { ...existing, ...req.body, id: existing.id, updatedAt: new Date().toISOString() };
  workflowsState.set(req.params.id, updated);
  res.json(updated);
});

app.post('/api/v1/workflows/:id/nodes/:nodeId/generate-prompt', (req, res) => {
  const wf = workflowsState.get(req.params.id);
  if (!wf) return res.status(404).json({ message: 'Workflow not found' });
  const node = wf.nodes.find((n) => n.id === req.params.nodeId);
  const { instructions } = req.body;
  const generatedPrompt = generatePromptFromInstructions(instructions);
  if (node) {
    node.instructions = instructions;
    node.generatedPrompt = generatedPrompt;
    node.generatedAt = new Date().toISOString();
  }
  res.json({ generatedPrompt });
});

app.post('/api/v1/workflows/:id/simulate', (req, res) => {
  const wf = workflowsState.get(req.params.id);
  if (!wf) return res.status(404).json({ message: 'Workflow not found' });
  const outputNode = wf.nodes.find((n) => n.kind === 'output');
  const nodeResults = wf.nodes.map((n) => {
    let summary = `Processed ${n.kind} node "${n.label}".`;
    if (n.kind === 'input') summary = `Loaded ${n.sourceType === 'synthetic' ? 'synthetic sample data' : 'data from connection'}.`;
    if (n.kind === 'process') summary = `Ran process step: ${n.instructions || '(no instructions set)'}`;
    if (n.kind === 'output') summary = `Produced ${n.outputType} output.`;
    if (n.kind === 'loop') summary = `Looped ${n.iterationMode === 'fixed_count' ? `${n.iterationCount || 1} times` : 'per item'}.`;
    if (n.kind === 'approval') summary = `Routed for approval to ${n.approverUserIds?.length || 0} approver(s).`;
    if (n.kind === 'agent') summary = `Invoked nested agent.`;
    return { nodeId: n.id, summary, sampleOutputPreview: summary };
  });
  const result = {
    workflowId: wf.id,
    ranAt: new Date().toISOString(),
    status: 'success',
    nodeResults,
    finalOutputPreview: getOutputPreview(outputNode?.outputType),
  };
  const budget = wf.costBudget?.maxTokensPerRun;
  if (budget && wf.nodes.length * 5000 > budget) result.budgetWarning = `Estimated run cost exceeds the configured token budget (${budget} tokens/run).`;
  res.json(result);
});

app.post('/api/v1/workflows/:id/publish', (req, res) => {
  const wf = workflowsState.get(req.params.id);
  if (!wf) return res.status(404).json({ message: 'Workflow not found' });
  wf.status = 'published';
  wf.publishedVersion = wf.version;
  const processNode = wf.nodes.find((n) => n.kind === 'process');
  const outputNode = wf.nodes.find((n) => n.kind === 'output');
  const inputNode = wf.nodes.find((n) => n.kind === 'input');
  const agentId = wf.linkedAgentId || `agent-${Date.now()}`;
  wf.linkedAgentId = agentId;
  const preview = {
    state: 'live',
    name: wf.name,
    function: 'Custom · Studio',
    capabilitiesCount: wf.nodes.length,
    dataInputs: inputNode?.sourceType === 'synthetic' ? 'Synthetic data' : 'Connected data source',
    reviewGate: wf.nodes.some((n) => n.kind === 'approval') ? 'Human approval node in flow' : 'None configured',
    owner: wf.owner,
    guardrails: 'Studio-built · default guardrails',
    estRuntime: '2–4 min',
  };
  const catalogMeta = {
    description: processNode?.instructions || 'Studio-built workflow agent.',
    industry: 'general',
    function2: 'it',
    catalogStatus: 'live',
    creationPath: 'studio',
    workflowId: wf.id,
    inputsSummary: [inputNode?.sourceType === 'synthetic' ? 'Synthetic data' : 'Data connector'],
    outputsSummary: [outputNode?.outputType ?? 'json'],
    roiToDate: { label: 'Measured impact', value: '—', direction: 'flat' },
    tokenCostToDate: { tokens: 0, estCost: '$0.00' },
    runsCount: 0,
    lastRunAt: null,
  };
  createdAgents.set(agentId, { sessionId: null, preview, catalogMeta });
  res.json({ agentId, ...wf });
});

// ---------- Signal Studio ----------
let suggestedSignalsState = [...suggestedSignals];
let kpiTicketsState = [...kpiTickets];

app.get('/api/v1/signals/suggested', (req, res) => {
  const { connectionId, persona } = req.query;
  let result = connectionId ? suggestedSignalsState.filter((s) => s.sourceConnectionIds.includes(connectionId)) : suggestedSignalsState;
  result = filterByPersona(result, persona);
  res.json(result);
});

app.get('/api/v1/signals/:id/detail', (req, res) => {
  const detail = signalDetails[req.params.id];
  if (!detail) return res.status(404).json({ message: 'No detail available for this signal' });
  res.json(detail);
});

app.post('/api/v1/signals/:id/request-unmask', (req, res) => {
  const detail = signalDetails[req.params.id];
  if (!detail) return res.status(404).json({ message: 'No detail available for this signal' });
  detail.piiUnmaskRequested = true;
  logAudit('signal', req.params.id, 'requested to unmask PII, reason logged');
  res.json(detail);
});

app.post('/api/v1/signals/:id/similar/:matchId/request-access', (req, res) => {
  const detail = signalDetails[req.params.id];
  const match = detail?.similarSignals.find((s) => s.id === req.params.matchId);
  if (!detail || !match) return res.status(404).json({ message: 'No matching signal found' });
  match.accessRequested = true;
  logAudit('signal', req.params.id, `requested access to restricted signal ${req.params.matchId}`);
  res.json(detail);
});

app.get('/api/v1/signals/committee', (req, res) => res.json(reviewCommittee));

app.post('/api/v1/signals/:id/submit-for-review', (req, res) => {
  const signal = suggestedSignalsState.find((s) => s.id === req.params.id);
  if (!signal) return res.status(404).json({ message: 'Signal not found' });
  signal.approvalStatus = 'pending_review';
  logAudit('signal', signal.id, 'submitted for review');
  res.json(signal);
});

app.post('/api/v1/signals/:id/approve', (req, res) => {
  const signal = suggestedSignalsState.find((s) => s.id === req.params.id);
  if (!signal) return res.status(404).json({ message: 'Signal not found' });
  const { approverUserId } = req.body;
  const approver = reviewCommittee.find((m) => m.userId === approverUserId);
  signal.approvalStatus = 'approved';
  logAudit('signal', signal.id, 'approved signal', approver?.name ?? 'Committee member');
  const newTicket = {
    id: `tix-${Date.now()}`,
    signalId: signal.id,
    signalName: signal.name,
    status: 'new',
    assignedTo: { name: 'Sanju Mathew', initials: 'SJ', avatarBg: '#0D9488' },
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lineage: signal.lineage,
  };
  kpiTicketsState = [...kpiTicketsState, newTicket];
  res.json(signal);
});

app.post('/api/v1/signals/:id/reject', (req, res) => {
  const signal = suggestedSignalsState.find((s) => s.id === req.params.id);
  if (!signal) return res.status(404).json({ message: 'Signal not found' });
  signal.approvalStatus = 'rejected';
  logAudit('signal', signal.id, 'rejected signal');
  res.json(signal);
});

app.get('/api/v1/kpi-tickets', (req, res) => {
  const { status } = req.query;
  const result = !status || status === 'all' ? kpiTicketsState : kpiTicketsState.filter((t) => t.status === status);
  res.json(result);
});

app.patch('/api/v1/kpi-tickets/:id/status', (req, res) => {
  const ticket = kpiTicketsState.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  ticket.status = req.body.status;
  ticket.updatedAt = new Date().toISOString();
  res.json(ticket);
});

app.post('/api/v1/kpi-tickets/:id/comments', (req, res) => {
  const ticket = kpiTicketsState.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  const comment = {
    id: `c-${Date.now()}`,
    authorName: 'Kumara Vijayan',
    authorInitials: 'KV',
    authorAvatarBg: '#4F46E5',
    text: req.body.text,
    createdAt: new Date().toISOString(),
    stageAtComment: ticket.status,
  };
  ticket.comments = [...ticket.comments, comment];
  ticket.updatedAt = new Date().toISOString();
  res.json(ticket);
});

// ---------- Solution design ----------
const solutionDesigns = new Map();
const agentSpecs = new Map();

// Pre-seeded loop: fmcg-f-7 was dispositioned Act on 18 Jun, so its solution
// design (and the tasks it fans out) exist from the seed, not only after a
// live Act in this session.
solutionDesigns.set('sol-fmcg-riyadh-otif', {
  id: 'sol-fmcg-riyadh-otif',
  signalId: 'fmcg-f-7',
  signalName: 'Riyadh DC case fill sliding — key-account penalties accruing',
  signalCategory: 'laggard',
  status: 'drafting',
  approach: 'Resize safety stock on the two fast movers, add a weekly velocity-to-cover check, and stand up an OTIF recovery agent scoped to the Riyadh DC.',
  dataNeeded: 'ERP order lines; DC stock snapshots; key-account penalty notices',
  owner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309' },
  guardrails: 'No allocation change that deprioritises a strategic account without sign-off.',
  copiedFromLabel: null,
  taskList: [
    { id: 'sol-fmcg-riyadh-otif-t1', type: 'new_agent', title: 'OTIF recovery agent — Riyadh DC', owner: 'Platform team', status: 'proposed', channel: 'app', comments: [], persona: 'operations_head' },
    { id: 'sol-fmcg-riyadh-otif-t2', type: 'human_task', title: 'Resize safety stock on the two fast-moving lines', owner: 'Omar Farouk', status: 'confirmed', channel: 'app', comments: [], persona: 'operations_head' },
    { id: 'sol-fmcg-riyadh-otif-t3', type: 'human_task', title: 'Negotiate penalty waiver with the two key accounts', owner: 'Layla Nasser', status: 'needs_review', channel: 'app', comments: [], persona: 'sales_supervisor' },
    { id: 'sol-fmcg-riyadh-otif-t4', type: 'existing_agent', title: 'Notification agent — weekly cover check to planning', owner: 'Reused, no change needed', status: 'confirmed', channel: 'app', comments: [], persona: 'operations_head' },
  ],
  validation: null,
  createdAt: '2026-06-18T09:00:00Z',
  updatedAt: '2026-06-18T09:00:00Z',
});

function makeDefaultTaskList(solutionId, signalName, persona = 'operations_head') {
  return [
    { id: `${solutionId}-t1`, type: 'new_agent', title: `${signalName.split(' - ')[0].split(' erosion')[0]} response agent`, owner: 'Platform team', status: 'proposed', channel: 'app', comments: [], persona },
    { id: `${solutionId}-t2`, type: 'existing_agent', title: 'Notification agent', owner: 'Reused, no change needed', status: 'confirmed', channel: 'app', comments: [], persona },
    { id: `${solutionId}-t3`, type: 'human_task', title: 'Confirm the proposed fix with the business owner', owner: 'You', status: 'needs_review', channel: 'app', comments: [], persona },
  ];
}

function findTask(taskId) {
  for (const solution of solutionDesigns.values()) {
    const task = solution.taskList.find((t) => t.id === taskId);
    if (task) return { task, solution };
  }
  for (const quick of quickSolutions.values()) {
    const task = quick.tasks.find((t) => t.id === taskId);
    if (task) {
      const signal = suggestedSignalsState.find((s) => s.id === quick.signalId);
      return { task, solution: { id: quick.id, signalName: `Quick fix: ${signal?.name ?? quick.signalId}`, updatedAt: quick.createdAt } };
    }
  }
  return null;
}

function runValidation(solution) {
  const needsNewConnector = /new (data|connector|feed|source)/i.test(solution.dataNeeded);
  return {
    pros: [
      'Directly targets the root cause behind this signal',
      solution.copiedFromLabel ? `Already proven once - copied from ${solution.copiedFromLabel}` : 'Reuses at least one existing agent, limiting build effort',
    ],
    cons: needsNewConnector
      ? ['Needs a new data connector before it can run in production']
      : ['Still depends on manual follow-through by the task owners'],
    expectedRoi: needsNewConnector ? '2.6x' : '3.8x',
    expectedCost: needsNewConnector ? '$2,400' : '$1,400',
    timeToValue: needsNewConnector ? '~5 weeks' : '~3 weeks',
    recommendation: needsNewConnector ? 'dev_handoff' : 'ready_for_runs',
    recommendationReason: needsNewConnector
      ? 'This solution needs a new data connector - that is a technical build, best handed to dev or IT.'
      : 'This is a process and task change against data already connected - no technical build needed.',
  };
}

app.post('/api/v1/solutions', (req, res) => {
  const { signalId } = req.body;
  const signal = suggestedSignalsState.find((s) => s.id === signalId);
  if (!signal) return res.status(404).json({ message: 'Signal not found' });
  const id = `sol-${Date.now()}`;
  const now = new Date().toISOString();
  const solution = {
    id,
    signalId,
    signalName: signal.name,
    signalCategory: signal.category,
    status: 'drafting',
    approach: `Investigate the drivers behind "${signal.name}" and put a corrective plan in front of the business owner.`,
    dataNeeded: signal.lineage.map((l) => l.fieldsUsed.join(', ')).join('; ') || 'existing connected data',
    owner: { name: 'Kumara Vijayan', initials: 'KV', avatarBg: '#4F46E5' },
    guardrails: 'Pause and ask before any change with a projected impact over $2,000.',
    copiedFromLabel: null,
    taskList: makeDefaultTaskList(id, signal.name, signal.persona),
    validation: null,
    createdAt: now,
    updatedAt: now,
  };
  solutionDesigns.set(id, solution);
  logAudit('signal', signalId, 'started a solution design');
  res.json(solution);
});

app.get('/api/v1/solutions/:id', (req, res) => {
  const solution = solutionDesigns.get(req.params.id);
  if (!solution) return res.status(404).json({ message: 'Solution design not found' });
  res.json(solution);
});

app.post('/api/v1/solutions/:id/copy', (req, res) => {
  const solution = solutionDesigns.get(req.params.id);
  if (!solution) return res.status(404).json({ message: 'Solution design not found' });
  const detail = signalDetails[solution.signalId];
  const match = detail?.similarSignals.find((s) => s.id === req.body.fromSimilarSignalId);
  if (!match?.priorSolution) return res.status(404).json({ message: 'No prior solution to copy from that match' });
  solution.approach = `${match.priorSolution.summary} Tweaked for this signal based on local conditions.`;
  solution.dataNeeded = `${solution.dataNeeded}; a new data connector to reach the supplier rebate ledger used in that prior solution`;
  solution.copiedFromLabel = match.label;
  solution.validation = null;
  solution.updatedAt = new Date().toISOString();
  logAudit('signal', solution.signalId, `copied a prior solution into the design (${match.label})`);
  res.json(solution);
});

app.post('/api/v1/solutions/:id/run-validation', (req, res) => {
  const solution = solutionDesigns.get(req.params.id);
  if (!solution) return res.status(404).json({ message: 'Solution design not found' });
  solution.validation = runValidation(solution);
  solution.updatedAt = new Date().toISOString();
  res.json(solution);
});

app.post('/api/v1/solutions/:id/send-for-approval', (req, res) => {
  const solution = solutionDesigns.get(req.params.id);
  if (!solution) return res.status(404).json({ message: 'Solution design not found' });
  if (!solution.validation) return res.status(400).json({ message: 'Run validation before sending for approval' });
  solution.status = 'pending_approval';
  solution.updatedAt = new Date().toISOString();
  logAudit('signal', solution.signalId, 'sent solution design for approval');
  res.json(solution);
});

app.post('/api/v1/solutions/:id/approve', (req, res) => {
  const solution = solutionDesigns.get(req.params.id);
  if (!solution) return res.status(404).json({ message: 'Solution design not found' });
  solution.status = 'approved';
  solution.updatedAt = new Date().toISOString();
  logAudit('signal', solution.signalId, 'approved solution design');
  res.json(solution);
});

// ---------- Solution in hand (fast path — reviewer already has a fix) ----------
const quickSolutions = new Map();

function makeQuickSolutionTasks(persona = 'operations_head') {
  const stamp = Date.now();
  return [
    { id: `qt-${stamp}-1`, type: 'human_task', title: 'Carry out the described fix', owner: 'You', status: 'proposed', channel: 'app', comments: [], persona },
    { id: `qt-${stamp}-2`, type: 'human_task', title: 'Confirm the fix resolved the signal', owner: 'You', status: 'proposed', channel: 'app', comments: [], persona },
  ];
}

app.post('/api/v1/quick-solutions', (req, res) => {
  const { signalId, description } = req.body;
  const signal = suggestedSignalsState.find((s) => s.id === signalId);
  if (!signal) return res.status(404).json({ message: 'Signal not found' });
  const id = `qs-${Date.now()}`;
  const quick = {
    id,
    signalId,
    description,
    status: 'pending_confirmation',
    tasks: makeQuickSolutionTasks(signal.persona),
    createdAt: new Date().toISOString(),
  };
  quickSolutions.set(id, quick);
  logAudit('signal', signalId, 'described a solution in hand, broken into tasks');
  res.json(quick);
});

app.get('/api/v1/quick-solutions/:id', (req, res) => {
  const quick = quickSolutions.get(req.params.id);
  if (!quick) return res.status(404).json({ message: 'Quick solution not found' });
  res.json(quick);
});

app.post('/api/v1/quick-solutions/:id/confirm', (req, res) => {
  const quick = quickSolutions.get(req.params.id);
  if (!quick) return res.status(404).json({ message: 'Quick solution not found' });
  quick.status = 'confirmed';
  logAudit('signal', quick.signalId, 'confirmed the solution in hand — tasks assigned and notified');
  res.json(quick);
});

// ---------- Tasks (assigned across all solution designs, and confirmed quick solutions) ----------
app.get('/api/v1/tasks', (req, res) => {
  const { status, persona, scope } = req.query;
  const all = [];
  for (const solution of solutionDesigns.values()) {
    for (const task of solution.taskList) {
      all.push({ ...task, solutionId: solution.id, solutionName: solution.signalName });
    }
  }
  for (const quick of quickSolutions.values()) {
    if (quick.status !== 'confirmed') continue;
    const signal = suggestedSignalsState.find((s) => s.id === quick.signalId);
    for (const task of quick.tasks) {
      all.push({ ...task, solutionId: quick.id, solutionName: `Quick fix: ${signal?.name ?? quick.signalId}` });
    }
  }
  const scoped = filterByPersona(all, persona, scope);
  res.json(status && status !== 'all' ? scoped.filter((t) => t.status === status) : scoped);
});

app.post('/api/v1/tasks/:taskId/feedback', (req, res) => {
  const found = findTask(req.params.taskId);
  if (!found) return res.status(404).json({ message: 'Task not found' });
  const comment = { id: `tc-${Date.now()}`, authorName: currentUser.name, text: req.body.text, createdAt: new Date().toISOString() };
  found.task.comments = [...found.task.comments, comment];
  found.solution.updatedAt = new Date().toISOString();
  res.json({ ...found.task, solutionId: found.solution.id, solutionName: found.solution.signalName });
});

app.patch('/api/v1/tasks/:taskId/status', (req, res) => {
  const found = findTask(req.params.taskId);
  if (!found) return res.status(404).json({ message: 'Task not found' });
  found.task.status = req.body.status;
  found.solution.updatedAt = new Date().toISOString();
  res.json({ ...found.task, solutionId: found.solution.id, solutionName: found.solution.signalName });
});

app.patch('/api/v1/tasks/:taskId/channel', (req, res) => {
  const found = findTask(req.params.taskId);
  if (!found) return res.status(404).json({ message: 'Task not found' });
  found.task.channel = req.body.channel;
  res.json({ ...found.task, solutionId: found.solution.id, solutionName: found.solution.signalName });
});

// ---------- Unified Agent Studio (one spec, two altitudes) ----------
function pushVersion(spec, summary, altitude) {
  spec.version += 1;
  spec.versionTrail = [{ version: spec.version, summary, actorName: currentUser.name, altitude, timestamp: new Date().toISOString() }, ...spec.versionTrail];
}

app.post('/api/v1/agent-specs', (req, res) => {
  const { solutionId, taskId } = req.body;
  const solution = solutionDesigns.get(solutionId);
  const task = solution?.taskList.find((t) => t.id === taskId);
  if (!solution || !task) return res.status(404).json({ message: 'Solution or task not found' });
  const existing = [...agentSpecs.values()].find((s) => s.taskId === taskId);
  if (existing) return res.json(existing);

  const id = `agt-${Date.now()}`;
  const spec = {
    id,
    name: task.title,
    persona: task.persona ?? 'operations_head',
    solutionDesignId: solutionId,
    taskId,
    status: 'drafting',
    needsTechnicalWork: solution.validation?.recommendation === 'dev_handoff',
    owner: solution.owner,
    version: 1,
    versionTrail: [{ version: 1, summary: 'Drafted from the approved solution design', actorName: currentUser.name, altitude: 'business', timestamp: new Date().toISOString() }],
    intent: solution.approach,
    capabilities: [
      { id: 'c1', label: 'Watch the signal daily', selected: true },
      { id: 'c2', label: 'Draft a fix for review', selected: true },
      { id: 'c3', label: 'Notify the task owner', selected: true },
      { id: 'c4', label: 'Auto-apply within guardrails', selected: false },
    ],
    planPreview: [`Watch for "${solution.signalName}" recurring`, 'Draft a fix and route it for review', 'Notify the owner once resolved'],
    dataContract: solution.dataNeeded.split(';').map((s) => s.trim()).filter(Boolean),
    permissions: ['Read: source data feed', 'Write: task queue', 'Notify: task owners'],
    guardrails: solution.guardrails,
    testRunResult: null,
    escalation: null,
    handback: null,
    delegateIdentity: {
      delegateName: task.title.replace(/ (response )?agent$/i, ''),
      tone: 'direct',
      communicationStyle: 'data_first',
      responseType: 'proactive',
      escalationTemperament: 30,
      workingHours: 'business_hours',
      whenUnsure: 'Pauses and asks the business owner directly, rather than guessing or applying a default action.',
    },
  };
  agentSpecs.set(id, spec);
  task.agentSpecId = id;
  res.json(spec);
});

app.get('/api/v1/agent-specs/:id', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  res.json(spec);
});

app.patch('/api/v1/agent-specs/:id/business', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  const { intent, capabilities } = req.body;
  if (intent !== undefined) spec.intent = intent;
  if (capabilities !== undefined) spec.capabilities = capabilities;
  pushVersion(spec, 'Updated the business plan', 'business');
  res.json(spec);
});

app.patch('/api/v1/agent-specs/:id/delegate', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  spec.delegateIdentity = { ...spec.delegateIdentity, ...req.body };
  pushVersion(spec, 'Updated the delegate identity', 'business');
  res.json(spec);
});

app.patch('/api/v1/agent-specs/:id/developer', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  const { dataContract, permissions, guardrails } = req.body;
  if (dataContract !== undefined) spec.dataContract = dataContract;
  if (permissions !== undefined) spec.permissions = permissions;
  if (guardrails !== undefined) spec.guardrails = guardrails;
  pushVersion(spec, 'Updated the technical specification', 'developer');
  res.json(spec);
});

app.post('/api/v1/agent-specs/:id/escalate', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  spec.status = 'escalated';
  spec.escalation = {
    kind: 'escalate',
    fromName: spec.owner.name,
    fromRole: 'business owner',
    toLabel: 'Dev / IT, Aisha Rahman',
    note: req.body.note || 'Plain language ran out here — needs a developer to finish the technical setup.',
    createdAt: new Date().toISOString(),
  };
  pushVersion(spec, 'Escalated to developer', 'business');
  res.json(spec);
});

app.post('/api/v1/agent-specs/:id/test-run', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  spec.testRunResult = `Ran against fixture data — ${spec.capabilities.filter((c) => c.selected).length} capabilities exercised, no guardrail breaches, sample output matched expectations.`;
  pushVersion(spec, 'Test run against fixture data', 'developer');
  res.json(spec);
});

app.post('/api/v1/agent-specs/:id/handback', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  spec.status = 'ready_to_publish';
  spec.handback = {
    kind: 'handback',
    fromName: 'Aisha Rahman',
    fromRole: 'dev / IT',
    toLabel: spec.owner.name,
    note: 'Technical setup is done and ready to publish.',
    createdAt: new Date().toISOString(),
    contract: {
      does: spec.planPreview.join('; '),
      wont: 'Act outside the guardrails below without asking first.',
      owner: spec.owner.name,
      whenUnsure: 'Pauses and asks the business owner directly.',
    },
  };
  pushVersion(spec, 'Handed back to business', 'developer');
  res.json(spec);
});

app.post('/api/v1/agent-specs/:id/publish', (req, res) => {
  const spec = agentSpecs.get(req.params.id);
  if (!spec) return res.status(404).json({ message: 'Agent spec not found' });
  spec.status = 'published';
  const agentId = `agent-${spec.id}`;
  const preview = {
    agentId, state: 'live', name: spec.name, function: 'Signal response',
    capabilitiesCount: spec.capabilities.filter((c) => c.selected).length,
    dataInputs: spec.dataContract.join(', ') || 'existing connected data',
    reviewGate: spec.needsTechnicalWork ? 'Human approval before publish' : 'Human review as needed',
    owner: spec.owner, guardrails: spec.guardrails, estRuntime: '2–4 min',
  };
  const catalogMeta = {
    description: spec.intent,
    industry: 'general', function2: 'it', persona: spec.persona, catalogStatus: 'live', creationPath: 'studio',
    inputsSummary: spec.dataContract, outputsSummary: spec.planPreview,
    roiToDate: { label: 'Measured impact', value: '—', direction: 'flat' },
    tokenCostToDate: { tokens: 0, estCost: '$0.00' },
    runsCount: 0, lastRunAt: null,
  };
  createdAgents.set(agentId, { sessionId: null, preview, catalogMeta });
  spec.linkedAgentId = agentId;
  pushVersion(spec, 'Published — now live in Agent Space', spec.needsTechnicalWork ? 'developer' : 'business');

  const found = findTask(spec.taskId);
  if (found) found.task.status = 'done';
  res.json(spec);
});

// ---------- Shared: people directory & audit log ----------
app.get('/api/v1/people/directory', (req, res) => res.json(peopleDirectory));

app.get('/api/v1/audit-log', (req, res) => {
  const { entityType, entityId } = req.query;
  let result = auditLogState;
  if (entityType) result = result.filter((e) => e.entityType === entityType);
  if (entityId) result = result.filter((e) => e.entityId === entityId);
  res.json(result);
});

// ============ v4 — shadow organization ============
// KPI brains, shadow agents, findings with 4-A dispositions, closure KPIs.
let orgProfileState = { ...orgProfileSeed };
let brainsState = JSON.parse(JSON.stringify(brains));
let findingsState = JSON.parse(JSON.stringify(findingsSeed));
let closureKpisState = JSON.parse(JSON.stringify(closureKpisSeed));
const shadowOrgsSeed = JSON.parse(JSON.stringify(shadowOrgs));

function v4Industry(req) {
  const q = req.query.industry;
  return q && brainsState[q] ? q : orgProfileState.industry;
}

// closureTemplate is a server-side hint consumed on accept — not part of the client contract
function stripServerFields(finding) {
  const { closureTemplate, ...rest } = finding;
  return rest;
}

function findFinding(id) {
  for (const [industry, list] of Object.entries(findingsState)) {
    const finding = list.find((f) => f.id === id);
    if (finding) return { finding, industry };
  }
  return null;
}

// ---------- Org profile & industry templates ----------
// Honour ?industry= so the client-driven context stays consistent even when the
// serverless in-memory profile has reset (cold start).
app.get('/api/v1/org-profile', (req, res) => {
  const q = req.query.industry;
  res.json(q && brainsState[q] ? { ...orgProfileState, industry: q } : orgProfileState);
});

app.get('/api/v1/industries', (req, res) => res.json(industryOptions));

app.put('/api/v1/org-profile', (req, res) => {
  const { industry } = req.body;
  if (!brainsState[industry]) return res.status(400).json({ message: 'Unknown industry template' });
  orgProfileState = { ...orgProfileState, industry };
  logAudit('org', 'profile', `switched the industry template to ${industry}`);
  res.json(orgProfileState);
});

// ---------- KPI brain ----------
app.get('/api/v1/kpi-brain', (req, res) => res.json(brainsState[v4Industry(req)]));

app.post('/api/v1/kpi-brain/nodes', (req, res) => {
  const brain = brainsState[v4Industry(req)];
  const { name, streamKey, definition, dataSources = [], contributesTo } = req.body;
  if (!name || !streamKey) return res.status(400).json({ message: 'name and streamKey are required' });
  if (!brain.streams.some((s) => s.key === streamKey)) return res.status(400).json({ message: 'Unknown stream for this industry' });
  const id = `${brain.industry}-k-custom-${Date.now()}`;
  const node = {
    id,
    kind: 'stream_kpi',
    name,
    streamKey,
    definition: definition || '',
    status: dataSources.length ? 'connected' : 'needs_data',
    dataSources,
  };
  brain.nodes.push(node);
  if (contributesTo && brain.nodes.some((n) => n.id === contributesTo)) {
    brain.edges.push({ id: `${id}-edge`, source: id, target: contributesTo, weight: 'moderate', status: 'connected' });
  }
  logAudit('kpi', id, `added a custom KPI to the brain: ${name}`);
  res.json(node);
});

function findBrainNode(id) {
  for (const brain of Object.values(brainsState)) {
    const node = brain.nodes.find((n) => n.id === id);
    if (node) return { node, brain };
  }
  return null;
}

app.post('/api/v1/kpi-brain/nodes/:id/accept', (req, res) => {
  const hit = findBrainNode(req.params.id);
  if (!hit) return res.status(404).json({ message: 'Node not found' });
  if (hit.node.status !== 'proposed') return res.status(400).json({ message: 'Only proposed nodes can be accepted' });
  hit.node.status = 'connected';
  for (const edge of hit.brain.edges) {
    if (edge.status === 'proposed' && (edge.source === hit.node.id || edge.target === hit.node.id)) edge.status = 'connected';
  }
  logAudit('kpi', hit.node.id, `accepted the proposed KPI: ${hit.node.name}`);
  res.json(hit.brain);
});

app.post('/api/v1/kpi-brain/nodes/:id/decline', (req, res) => {
  const hit = findBrainNode(req.params.id);
  if (!hit) return res.status(404).json({ message: 'Node not found' });
  if (hit.node.status !== 'proposed') return res.status(400).json({ message: 'Only proposed nodes can be declined' });
  hit.node.status = 'declined';
  hit.brain.edges = hit.brain.edges.filter((e) => !(e.status === 'proposed' && (e.source === hit.node.id || e.target === hit.node.id)));
  logAudit('kpi', hit.node.id, `declined the proposed KPI: ${hit.node.name}`);
  res.json(hit.brain);
});

// Edit a node in the picture (mandate / intent / sense).
app.patch('/api/v1/kpi-brain/nodes/:id', (req, res) => {
  const hit = findBrainNode(req.params.id);
  if (!hit) return res.status(404).json({ message: 'Node not found' });
  const { node, brain } = hit;
  const { name, definition, targetValue, streamKey, dataSources } = req.body;
  if (typeof name === 'string' && name.trim()) node.name = name.trim();
  if (typeof definition === 'string') node.definition = definition;
  if (typeof targetValue === 'string') node.targetValue = targetValue;
  if (typeof streamKey === 'string' && brain.streams.some((s) => s.key === streamKey)) node.streamKey = streamKey;
  if (Array.isArray(dataSources)) {
    node.dataSources = dataSources;
    // keep data-status honest for non-petitioned nodes
    if (node.status === 'connected' || node.status === 'needs_data') {
      node.status = dataSources.length ? 'connected' : 'needs_data';
    }
  }
  logAudit('kpi', node.id, `edited ${node.kind === 'stream_kpi' ? 'mandate' : node.kind}: ${node.name}`);
  res.json(brain);
});

app.post('/api/v1/kpi-brain/edges/:id/accept', (req, res) => {
  for (const brain of Object.values(brainsState)) {
    const edge = brain.edges.find((e) => e.id === req.params.id);
    if (edge) {
      if (edge.status !== 'proposed') return res.status(400).json({ message: 'Only proposed connections can be accepted' });
      edge.status = 'connected';
      logAudit('kpi', edge.id, 'accepted a proposed KPI connection');
      return res.json(brain);
    }
  }
  res.status(404).json({ message: 'Connection not found' });
});

app.post('/api/v1/kpi-brain/edges/:id/decline', (req, res) => {
  for (const brain of Object.values(brainsState)) {
    const idx = brain.edges.findIndex((e) => e.id === req.params.id);
    if (idx !== -1) {
      if (brain.edges[idx].status !== 'proposed') return res.status(400).json({ message: 'Only proposed connections can be declined' });
      brain.edges.splice(idx, 1);
      logAudit('kpi', req.params.id, 'declined a proposed KPI connection');
      return res.json(brain);
    }
  }
  res.status(404).json({ message: 'Connection not found' });
});

// ---------- Shadow org (counts computed live from findings) ----------
app.get('/api/v1/shadow-org', (req, res) => {
  const industry = v4Industry(req);
  const findings = findingsState[industry];
  const agents = shadowOrgsSeed[industry].agents.map((agent) => {
    const mine = agent.streamKey === null
      ? findings.filter((f) => f.escalatedToAgentId === agent.id)
      : findings.filter((f) => f.streamKey === agent.streamKey);
    const open = mine.filter((f) => f.status === 'open');
    const breaches = open.filter((f) => f.slaHoursRemaining <= 8);
    const health = breaches.length ? 'critical' : open.length ? 'attention' : 'healthy';
    return { ...agent, openFindings: open.length, slaBreaches: breaches.length, health };
  });
  res.json({ industry, agents: filterByPersona(agents, req.query.persona, req.query.scope) });
});

// ---------- Findings & the 4-A disposition engine ----------
app.get('/api/v1/findings', (req, res) => {
  const industry = v4Industry(req);
  let result = findingsState[industry].map(stripServerFields);
  const { persona, stream, status, scope } = req.query;
  result = filterByPersona(result, persona, scope);
  if (stream && stream !== 'all') result = result.filter((f) => f.streamKey === stream);
  if (status && status !== 'all') result = result.filter((f) => f.status === status);
  const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
  const openFirst = (f) => (f.status === 'open' ? 0 : 1);
  result.sort((a, b) => openFirst(a) - openFirst(b) || sevRank[a.severity] - sevRank[b.severity] || a.slaHoursRemaining - b.slaHoursRemaining);
  res.json(result);
});

app.get('/api/v1/findings/:id', (req, res) => {
  const hit = findFinding(req.params.id);
  if (!hit) return res.status(404).json({ message: 'Finding not found' });
  res.json(stripServerFields(hit.finding));
});

// FP&A rollup: findings translated onto the P&L, per line item.
app.get('/api/v1/pl-impact', (req, res) => {
  res.json(plImpactSeed[v4Industry(req)] ?? []);
});

// The full P&L: lines × two dimensions, Actual vs Budget vs Forecast,
// with drift anomalies embedded as a task list.
app.get('/api/v1/pl-statement', (req, res) => {
  res.json(plStatementSeed[v4Industry(req)] ?? { period: '', unit: '', dimALabel: '', dimBLabel: '', lines: [], anomalies: [] });
});

app.post('/api/v1/findings/:id/disposition', (req, res) => {
  const hit = findFinding(req.params.id);
  if (!hit) return res.status(404).json({ message: 'Finding not found' });
  const { finding, industry } = hit;
  if (finding.status !== 'open') return res.status(400).json({ message: 'This finding already has a disposition' });
  const { disposition, reason, reAlertCondition } = req.body;
  const now = new Date().toISOString();

  if (disposition === 'accept') {
    // Accept: the finding is real — generate its measurable exit condition and keep watching.
    const template = finding.closureTemplate ?? { name: `Close: ${finding.title}`, baseline: '—', target: '—' };
    const closure = {
      id: `${industry}-c-${Date.now()}`,
      findingId: finding.id,
      findingTitle: finding.title,
      name: template.name,
      baseline: template.baseline,
      target: template.target,
      current: template.baseline,
      progressPct: 0,
      status: 'tracking',
      watchedByAgentName: finding.raisedByAgentName,
      createdAt: now,
      closedAt: null,
    };
    closureKpisState[industry].push(closure);
    finding.status = 'accepted';
    finding.closureKpiId = closure.id;
    logAudit('finding', finding.id, `accepted — closure KPI created: ${closure.name}`);
  } else if (disposition === 'act') {
    // Act: spin up the existing solution-design loop, seeded from the finding.
    const solutionId = `sol-${Date.now()}`;
    const categoryByStream = { finance: 'cost_drainer', commercial: 'revenue_leakage', marketing: 'revenue_leakage' };
    const solution = {
      id: solutionId,
      signalId: finding.id,
      signalName: finding.title,
      signalCategory: categoryByStream[finding.streamKey] ?? (finding.severity === 'critical' ? 'derailer' : 'laggard'),
      status: 'drafting',
      approach: `Work the finding raised by ${finding.raisedByAgentName}: ${finding.summary}`,
      dataNeeded: finding.evidence.map((e) => e.label).join('; ') || 'existing connected data',
      owner: { name: currentUser.name, initials: currentUser.initials, avatarBg: currentUser.avatarBg },
      guardrails: 'Pause and ask before any change with a projected impact over $2,000.',
      copiedFromLabel: null,
      taskList: makeDefaultTaskList(solutionId, finding.title, finding.persona),
      validation: null,
      createdAt: now,
      updatedAt: now,
    };
    solutionDesigns.set(solutionId, solution);
    finding.status = 'acting';
    finding.solutionDesignId = solutionId;
    logAudit('finding', finding.id, 'disposition: act — solution design opened');
  } else if (disposition === 'acknowledge') {
    // Acknowledge: watch state — carries a re-alert condition so it comes back if it worsens.
    const node = brainsState[industry].nodes.find((n) => n.id === finding.linkedKpiNodeId);
    finding.status = 'acknowledged';
    finding.reAlertCondition = reAlertCondition
      || `Re-alert if ${node?.name ?? 'the linked KPI'} worsens a further 5% or after 14 days`;
    logAudit('finding', finding.id, `acknowledged — ${finding.reAlertCondition}`);
  } else if (disposition === 'abandon') {
    // Abandon: requires a reason — the reason is what tunes the agent.
    if (!reason || !reason.trim()) return res.status(400).json({ message: 'Abandoning a finding requires a reason — it tunes the agent' });
    finding.status = 'abandoned';
    finding.dispositionReason = reason.trim();
    logAudit('finding', finding.id, `abandoned with reason: ${reason.trim()}`);
  } else {
    return res.status(400).json({ message: 'disposition must be accept, act, acknowledge or abandon' });
  }

  finding.disposition = disposition;
  finding.dispositionBy = currentUser.name;
  finding.dispositionAt = now;
  finding.slaHoursRemaining = 0;
  res.json(stripServerFields(finding));
});

app.post('/api/v1/findings/:id/escalate', (req, res) => {
  const hit = findFinding(req.params.id);
  if (!hit) return res.status(404).json({ message: 'Finding not found' });
  const { finding, industry } = hit;
  if (finding.status !== 'open') return res.status(400).json({ message: 'Only open findings can be escalated' });
  finding.escalationLevel += 1;
  finding.escalatedToAgentId = `${industry}-sa-chief`;
  finding.slaHoursRemaining = 12;
  logAudit('finding', finding.id, `escalated to level ${finding.escalationLevel} up the shadow org`);
  res.json(stripServerFields(finding));
});

// Re-alert an acknowledged finding — the trip-wire fired, so it comes back for a fresh disposition.
app.post('/api/v1/findings/:id/re-alert', (req, res) => {
  const hit = findFinding(req.params.id);
  if (!hit) return res.status(404).json({ message: 'Finding not found' });
  const { finding } = hit;
  if (finding.status !== 'acknowledged') return res.status(400).json({ message: 'Only acknowledged findings can re-alert' });
  finding.status = 'open';
  finding.disposition = null;
  finding.dispositionBy = null;
  finding.dispositionAt = null;
  finding.slaHoursRemaining = 12;
  finding.escalationLevel += 1;
  logAudit('finding', finding.id, 're-alerted — trip-wire fired, back to open for disposition');
  res.json(stripServerFields(finding));
});

// ---------- Exit conditions (closure) ----------
app.get('/api/v1/closure-kpis', (req, res) => res.json(closureKpisState[v4Industry(req)]));

// Close the loop: mark an exit condition met, which closes its originating finding too.
app.post('/api/v1/closure-kpis/:id/close', (req, res) => {
  const industry = v4Industry(req);
  const closure = closureKpisState[industry].find((c) => c.id === req.params.id);
  if (!closure) return res.status(404).json({ message: 'Exit condition not found' });
  const now = new Date().toISOString();
  closure.status = 'closed';
  closure.current = closure.target;
  closure.progressPct = 100;
  closure.closedAt = now;
  const finding = findingsState[industry].find((f) => f.id === closure.findingId);
  if (finding) {
    finding.status = 'closed';
    // The assessor agent (independent of the validation that reviewed the plan) confirms the outcome.
    finding.assessorVerdict = {
      verdict: 'worked',
      note: `Assessor agent confirmed the exit condition held: ${closure.name}. Closing the loop back to "${finding.title}".`,
      at: now,
    };
    logAudit('finding', finding.id, 'loop closed — assessor confirmed the exit condition held');
  }
  logAudit('kpi', closure.id, `exit condition met and closed: ${closure.name}`);
  res.json(closure);
});

// ---------- Full-state snapshot, for persistence on serverless (see mock-server/kv.js) ----------
// Reaches into every mutable collection above rather than threading a store
// through each route — keeps this additive instead of rewriting ~40 handlers.
export function exportState() {
  return {
    agentSessions: Object.fromEntries(agentSessions),
    createdAgents: Object.fromEntries(createdAgents),
    opStateByIndustry,
    connectorTypesState,
    connectionsState,
    auditLogState,
    trackedKpisState,
    workflowsState: Object.fromEntries(workflowsState),
    suggestedSignalsState,
    kpiTicketsState,
    solutionDesigns: Object.fromEntries(solutionDesigns),
    agentSpecs: Object.fromEntries(agentSpecs),
    quickSolutions: Object.fromEntries(quickSolutions),
    signalDetails,
    orgProfileState,
    brainsState,
    findingsState,
    closureKpisState,
  };
}

export function importState(snapshot) {
  if (!snapshot) return;
  if (snapshot.agentSessions) { agentSessions.clear(); for (const [k, v] of Object.entries(snapshot.agentSessions)) agentSessions.set(k, v); }
  if (snapshot.createdAgents) { createdAgents.clear(); for (const [k, v] of Object.entries(snapshot.createdAgents)) createdAgents.set(k, v); }
  if (snapshot.opStateByIndustry) Object.assign(opStateByIndustry, snapshot.opStateByIndustry);
  if (snapshot.connectorTypesState) connectorTypesState = snapshot.connectorTypesState;
  if (snapshot.connectionsState) connectionsState = snapshot.connectionsState;
  if (snapshot.auditLogState) auditLogState = snapshot.auditLogState;
  if (snapshot.trackedKpisState) trackedKpisState = snapshot.trackedKpisState;
  if (snapshot.workflowsState) { workflowsState.clear(); for (const [k, v] of Object.entries(snapshot.workflowsState)) workflowsState.set(k, v); }
  if (snapshot.suggestedSignalsState) suggestedSignalsState = snapshot.suggestedSignalsState;
  if (snapshot.kpiTicketsState) kpiTicketsState = snapshot.kpiTicketsState;
  if (snapshot.solutionDesigns) { solutionDesigns.clear(); for (const [k, v] of Object.entries(snapshot.solutionDesigns)) solutionDesigns.set(k, v); }
  if (snapshot.agentSpecs) { agentSpecs.clear(); for (const [k, v] of Object.entries(snapshot.agentSpecs)) agentSpecs.set(k, v); }
  if (snapshot.quickSolutions) { quickSolutions.clear(); for (const [k, v] of Object.entries(snapshot.quickSolutions)) quickSolutions.set(k, v); }
  if (snapshot.signalDetails) Object.assign(signalDetails, snapshot.signalDetails);
  if (snapshot.orgProfileState) orgProfileState = snapshot.orgProfileState;
  if (snapshot.brainsState) brainsState = snapshot.brainsState;
  if (snapshot.findingsState) findingsState = snapshot.findingsState;
  if (snapshot.closureKpisState) closureKpisState = snapshot.closureKpisState;
}

export default app;
