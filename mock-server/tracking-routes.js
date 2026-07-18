// HTTP surface for live mandate tracking: metric ingestion (API key + CSV),
// tracking configs, ingest keys, and the agent sweep. Registered from app.js
// with a ctx object so this module never imports app state directly.
import * as tracking from './tracking.js';

const MAX_POINTS_PER_REQUEST = 1000;

export function registerTrackingRoutes(app, ctx) {
  const { v4Industry, getBrains, logAudit, runSweep } = ctx;

  const nodeIndex = () => {
    const map = new Map();
    for (const brain of Object.values(getBrains())) {
      for (const node of brain.nodes) map.set(node.id, { node, industry: brain.industry });
    }
    return map;
  };

  const normalizePoints = (body) => {
    const raw = Array.isArray(body?.points) ? body.points : body?.nodeId ? [body] : null;
    if (!raw) return { error: 'Body must be { points: [{ nodeId, value, ts? }] }' };
    if (raw.length > MAX_POINTS_PER_REQUEST) return { error: `At most ${MAX_POINTS_PER_REQUEST} points per request` };
    return { raw };
  };

  const validatePoints = (raw, source) => {
    const nodes = nodeIndex();
    const accepted = [];
    const rejected = [];
    raw.forEach((p, index) => {
      const value = Number(p.value);
      if (!p.nodeId || !nodes.has(p.nodeId)) return rejected.push({ index, reason: `unknown nodeId: ${p.nodeId ?? '(missing)'}` });
      if (!Number.isFinite(value)) return rejected.push({ index, reason: 'value must be a finite number' });
      const ts = p.ts ? new Date(p.ts) : new Date();
      if (Number.isNaN(ts.getTime())) return rejected.push({ index, reason: `invalid ts: ${p.ts}` });
      accepted.push({ nodeId: p.nodeId, value, ts: ts.toISOString(), source: source ?? p.source ?? 'api' });
    });
    return { accepted, rejected };
  };

  // ---------- Ingestion ----------
  app.post('/api/v1/metrics', async (req, res) => {
    const rawKey = req.get('x-api-key') ?? req.get('authorization')?.replace(/^Bearer\s+/i, '');
    const key = await tracking.verifyKey(rawKey);
    if (!key) return res.status(401).json({ message: 'A valid ingest key is required (X-API-Key or Authorization: Bearer)' });

    const { raw, error } = normalizePoints(req.body);
    if (error) return res.status(400).json({ message: error });
    const { accepted, rejected } = validatePoints(raw);
    await tracking.insertPoints(accepted, key.id);
    if (accepted.length) logAudit('kpi', accepted[0].nodeId, `ingested ${accepted.length} metric point(s) via key "${key.label}"`, 'Rewive (ingest)');
    res.status(202).json({ accepted: accepted.length, rejected });
  });

  // CSV/XLSX import — the browser parses the file and posts JSON rows in chunks
  // (keeps requests under Vercel's body limit; no server-side spreadsheet parsing).
  app.post('/api/v1/metrics/import', async (req, res) => {
    const { filename, rows } = req.body ?? {};
    if (!Array.isArray(rows)) return res.status(400).json({ message: 'Body must be { filename, rows: [{ nodeId, ts, value }] }' });
    if (rows.length > MAX_POINTS_PER_REQUEST) return res.status(400).json({ message: `At most ${MAX_POINTS_PER_REQUEST} rows per chunk` });
    const source = `csv:${(filename || 'upload').slice(0, 80)}`;
    const { accepted, rejected } = validatePoints(rows, source);
    await tracking.insertPoints(accepted);
    if (accepted.length) logAudit('connection', source, `imported ${accepted.length} metric row(s) from ${filename || 'upload'}`, 'Rewive (ingest)');
    res.status(202).json({ accepted: accepted.length, rejected });
  });

  app.get('/api/v1/metrics/:nodeId', async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const series = await tracking.latestSeries(req.params.nodeId, limit);
    res.json([...series].reverse()); // newest first, matching the contract
  });

  // ---------- Tracking configs ----------
  app.get('/api/v1/tracking-configs', async (req, res) => {
    res.json(await tracking.listConfigs(v4Industry(req)));
  });

  app.put('/api/v1/tracking-configs/:nodeId', async (req, res) => {
    const hit = nodeIndex().get(req.params.nodeId);
    if (!hit) return res.status(404).json({ message: 'Unknown mandate node' });
    const target = Number(req.body?.targetNumeric);
    if (!Number.isFinite(target)) return res.status(400).json({ message: 'targetNumeric must be a number' });
    const cfg = await tracking.upsertConfig({ ...req.body, nodeId: req.params.nodeId, industry: hit.industry, targetNumeric: target });
    logAudit('kpi', cfg.nodeId, `${cfg.enabled ? 'enabled' : 'updated'} live tracking — target ${cfg.targetNumeric}, warn ${cfg.warnPct}%, breach ${cfg.breachPct}%`);
    res.json(cfg);
  });

  // ---------- Ingest keys ----------
  app.get('/api/v1/ingest-keys', async (_req, res) => res.json(await tracking.listKeys()));

  app.post('/api/v1/ingest-keys', async (req, res) => {
    const label = (req.body?.label ?? '').trim();
    if (!label) return res.status(400).json({ message: 'label is required' });
    const created = await tracking.createKey(label);
    logAudit('connection', created.id, `issued ingest key "${label}"`);
    res.status(201).json(created);
  });

  app.delete('/api/v1/ingest-keys/:id', async (req, res) => {
    await tracking.revokeKey(req.params.id);
    logAudit('connection', req.params.id, 'revoked ingest key');
    res.json({ ok: true });
  });

  // ---------- Agent sweep ----------
  // GET is the Vercel Cron entrypoint (Authorization: Bearer CRON_SECRET);
  // POST is the in-app "Run sweep now" button (same trust level as other routes).
  app.get('/api/v1/agent-sweep', async (req, res) => {
    const secret = process.env.CRON_SECRET;
    const auth = req.get('authorization') ?? '';
    if (!secret || auth !== `Bearer ${secret}`) return res.status(401).json({ message: 'Unauthorized' });
    const run = await runSweep('cron');
    res.json(run);
  });

  app.post('/api/v1/agent-sweep', async (_req, res) => {
    const run = await runSweep('manual');
    res.json(run);
  });

  app.get('/api/v1/sweep-runs', async (req, res) => {
    res.json(await tracking.listSweepRuns(Math.min(Number(req.query.limit) || 20, 100)));
  });
}
