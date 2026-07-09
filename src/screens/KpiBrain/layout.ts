import type { Edge, Node } from '@xyflow/react';
import type { BrainEdge, BrainNode, KpiBrain } from '../../api/types';

// One column per function stream: its KPIs stack under a target row, drivers at the
// bottom of the column. Cross-stream edges span columns — that's the "brain" wiring.
const COL_W = 250;
const ROW_H = 150;
const TARGET_Y = 0;
const KPI_START_Y = 210;
const NODE_W = 210;

export interface BrainNodeData extends Record<string, unknown> {
  node: BrainNode;
  streamName: string;
  dimmed: boolean;
  focused: boolean;
  onResolve: (kind: 'node', id: string, action: 'accept' | 'decline') => void;
  onEdit: (node: BrainNode) => void;
}

export function computePositions(brain: KpiBrain): Record<string, { x: number; y: number }> {
  const streamKeys = brain.streams.map((s) => s.key);
  const colX = new Map(streamKeys.map((k, i) => [k, i * COL_W]));

  const targets = brain.nodes.filter((n) => n.kind === 'target' && n.status !== 'declined');
  const pos: Record<string, { x: number; y: number }> = {};

  // Stack each stream's KPIs, then its drivers, down the stream's column.
  for (const key of streamKeys) {
    const x = colX.get(key) ?? 0;
    const kpis = brain.nodes.filter((n) => n.kind === 'stream_kpi' && n.streamKey === key && n.status !== 'declined');
    const drivers = brain.nodes.filter((n) => n.kind === 'driver' && n.streamKey === key && n.status !== 'declined');
    let row = 0;
    for (const n of kpis) { pos[n.id] = { x, y: KPI_START_Y + row * ROW_H }; row++; }
    row += 0.5; // small gap before the driver(s)
    for (const n of drivers) { pos[n.id] = { x, y: KPI_START_Y + row * ROW_H }; row++; }
  }

  // Targets span the top row, centered across the columns.
  const fullWidth = Math.max(streamKeys.length, 1) * COL_W;
  const targetGap = fullWidth / targets.length;
  targets.forEach((n, i) => { pos[n.id] = { x: targetGap * (i + 0.5) - NODE_W / 2, y: TARGET_Y }; });

  return pos;
}

const WEIGHT_WIDTH = { strong: 2.4, moderate: 1.5, weak: 0.9 };

export function toFlowEdges(edges: BrainEdge[], litEdgeIds: Set<string> | null): Edge[] {
  return edges.map((e) => {
    const proposed = e.status === 'proposed';
    const lit = litEdgeIds?.has(e.id) ?? false;
    const dim = litEdgeIds !== null && !lit;
    const color = proposed ? '#8B5CF6' : lit ? '#7C7CFF' : '#3a3d5c';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      animated: proposed || lit,
      style: {
        stroke: color,
        strokeWidth: (WEIGHT_WIDTH[e.weight] ?? 1.5) + (lit ? 0.8 : 0),
        strokeDasharray: proposed ? '5 4' : undefined,
        opacity: dim ? 0.18 : 1,
        filter: lit ? 'drop-shadow(0 0 5px rgba(124,124,255,.7))' : undefined,
      },
    } as Edge;
  });
}

// Walk contribution edges up (toward targets) and down (toward drivers) from a node,
// returning every node and edge on its impact path.
export function tracePath(brain: KpiBrain, startId: string): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>([startId]);
  const edgeIds = new Set<string>();
  const walk = (id: string, dir: 'up' | 'down') => {
    for (const e of brain.edges) {
      const next = dir === 'up' ? (e.source === id ? e.target : null) : (e.target === id ? e.source : null);
      if (next && !nodeIds.has(next)) {
        nodeIds.add(next);
        edgeIds.add(e.id);
        walk(next, dir);
      } else if (next) {
        edgeIds.add(e.id);
      }
    }
  };
  walk(startId, 'up');
  walk(startId, 'down');
  return { nodeIds, edgeIds };
}

export type { Node };
