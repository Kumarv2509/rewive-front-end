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
import { useResolveBrainProposal } from '../../api/shadowOrg';
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
        <span><i className="lg-dot" style={{ background: '#2DD4BF' }} /> Intent</span>
        <span><i className="lg-dot" style={{ background: '#7C7CFF' }} /> Mandate</span>
        <span><i className="lg-dot" style={{ background: '#63678B' }} /> Sense</span>
        <span style={{ color: 'var(--ink-3)' }}>click any node to trace its impact path</span>
        {selectedId && <button className="btn ghost sm" onClick={() => setSelectedId(null)}>Clear focus</button>}
      </div>

      {proposedEdges.length > 0 && (
        <div className="brain-proposals">
          <div className="bp-title">{proposedEdges.length} petition{proposedEdges.length > 1 ? 's' : ''} from the counterparts</div>
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

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => setSelectedId((cur) => (cur === n.id ? null : n.id))}
        onPaneClick={() => setSelectedId(null)}
        nodeTypes={memoNodeTypes}
        colorMode="dark"
        minZoom={0.15}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} color="rgba(255,255,255,.05)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
