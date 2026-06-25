import express from 'express';
import cors from 'cors';
import {
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
  reviewCommittee,
  kpiTickets,
  peopleDirectory,
  auditLog,
} from './data.js';

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

// ---------- Dashboard / Command Center ----------
app.get('/api/v1/dashboard/summary', (req, res) => {
  res.json({ ...dashboardSummary, kpis: { ...dashboardSummary.kpis, decisionsPending: { ...dashboardSummary.kpis.decisionsPending, value: pendingDecisionsState.length } } });
});

app.get('/api/v1/decisions/pending', (req, res) => res.json(pendingDecisionsState));

app.post('/api/v1/decisions/:id/approve', (req, res) => {
  const { id } = req.params;
  const decision = pendingDecisionsState.find((d) => d.id === id);
  pendingDecisionsState = pendingDecisionsState.filter((d) => d.id !== id);
  res.json(decision ?? { id });
});

app.get('/api/v1/pulse', (req, res) => res.json(pulse));

app.get('/api/v1/runs/live', (req, res) => res.json(liveRuns));

app.get('/api/v1/people/top-performer', (req, res) => res.json(topPerformer));

// ---------- Runs & Actions ----------
app.get('/api/v1/runs', (req, res) => {
  const { status } = req.query;
  const filtered = !status || status === 'all' ? runs : runs.filter((r) => r.status === status);
  res.json(filtered);
});

app.get('/api/v1/runs/:id', (req, res) => {
  const detail = runDetails[req.params.id];
  if (!detail) return res.status(404).json({ message: 'Run not found' });
  res.json(detail);
});

app.post('/api/v1/runs/:id/pause', (req, res) => res.json({ id: req.params.id, status: 'paused' }));
app.post('/api/v1/runs/:id/resume', (req, res) => res.json({ id: req.params.id, status: 'running' }));

// ---------- Decision Ledger ----------
app.get('/api/v1/decisions/stats', (req, res) => res.json(decisionStats));

app.get('/api/v1/decisions', (req, res) => {
  const { function: fn, verdict } = req.query;
  let result = decisionLedger;
  if (fn && fn !== 'all') result = result.filter((d) => d.function === fn);
  if (verdict && verdict !== 'all') result = result.filter((d) => d.verdict === verdict);
  res.json(result);
});

// ---------- People & Agents ----------
app.get('/api/v1/leaderboard/highlights', (req, res) => res.json(leaderboardHighlights));

app.get('/api/v1/leaderboard', (req, res) => {
  const { type } = req.query;
  const result = !type || type === 'all' ? leaderboard : leaderboard.filter((l) => l.type === type);
  res.json(result);
});

// ---------- Outcomes ----------
app.get('/api/v1/outcomes/:runId', (req, res) => {
  const report = outcomeReportsState[req.params.runId];
  if (!report) return res.status(404).json({ message: 'Outcome report not found' });
  res.json(report);
});

app.post('/api/v1/outcomes/:runId/actions/:actionId/assign', (req, res) => {
  const report = outcomeReportsState[req.params.runId];
  if (!report) return res.status(404).json({ message: 'Outcome report not found' });
  const action = report.actions.find((a) => a.id === req.params.actionId);
  if (action) action.assigned = true;
  res.json(action ?? {});
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

app.post('/api/v1/connections', (req, res) => {
  const { connectorTypeId, name, config } = req.body;
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
  };
  connectionsState = [...connectionsState, newConnection];
  logAudit('connection', newConnection.id, 'created connection');
  res.json(newConnection);
});

app.post('/api/v1/connections/:id/approve', (req, res) => {
  const conn = connectionsState.find((c) => c.id === req.params.id);
  if (!conn) return res.status(404).json({ message: 'Connection not found' });
  conn.status = 'approved';
  logAudit('connection', conn.id, 'approved connection');
  res.json(conn);
});

app.post('/api/v1/connections/:id/reject', (req, res) => {
  const conn = connectionsState.find((c) => c.id === req.params.id);
  if (!conn) return res.status(404).json({ message: 'Connection not found' });
  conn.status = 'rejected';
  logAudit('connection', conn.id, 'rejected connection');
  res.json(conn);
});

app.get('/api/v1/connections/:id/signal-coverage', (req, res) => {
  const conn = connectionsState.find((c) => c.id === req.params.id);
  if (!conn) return res.status(404).json({ message: 'Connection not found' });
  const calculableSignalIds = suggestedSignalsState.filter((s) => s.sourceConnectionIds.includes(conn.id)).map((s) => s.id);
  res.json({ connectionId: conn.id, connectionName: conn.name, calculableSignalIds });
});

// ---------- Agent Space ----------
app.get('/api/v1/agents/catalog', (req, res) => {
  const { industry, function: fn, status, agentType, search } = req.query;
  const studioAgents = [...createdAgents.entries()]
    .filter(([, a]) => a.catalogMeta)
    .map(([agentId, a]) => ({ agentId, ...a.preview, ...a.catalogMeta }));
  let result = [...agentCatalog, ...studioAgents];
  if (industry && industry !== 'all') result = result.filter((a) => a.industry === industry);
  if (fn && fn !== 'all') result = result.filter((a) => a.function2 === fn);
  if (status && status !== 'all') result = result.filter((a) => a.catalogStatus === status);
  if (agentType && agentType !== 'all') result = result.filter((a) => a.creationPath === agentType);
  if (search) result = result.filter((a) => a.name.toLowerCase().includes(String(search).toLowerCase()));
  res.json(result);
});

app.get('/api/v1/agents/:agentId/catalog-detail', (req, res) => {
  const seedMatch = agentCatalog.find((a) => a.agentId === req.params.agentId);
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
  const { connectionId } = req.query;
  const result = connectionId ? suggestedSignalsState.filter((s) => s.sourceConnectionIds.includes(connectionId)) : suggestedSignalsState;
  res.json(result);
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

// ---------- Shared: people directory & audit log ----------
app.get('/api/v1/people/directory', (req, res) => res.json(peopleDirectory));

app.get('/api/v1/audit-log', (req, res) => {
  const { entityType, entityId } = req.query;
  let result = auditLogState;
  if (entityType) result = result.filter((e) => e.entityType === entityType);
  if (entityId) result = result.filter((e) => e.entityId === entityId);
  res.json(result);
});

export default app;
