// The world model: the Operating Picture graph and the agents that hold it.
// Shape and referential integrity per industry — dangling edges or agents
// watching nodes that don't exist would break every downstream screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, INDUSTRIES, assertShape, assertEveryShape, en, opt, persona } from './_helpers.mjs';

for (const ind of INDUSTRIES) {
  test(`kpi-brain(${ind}): node/edge shapes and integrity`, async () => {
    const { status, data: brain } = await api(`/kpi-brain?industry=${ind}`);
    assert.equal(status, 200);
    assert.equal(brain.industry, ind);
    assertEveryShape(brain.streams, { key: 'string', name: 'string', answersTo: 'string' }, `${ind} streams`);
    assertEveryShape(brain.nodes, {
      id: 'string',
      kind: en('target', 'pl_line', 'stream_kpi', 'driver'),
      name: 'string',
      status: en('connected', 'proposed', 'needs_data', 'declined'),
      dataSources: 'array',
      streamKey: opt('string'),
    }, `${ind} nodes`);
    assertEveryShape(brain.edges, {
      id: 'string', source: 'string', target: 'string',
      weight: en('strong', 'moderate', 'weak'),
      status: en('connected', 'proposed'),
    }, `${ind} edges`);

    const nodeIds = new Set(brain.nodes.map((n) => n.id));
    const streamKeys = new Set(brain.streams.map((s) => s.key));
    for (const e of brain.edges) {
      assert.ok(nodeIds.has(e.source) && nodeIds.has(e.target), `${ind} edge ${e.id} dangles (${e.source} → ${e.target})`);
    }
    for (const n of brain.nodes) {
      if (n.streamKey != null) assert.ok(streamKeys.has(n.streamKey), `${ind} node ${n.id} names unknown stream ${n.streamKey}`);
    }
  });

  test(`shadow-org(${ind}): agents watch real nodes and report up a real chain`, async () => {
    const { data: org } = await api(`/shadow-org?industry=${ind}`);
    assert.equal(org.industry, ind);
    assertEveryShape(org.agents, {
      id: 'string', name: 'string', persona,
      streamKey: opt('string'),
      watchesNodeIds: 'array',
      reportsToAgentId: opt('string'),
      health: en('healthy', 'attention', 'critical'),
    }, `${ind} agents`);
    assert.ok(org.agents.some((a) => a.streamKey === null), `${ind} should have an org-level chief`);

    const nodeIds = new Set((await api(`/kpi-brain?industry=${ind}`)).data.nodes.map((n) => n.id));
    const agentIds = new Set(org.agents.map((a) => a.id));
    for (const a of org.agents) {
      for (const nid of a.watchesNodeIds) assert.ok(nodeIds.has(nid), `${ind} agent ${a.id} watches unknown node ${nid}`);
      if (a.reportsToAgentId != null) assert.ok(agentIds.has(a.reportsToAgentId), `${ind} agent ${a.id} reports to unknown ${a.reportsToAgentId}`);
    }
  });
}
