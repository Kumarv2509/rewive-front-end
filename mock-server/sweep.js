// The agent sweep: evaluates every live-tracked mandate against its real
// metric series, fires re-alert trip-wires, advances closure KPIs on recovery,
// and raises new findings (authored by Claude, template fallback). Runs from
// Vercel Cron, the in-app "Run sweep now" button, or the dev-server interval.
//
// The sweep works directly against the tracking store (Postgres or memory);
// app.js hydrates live rows into its in-memory state on every request, so the
// existing disposition/escalation/closure routes see sweep output unmodified.
import * as tracking from './tracking.js';
import { evaluateNode, recoveryProgressPct, SLA_HOURS_BY_SEVERITY } from './drift.js';
import { authorFinding, templateNarrative } from './authoring.js';

const ACTIVE_STATUSES = ['open', 'acknowledged', 'accepted', 'acting'];
const WEIGHT_RANK = { strong: 0, moderate: 1, weak: 2 };
const MAX_CLAUDE_AUTHORINGS_PER_SWEEP = 5;

// A sweep over a handful of mandates finishes in well under a second, which
// makes the live analysis strip flash rather than read. Pace the walk so the
// work is watchable — but never on cron, where nobody is looking and the
// serverless clock is real money.
const PACE_MS = Number(process.env.REWIVE_SWEEP_PACE_MS ?? 900);
const pace = (trigger) =>
  trigger === 'cron' || PACE_MS <= 0 ? Promise.resolve() : new Promise((r) => setTimeout(r, PACE_MS));

function findCounterpart(shadowOrg, node) {
  const agents = shadowOrg?.agents ?? [];
  return agents.find((a) => a.watchesNodeIds?.includes(node.id))
    ?? agents.find((a) => a.streamKey && a.streamKey === node.streamKey)
    ?? agents.find((a) => a.streamKey === null)
    ?? null;
}

/**
 * The reasoning chain for a drifted mandate, leaf → intent:
 *   [suspected cause (a sense / leading indicator), mandate, …, target]
 *
 * The downstream half (mandate → P&L → intent) is the CONSEQUENCE — what the
 * drift costs. The prepended upstream node is the CAUSE — the sense an owner
 * would look at first. Detection only ever reads the mandate's own number, so
 * this is where the agent connects the drift back to a plausible driver.
 * `upstreamSignals` carries every connected contributor (with its edge
 * rationale) for the narrative author to reason over — never invent a cause.
 */
export function computeImpactPath(brain, startNode) {
  // Downstream: walk contribution edges up toward a target.
  const path = [startNode];
  let current = startNode;
  const seen = new Set([startNode.id]);
  while (path.length < 4) {
    const out = brain.edges
      .filter((e) => e.source === current.id && e.status !== 'proposed')
      .map((e) => ({ e, n: brain.nodes.find((x) => x.id === e.target) }))
      .filter((x) => x.n && !seen.has(x.n.id))
      // Reaching the intent (target) is the payoff — prefer a hop that lands on
      // one, then fall back to the strongest contribution edge.
      .sort((a, b) => {
        const at = a.n.kind === 'target' ? 0 : 1;
        const bt = b.n.kind === 'target' ? 0 : 1;
        if (at !== bt) return at - bt;
        return (WEIGHT_RANK[a.e.weight] ?? 3) - (WEIGHT_RANK[b.e.weight] ?? 3);
      });
    const next = out[0]?.n;
    if (!next) break;
    path.push(next);
    seen.add(next.id);
    current = next;
    if (next.kind === 'target') break;
  }

  // Upstream: the contributors feeding the mandate — the candidate causes.
  const upstream = brain.edges
    .filter((e) => e.target === startNode.id && e.status === 'connected')
    .map((e) => ({ edge: e, node: brain.nodes.find((n) => n.id === e.source) }))
    .filter((x) => x.node)
    .sort((a, b) => (WEIGHT_RANK[a.edge.weight] ?? 3) - (WEIGHT_RANK[b.edge.weight] ?? 3));

  const upstreamSignals = upstream.slice(0, 3).map(({ edge, node }) => ({
    name: node.name,
    kind: node.kind,
    definition: node.definition,
    rationale: edge.rationale ?? null,
    weight: edge.weight,
  }));

  // Prepend the strongest SENSE (a driver) as the leaf; fall back to the
  // strongest leading indicator when no sense feeds this mandate directly.
  const lead = upstream.find((x) => x.node.kind === 'driver') ?? upstream[0];
  const nodes = lead && !seen.has(lead.node.id) ? [lead.node, ...path] : path;

  return { nodes, upstreamSignals };
}

function assembleFinding({ config, node, pathNodes, agent, result, narrative, sweepRunId, latest, industry }) {
  const now = new Date();
  const severity = result.severity;
  const slaHours = SLA_HOURS_BY_SEVERITY[severity] ?? 24;
  const finding = {
    id: `live-f-${node.id}-${now.getTime()}`,
    title: narrative.title.slice(0, 140),
    summary: narrative.summary,
    raisedByAgentId: agent.id,
    raisedByAgentName: agent.name,
    streamKey: node.streamKey ?? agent.streamKey ?? 'finance',
    linkedKpiNodeId: node.id,
    severity,
    impactPath: pathNodes.map((n, i) => ({
      nodeId: n.id, nodeName: n.name, kind: n.kind, effect: narrative.impactEffects[i] ?? '',
    })),
    impactEstimate: narrative.impactEstimate,
    evidence: narrative.evidence,
    status: 'open',
    disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
    slaHoursRemaining: slaHours,
    escalationLevel: 0, escalatedToAgentId: null,
    closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
    detectedAt: now.toISOString(),
    persona: agent.persona,
    // From the tracking config: without these the finding is invisible in the
    // By-entity / By-region rollups (they skip blank rows) while still being
    // counted in the stat tiles above them.
    ...(config.entity ? { entity: config.entity } : {}),
    ...(config.region ? { region: config.region } : {}),
    origin: 'sweep',
    rule: result.triggered[0],
    sweepRunId,
    // Server-side fields (stripped from the client contract by app.js):
    closureTemplate: narrative.closureTemplate,
    closureTemplateNumeric: { baseline: latest.value, target: config.targetNumeric },
  };
  return {
    id: finding.id,
    industry,
    nodeId: node.id,
    rule: result.triggered[0],
    status: 'open',
    authoredBy: 'template',
    finding,
    reAlert: null,
    slaDeadlineAt: new Date(now.getTime() + slaHours * 3_600_000).toISOString(),
    sweepRunId,
  };
}

/**
 * ctx: { getBrains, shadowOrgs, escalateFinding, chiefIdFor, logAudit,
 *        getOrgName, exampleFindingFor }
 */
export async function runSweep(trigger, ctx) {
  const startedAt = new Date().toISOString();
  if (!(await tracking.tryAcquireSweepLock())) {
    return {
      id: null, trigger, startedAt, finishedAt: startedAt,
      nodesEvaluated: 0, findingsRaised: 0, reAlertsFired: 0, closuresProgressed: 0, authoredByClaude: 0,
      skipped: true,
    };
  }

  const run = {
    id: `sweep-${Date.now()}`,
    trigger,
    startedAt,
    finishedAt: null,
    nodesEvaluated: 0,
    findingsRaised: 0,
    reAlertsFired: 0,
    closuresProgressed: 0,
    authoredByClaude: 0,
    errors: [],
  };

  try {
    await tracking.insertSweepRun(run);
    const configs = (await tracking.listConfigs(null)).filter((c) => c.enabled);
    const seriesMap = await tracking.latestSeriesBatch(configs.map((c) => c.nodeId), 24);
    const liveRows = await tracking.loadLiveFindings();
    const liveClosures = await tracking.loadLiveClosures();
    const brains = ctx.getBrains();
    let claudeBudget = MAX_CLAUDE_AUTHORINGS_PER_SWEEP;

    // The analysis trail. Every mandate in scope gets a row up front — queued
    // ones included — so the strip can show "3 of 14" from the first poll
    // instead of growing a list out of nothing.
    const steps = configs.map((config) => {
      const brain = brains[config.industry];
      const node = brain?.nodes.find((n) => n.id === config.nodeId);
      const agent = node ? findCounterpart(ctx.shadowOrgs[config.industry], node) : null;
      return {
        nodeId: config.nodeId,
        nodeName: node?.name ?? config.nodeId,
        industry: config.industry,
        streamKey: node?.streamKey ?? agent?.streamKey ?? null,
        counterpartName: agent?.name ?? 'Unassigned',
        persona: agent?.persona ?? null,
        status: 'queued',
        detail: null,
        findingId: null,
        severity: null,
      };
    });
    const flush = () => tracking.updateSweepProgress(run.id, { steps });
    await flush();

    for (const [i, config] of configs.entries()) {
      const step = steps[i];
      try {
        const brain = brains[config.industry];
        const node = brain?.nodes.find((n) => n.id === config.nodeId);
        const series = seriesMap.get(config.nodeId);
        if (!brain || !node || !series?.length) {
          step.status = 'skipped';
          step.detail = 'no metrics received yet';
          await flush();
          continue;
        }

        step.status = 'analyzing';
        step.detail = `reading ${series.length} points`;
        await flush();
        await pace(trigger);

        run.nodesEvaluated += 1;
        const result = evaluateNode(config, series);
        if (!result) {
          step.status = 'skipped';
          step.detail = 'not enough history to judge';
          await flush();
          continue;
        }
        const latest = series[series.length - 1];
        const active = liveRows.find((r) => r.nodeId === config.nodeId && ACTIVE_STATUSES.includes(r.status));

        // 1) Acknowledged findings: enforce the re-alert trip-wire numerically.
        if (active?.status === 'acknowledged') {
          const ra = active.reAlert ?? {};
          if (!Number.isFinite(ra.ackDeviationPct)) {
            active.reAlert = {
              pct: ra.pct ?? 5,
              days: ra.days ?? 14,
              ackAt: ra.ackAt ?? active.finding.dispositionAt ?? startedAt,
              ackDeviationPct: result.dev,
            };
            await tracking.saveLiveFinding(active);
          } else {
            const expired = Date.now() > new Date(ra.ackAt).getTime() + ra.days * 86_400_000;
            const worsened = result.dev >= ra.ackDeviationPct + ra.pct;
            if (worsened || expired) {
              const f = active.finding;
              f.status = 'open';
              f.disposition = null;
              f.dispositionBy = null;
              f.dispositionAt = null;
              ctx.escalateFinding(f, { industry: config.industry, chiefId: ctx.chiefIdFor(config.industry) });
              active.status = 'open';
              active.slaDeadlineAt = new Date(Date.now() + 12 * 3_600_000).toISOString();
              await tracking.saveLiveFinding(active);
              await ctx.scheduleLoopTimers?.(active);
              run.reAlertsFired += 1;
              step.status = 're-alert';
              step.detail = worsened ? `re-alert fired — deviation worsened to ${result.dev.toFixed(1)}%` : 're-alert fired — the park window expired';
              step.findingId = f.id;
              step.severity = f.severity;
              ctx.logAudit('finding', f.id, `re-alert rule fired by sweep — ${worsened ? `deviation worsened to ${result.dev.toFixed(1)}%` : 'the park window expired'}; back to open one level up`, 'Rewive (sweep)');
            }
          }
        }

        // 2) Accepted findings: advance the exit condition as the number recovers.
        if (active?.status === 'accepted' || active?.status === 'acting') {
          const closureRow = liveClosures.find((c) => c.findingId === active.id);
          if (closureRow && closureRow.closure.status === 'tracking') {
            const numeric = active.finding.closureTemplateNumeric ?? {};
            const baseline = Number(numeric.baseline);
            const target = Number(numeric.target);
            const progress = recoveryProgressPct(baseline, target, latest.value);
            const current = tracking.formatValue(config.unit, config.format, latest.value, config.industry);
            if (closureRow.closure.current !== current || closureRow.closure.progressPct !== progress) {
              closureRow.closure.current = current;
              closureRow.closure.progressPct = progress;
              await tracking.saveLiveClosure(closureRow);
              run.closuresProgressed += 1;
              step.status = 'recovered';
              step.detail = `recovery target advanced — ${current}, ${progress}% to target`;
              step.findingId = active.id;
            }
          }
        }

        // 3) No active finding + a rule fired: the agent raises.
        if (result.triggered.length && !active) {
          const agent = findCounterpart(ctx.shadowOrgs[config.industry], node);
          if (!agent) {
            step.status = 'skipped';
            step.detail = 'no agent holds this mandate';
            await flush();
            continue;
          }
          const { nodes: pathNodes, upstreamSignals } = computeImpactPath(brain, node);
          const authoringCtx = {
            node,
            config,
            series,
            result,
            industry: config.industry,
            currency: tracking.CURRENCY_BY_INDUSTRY[config.industry] ?? 'USD',
            orgName: ctx.getOrgName(),
            counterpartName: agent.name,
            persona: agent.persona,
            impactPathNames: pathNodes.map((n) => n.name),
            // Every impact-path step that is not the mandate itself — the leaf
            // is the suspected cause, so the author can name it and cite it.
            upstreamSignals,
            exampleFinding: ctx.exampleFindingFor(config.industry),
          };
          step.status = 'authoring';
          step.detail = `${result.triggered[0].replace(/_/g, ' ')} — ${result.dev.toFixed(1)}% adverse, writing it up`;
          step.severity = result.severity;
          await flush();

          const { narrative, authoredBy } = claudeBudget > 0
            ? await authorFinding(authoringCtx)
            : { narrative: templateNarrative(authoringCtx), authoredBy: 'template' };
          if (authoredBy === 'claude') {
            claudeBudget -= 1;
            run.authoredByClaude += 1;
          }
          const row = assembleFinding({
            config, node, pathNodes, agent, result, narrative,
            sweepRunId: run.id, latest, industry: config.industry,
          });
          row.authoredBy = authoredBy;
          const saved = await tracking.saveLiveFinding(row);
          if (saved) {
            await ctx.scheduleLoopTimers?.(row);
            run.findingsRaised += 1;
            step.status = 'raised';
            step.detail = row.finding.title;
            step.findingId = row.id;
            ctx.logAudit('finding', row.id, `raised by sweep — ${result.triggered[0].replace(/_/g, ' ')} on ${node.name} (${result.dev.toFixed(1)}% adverse)`, agent.name);
          } else if (authoredBy === 'claude') {
            run.authoredByClaude -= 1; // guard blocked the insert; don't count the narrative
          }
        }

        // Nothing above claimed the step: the mandate was read and it either
        // holds, or it is drifting under a finding somebody already owns.
        if (step.status === 'analyzing') {
          const held = active && result.triggered.length;
          step.status = held ? 'drift' : 'clear';
          step.detail = held
            ? `${result.dev.toFixed(1)}% adverse — already open under a finding`
            : `on mandate — ${Math.abs(result.dev).toFixed(1)}% off, inside tolerance`;
        }
        await flush();
      } catch (err) {
        step.status = 'skipped';
        step.detail = 'analysis failed';
        await flush();
        run.errors.push({ nodeId: config.nodeId, message: err?.message ?? String(err) });
      }
    }
  } catch (err) {
    run.errors.push({ message: err?.message ?? String(err) });
  } finally {
    run.finishedAt = new Date().toISOString();
    await tracking.finishSweepRun(run).catch(() => {});
    await tracking.releaseSweepLock();
  }

  const { errors, ...publicRun } = run;
  return errors.length ? { ...publicRun, errors } : publicRun;
}
