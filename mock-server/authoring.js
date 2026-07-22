// Agent narrative authoring. Deterministic drift rules decide WHEN a
// finding is raised (drift.js); this module decides how it reads. Claude
// authors the narrative via structured outputs; if the API key is missing or
// the call fails for any reason, a deterministic template produces an
// equivalent narrative — a sweep never fails to raise because authoring failed.
import { formatValue } from './tracking.js';

const NARRATIVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'summary', 'severityRationale', 'evidence', 'impactEffects', 'impactEstimate', 'closureTemplate', 'reAlertCondition'],
  properties: {
    title: { type: 'string', description: 'At most 90 chars. States the drift as a fact, with the number in it.' },
    summary: { type: 'string', description: '2-3 sentences of business language: what moved, since when, what is at stake.' },
    severityRationale: { type: 'string' },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value'],
        properties: { label: { type: 'string' }, value: { type: 'string' } },
      },
    },
    impactEffects: {
      type: 'array',
      items: { type: 'string' },
      description: 'One short effect phrase per impact-path step, in the given order.',
    },
    impactEstimate: { type: 'string' },
    closureTemplate: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'baseline', 'target'],
      properties: { name: { type: 'string' }, baseline: { type: 'string' }, target: { type: 'string' } },
    },
    reAlertCondition: { type: 'string' },
  },
};

const RULE_LABEL = {
  threshold_breach: 'breached its threshold against target',
  sustained_deviation: 'has drifted from target for several consecutive readings',
  trend_to_breach: 'is trending toward a threshold breach',
};

const SYSTEM_PROMPT = `You are an agent in Rewive, the decision accountability layer. Every business mandate is held twice — once by a person, once by you, watching the same number. Your deterministic drift rules have already fired; do not re-judge whether to raise. Your job is to author the finding narrative a busy operator will read.

House style:
- Drift is stated as fact, with the numbers in it ("Case fill collapsed to 84% against a 97% target"), never as blame.
- Business language, not statistics jargon. Quantify impact in the org's currency where you can reasonably estimate it from the context given; if you cannot, describe the exposure concretely instead of inventing figures.
- The closure template names a number and a duration ("back above 96% for 4 straight weeks").
- The re-alert condition is a concrete trip-wire ("re-alert if it worsens a further 5% or after 14 days").
- impactEffects must contain exactly one short phrase per impact-path node, in the order given.
- Evidence rows are label/value pairs drawn only from the data provided — never fabricate sources.`;

export function templateNarrative(ctx) {
  const { node, config, result, series, industry, impactPathNames } = ctx;
  const fmt = (v) => formatValue(config.unit, config.format, v, industry);
  const latest = series[series.length - 1];
  const first = series[0];
  const devStr = `${result.dev.toFixed(1)}%`;
  return {
    title: `${node.name} at ${fmt(latest.value)} vs ${fmt(config.targetNumeric)} target`,
    summary: `${node.name} ${RULE_LABEL[result.triggered[0]] ?? 'has drifted'}: latest reading ${fmt(latest.value)} against a ${fmt(config.targetNumeric)} target (${devStr} adverse). The series moved from ${fmt(first.value)} to ${fmt(latest.value)} over the last ${series.length} readings.`,
    severityRationale: `Deviation of ${devStr} against warn ${config.warnPct}% / breach ${config.breachPct}% thresholds.`,
    evidence: [
      { label: `${node.name}, latest reading`, value: `${fmt(latest.value)} vs ${fmt(config.targetNumeric)} target` },
      { label: 'Adverse deviation', value: devStr },
      { label: `Trend over last ${series.length} readings`, value: `${fmt(first.value)} → ${fmt(latest.value)}` },
    ],
    impactEffects: impactPathNames.map((name, i) => (i === 0
      ? `${node.name.toLowerCase()} at ${fmt(latest.value)} vs ${fmt(config.targetNumeric)} target`
      : `pressure flowing through to ${name.toLowerCase()}`)),
    impactEstimate: `Adverse drift of ${devStr} on ${node.name} against target`,
    closureTemplate: {
      name: `${node.name} back within ${config.warnPct}% of ${fmt(config.targetNumeric)} for ${config.sustainedPoints} consecutive readings`,
      baseline: fmt(latest.value),
      target: fmt(config.targetNumeric),
    },
    reAlertCondition: `Re-alert if ${node.name} worsens a further 5% or after 14 days`,
  };
}

function validateNarrative(candidate, ctx) {
  const ok = candidate
    && typeof candidate.title === 'string' && candidate.title.trim()
    && typeof candidate.summary === 'string'
    && Array.isArray(candidate.evidence) && candidate.evidence.every((e) => e?.label && e?.value)
    && Array.isArray(candidate.impactEffects)
    && candidate.closureTemplate?.name && candidate.closureTemplate?.baseline && candidate.closureTemplate?.target;
  if (!ok) throw new Error('narrative failed validation');
  // Pad/trim impact effects to exactly match the impact path length.
  const wanted = ctx.impactPathNames.length;
  const effects = candidate.impactEffects.slice(0, wanted);
  while (effects.length < wanted) effects.push(`pressure flowing through to ${ctx.impactPathNames[effects.length].toLowerCase()}`);
  return { ...candidate, impactEffects: effects };
}

/**
 * Author a finding narrative. ctx: { node, config, series, result, industry,
 * currency, orgName, counterpartName, persona, impactPathNames, exampleFinding }
 * Returns { narrative, authoredBy: 'claude' | 'template' }.
 */
export async function authorFinding(ctx) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { narrative: templateNarrative(ctx), authoredBy: 'template' };
  }
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: NARRATIVE_SCHEMA } },
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: JSON.stringify({
          agent: ctx.counterpartName,
          org: ctx.orgName,
          industry: ctx.industry,
          currency: ctx.currency,
          mandate: { id: ctx.node.id, name: ctx.node.name, definition: ctx.node.definition, unit: ctx.config.unit },
          target: ctx.config.targetNumeric,
          direction: ctx.config.direction,
          thresholds: { warnPct: ctx.config.warnPct, breachPct: ctx.config.breachPct, sustainedPoints: ctx.config.sustainedPoints },
          ruleFired: ctx.result.triggered,
          adverseDeviationPct: Number(ctx.result.dev.toFixed(2)),
          slopePerDay: Number(ctx.result.slopePerDay.toFixed(4)),
          projectedDeviationIn14dPct: Number(ctx.result.projectedDev14d.toFixed(2)),
          recentReadings: ctx.series.map((p) => ({ ts: p.ts, value: p.value })),
          impactPathNodeNames: ctx.impactPathNames,
          toneExample: ctx.exampleFinding ?? null,
        }),
      }],
    });
    if (response.stop_reason === 'refusal') throw new Error('authoring request refused');
    const text = response.content.find((b) => b.type === 'text')?.text;
    if (!text) throw new Error('no text block in response');
    return { narrative: validateNarrative(JSON.parse(text), ctx), authoredBy: 'claude' };
  } catch (err) {
    console.warn(`[authoring] falling back to template for ${ctx.node.id}:`, err?.message ?? err);
    return { narrative: templateNarrative(ctx), authoredBy: 'template' };
  }
}
