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

export default app;
