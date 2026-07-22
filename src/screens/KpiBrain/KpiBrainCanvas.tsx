import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Link } from 'react-router-dom';
import { useResolveBrainProposal, useShadowOrg } from '../../api/shadowOrg';
import { useAgentCatalog } from '../../api/agentSpace';
import { useToast } from '../../components/shared/Toast';
import { BrainNodeCard } from './BrainNodeCard';
import { NodeEditor } from './NodeEditor';
import { computePositions, toFlowEdges, tracePath, type BrainNodeData } from './layout';
import type { BrainNode, KpiBrain } from '../../api/types';

const nodeTypes = { brain: BrainNodeCard };

export function KpiBrainCanvas({ brain, focusNodeId }: { brain: KpiBrain; focusNodeId?: string }) {
  const { showToast } = useToast();
  const resolve = useResolveBrainProposal();
  const [selectedId, setSelectedId] = useState<string | null>(focusNodeId ?? null);
  const [editing, setEditing] = useState<BrainNode | null>(null);

  const handleEdit = useCallback((node: BrainNode) => setEditing(node), []);

  const streamName = useCallback(
    (key: string | null) => brain.streams.find((s) => s.key === key)?.name ?? '',
    [brain.streams],
  );

  const handleResolve = useCallback(
    (kind: 'node', id: string, action: 'accept' | 'decline') => {
      resolve.mutate({ kind, id, action }, { onSuccess: () => showToast(action === 'accept' ? 'Ratified into the picture' : 'Petition declined') });
    },
    [resolve, showToast],
  );

  const lit = useMemo(() => (selectedId ? tracePath(brain, selectedId) : null), [brain, selectedId]);

  // Who holds the selected mandate: its human owner + agent (held twice),
  // plus any workforce agents whose mandateIds name this node.
  const { data: shadowOrg } = useShadowOrg();
  const { data: catalog } = useAgentCatalog();
  const held = useMemo(() => {
    const node = selectedId ? brain.nodes.find((n) => n.id === selectedId) : null;
    if (!node || (node.kind !== 'stream_kpi' && node.kind !== 'target')) return null;
    const agent =
      shadowOrg?.agents.find((a) => a.watchesNodeIds.includes(node.id)) ??
      shadowOrg?.agents.find((a) => a.streamKey !== null && a.streamKey === node.streamKey);
    const workedBy = (catalog ?? []).filter((a) => a.mandateIds?.includes(node.id));
    if (!agent && workedBy.length === 0) return null;
    return { node, agent, workedBy };
  }, [selectedId, brain.nodes, shadowOrg, catalog]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Rebuild the graph when the brain (industry / proposals) changes.
  useEffect(() => {
    const pos = computePositions(brain);
    setNodes(
      brain.nodes
        .filter((n) => n.status !== 'declined')
        .map((n) => ({
          id: n.id,
          type: 'brain',
          position: pos[n.id] ?? { x: 0, y: 0 },
          data: {
            node: n,
            streamName: streamName(n.streamKey),
            dimmed: false,
            focused: false,
            onResolve: handleResolve,
            onEdit: handleEdit,
          } as BrainNodeData,
        })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brain]);

  // Recolor nodes/edges on selection without disturbing positions.
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: {
          ...(n.data as BrainNodeData),
          dimmed: lit ? !lit.nodeIds.has(n.id) : false,
          focused: n.id === selectedId,
        },
      })),
    );
    setEdges(toFlowEdges(brain.edges, lit ? lit.edgeIds : null));
  }, [lit, selectedId, brain.edges, setNodes, setEdges]);

  const memoNodeTypes = useMemo(() => nodeTypes, []);
  const proposedEdges = brain.edges.filter((e) => e.status === 'proposed');

  return (
    <div className="brain-canvas card" style={{ height: 640, position: 'relative', overflow: 'hidden' }}>
      <div className="brain-legend">
        <span><i className="lg-dot" style={{ background: 'var(--teal)' }} /> Intent</span>
        <span><i className="lg-dot" style={{ background: 'var(--amber)' }} /> P&amp;L line</span>
        <span><i className="lg-dot" style={{ background: 'var(--accent)' }} /> Mandate</span>
        <span><i className="lg-dot" style={{ background: 'var(--ink-3)' }} /> Sense</span>
        <span style={{ color: 'var(--ink-3)' }}>click any node to trace its impact path</span>
        {selectedId && <button className="btn ghost sm" onClick={() => setSelectedId(null)}>Clear focus</button>}
      </div>

      {proposedEdges.length > 0 && (
        <div className="brain-proposals">
          <div className="bp-title">{proposedEdges.length} petition{proposedEdges.length > 1 ? 's' : ''} from the agents</div>
          {proposedEdges.map((e) => (
            <div key={e.id} className="bp-item">
              <div className="bp-rationale">{e.rationale ?? 'Agent-petitioned link'}</div>
              {e.proposedBy && <div className="bp-by">{e.proposedBy}</div>}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="btn primary sm" onClick={() => resolve.mutate({ kind: 'edge', id: e.id, action: 'accept' }, { onSuccess: () => showToast('Petition ratified into the picture') })}>Ratify</button>
                <button className="btn ghost sm" onClick={() => resolve.mutate({ kind: 'edge', id: e.id, action: 'decline' }, { onSuccess: () => showToast('Petition declined') })}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <NodeEditor node={editing} streams={brain.streams} onClose={() => setEditing(null)} />}

      {held && (
        <div className="brain-legend" style={{ top: 'auto', bottom: 12, maxWidth: 'min(720px, calc(100% - 24px))' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Held twice</span>
          {held.agent && (
            <span>
              <b>{held.agent.humanOwner.name}</b> · {held.agent.humanOwner.role}
              {' + '}
              <Link to="/operate/counterparts" style={{ color: 'var(--accent-deep)', textDecoration: 'none', fontWeight: 600 }}>
                {held.agent.name} →
              </Link>
            </span>
          )}
          {held.workedBy.length > 0 && (
            <span>
              worked by{' '}
              {held.workedBy.map((a, i) => (
                <span key={a.agentId}>
                  {i > 0 && ' · '}
                  <Link to={`/insights/agents/${a.agentId}`} style={{ color: 'var(--accent-deep)', textDecoration: 'none', fontWeight: 600 }}>
                    {a.name} →
                  </Link>
                </span>
              ))}
            </span>
          )}
          {held.node.streamKey && (
            <Link to={`/operate/findings?stream=${held.node.streamKey}`} style={{ color: 'var(--ink-2)', textDecoration: 'none' }}>
              Its findings →
            </Link>
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => setSelectedId((cur) => (cur === n.id ? null : n.id))}
        onPaneClick={() => setSelectedId(null)}
        nodeTypes={memoNodeTypes}
        colorMode="light"
        minZoom={0.15}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} color="rgba(26,26,46,.10)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
