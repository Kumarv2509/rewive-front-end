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

function findCounterpart(shadowOrg, node) {
  const agents = shadowOrg?.agents ?? [];
  return agents.find((a) => a.watchesNodeIds?.includes(node.id))
    ?? agents.find((a) => a.streamKey && a.streamKey === node.streamKey)
    ?? agents.find((a) => a.streamKey === null)
    ?? null;
}

/** Walk the brain edges upward from the drifted node toward a target node. */
function computeImpactPathNodes(brain, startNode) {
  const path = [startNode];
  let current = startNode;
  const seen = new Set([startNode.id]);
  while (path.length < 4) {
    const out = brain.edges
      .filter((e) => e.source === current.id && e.status !== 'proposed')
      .sort((a, b) => (WEIGHT_RANK[a.weight] ?? 3) - (WEIGHT_RANK[b.weight] ?? 3));
    const next = out.map((e) => brain.nodes.find((n) => n.id === e.target)).find((n) => n && !seen.has(n.id));
    if (!next) break;
    path.push(next);
    seen.add(next.id);
    current = next;
    if (next.kind === 'target') break;
  }
  return path;
}

function assembleFinding({ config, node, brain, counterpart, result, narrative, sweepRunId, latest, industry }) {
  const now = new Date();
  const severity = result.severity;
  const slaHours = SLA_HOURS_BY_SEVERITY[severity] ?? 24;
  const pathNodes = computeImpactPathNodes(brain, node);
  const finding = {
    id: `live-f-${node.id}-${now.getTime()}`,
    title: narrative.title.slice(0, 140),
    summary: narrative.summary,
    raisedByAgentId: counterpart.id,
    raisedByAgentName: counterpart.name,
    streamKey: node.streamKey ?? counterpart.streamKey ?? 'finance',
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
    persona: counterpart.persona,
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

    for (const config of configs) {
      try {
        const brain = brains[config.industry];
        const node = brain?.nodes.find((n) => n.id === config.nodeId);
        const series = seriesMap.get(config.nodeId);
        if (!brain || !node || !series?.length) continue;

        run.nodesEvaluated += 1;
        const result = evaluateNode(config, series);
        if (!result) continue;
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
              run.reAlertsFired += 1;
              ctx.logAudit('finding', f.id, `re-alert trip-wire fired by sweep — ${worsened ? `deviation worsened to ${result.dev.toFixed(1)}%` : 'the acknowledge window expired'}; back to open one level up`, 'Rewive (sweep)');
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
            }
          }
        }

        // 3) No active finding + a rule fired: the counterpart raises.
        if (result.triggered.length && !active) {
          const counterpart = findCounterpart(ctx.shadowOrgs[config.industry], node);
          if (!counterpart) continue;
          const pathNodes = computeImpactPathNodes(brain, node);
          const authoringCtx = {
            node,
            config,
            series,
            result,
            industry: config.industry,
            currency: tracking.CURRENCY_BY_INDUSTRY[config.industry] ?? 'USD',
            orgName: ctx.getOrgName(),
            counterpartName: counterpart.name,
            persona: counterpart.persona,
            impactPathNames: pathNodes.map((n) => n.name),
            exampleFinding: ctx.exampleFindingFor(config.industry),
          };
          const { narrative, authoredBy } = claudeBudget > 0
            ? await authorFinding(authoringCtx)
            : { narrative: templateNarrative(authoringCtx), authoredBy: 'template' };
          if (authoredBy === 'claude') {
            claudeBudget -= 1;
            run.authoredByClaude += 1;
          }
          const row = assembleFinding({
            config, node, brain, counterpart, result, narrative,
            sweepRunId: run.id, latest, industry: config.industry,
          });
          row.authoredBy = authoredBy;
          const saved = await tracking.saveLiveFinding(row);
          if (saved) {
            run.findingsRaised += 1;
            ctx.logAudit('finding', row.id, `raised by sweep — ${result.triggered[0].replace(/_/g, ' ')} on ${node.name} (${result.dev.toFixed(1)}% adverse)`, counterpart.name);
          } else if (authoredBy === 'claude') {
            run.authoredByClaude -= 1; // guard blocked the insert; don't count the narrative
          }
        }
      } catch (err) {
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
