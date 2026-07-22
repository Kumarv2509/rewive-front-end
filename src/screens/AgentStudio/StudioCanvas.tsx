import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { InputNode } from './nodes/InputNode';
import { ProcessNode } from './nodes/ProcessNode';
import { OutputNode } from './nodes/OutputNode';
import { AgentNode } from './nodes/AgentNode';
import { ApprovalNode } from './nodes/ApprovalNode';
import { LoopNode } from './nodes/LoopNode';
import { useGenerateProcessPrompt } from '../../api/agentStudio';
import type { AgentWorkflow, StudioEdge, StudioNode } from '../../api/types';

const nodeTypes = {
  input: InputNode,
  process: ProcessNode,
  output: OutputNode,
  worker: AgentNode,
  approval: ApprovalNode,
  loop: LoopNode,
};

function toFlowNodes(nodes: StudioNode[], onChange: (id: string, patch: Record<string, unknown>) => void, onGenerate: (nodeId: string, instructions: string) => Promise<string>): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.kind,
    position: n.position,
    data: {
      ...n,
      onChange: (patch: Record<string, unknown>) => onChange(n.id, patch),
      onGenerate: (instructions: string) => onGenerate(n.id, instructions),
    },
  }));
}

function toFlowEdges(edges: StudioEdge[]): Edge[] {
  return edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label }));
}

export interface StudioCanvasHandle {
  getNodes: () => StudioNode[];
  getEdges: () => StudioEdge[];
}

export function StudioCanvas({
  workflowId,
  workflow,
  onGraphChange,
}: {
  workflowId: string;
  workflow: AgentWorkflow;
  onGraphChange: (nodes: StudioNode[], edges: StudioEdge[]) => void;
}) {
  const generatePrompt = useGenerateProcessPrompt(workflowId);

  const handleGenerate = useCallback(
    async (nodeId: string, instructions: string) => {
      const res = await generatePrompt.mutateAsync({ nodeId, instructions });
      return res.generatedPrompt;
    },
    [generatePrompt]
  );

  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const handleNodeDataChange = useCallback((id: string, patch: Record<string, unknown>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, [setNodes]);

  // Load (and re-load, if a different workflow id navigates in) the saved graph into the canvas.
  useEffect(() => {
    setNodes(toFlowNodes(workflow.nodes, handleNodeDataChange, handleGenerate));
    setEdges(toFlowEdges(workflow.edges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id]);

  const onNodesChange = useCallback((changes: Parameters<typeof applyNodeChanges>[0]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);
  const onEdgesChange = useCallback((changes: Parameters<typeof applyEdgeChanges>[0]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);
  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  // Bubble current graph up to the parent on every change so "Save draft" has the latest state.
  useEffect(() => {
    const studioNodes: StudioNode[] = nodes.map((n) => {
      const { onChange, onGenerate, ...rest } = n.data as Record<string, unknown> & { onChange: unknown; onGenerate: unknown };
      void onChange;
      void onGenerate;
      return { ...(rest as object), position: n.position } as StudioNode;
    });
    const studioEdges: StudioEdge[] = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: typeof e.label === 'string' ? e.label : undefined }));
    onGraphChange(studioNodes, studioEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const memoNodeTypes = useMemo(() => nodeTypes, []);

  const addNode = useCallback((kind: 'agent' | 'approval' | 'loop') => {
    const id = `n-${kind}-${Date.now()}`;
    const base = { id, position: { x: 240 + Math.random() * 200, y: 360 + Math.random() * 80 } };
    const newNode: StudioNode =
      kind === 'agent'
        ? { ...base, kind, label: 'Nested worker' }
        : kind === 'approval'
        ? { ...base, kind, label: 'Approval', approverUserIds: [], instructions: '' }
        : { ...base, kind, label: 'Loop', iterationMode: 'fixed_count', iterationCount: 1, childNodeIds: [] };
    setNodes((prev) => [...prev, ...toFlowNodes([newNode], handleNodeDataChange, handleGenerate)]);
  }, [handleNodeDataChange, handleGenerate, setNodes]);

  return (
    <div className="studio-canvas">
      <div style={{ position: 'absolute', zIndex: 10, top: 12, left: 12, display: 'flex', gap: 6 }}>
        <button className="btn ghost sm" onClick={() => addNode('agent')}>+ Worker node</button>
        <button className="btn ghost sm" onClick={() => addNode('approval')}>+ Approval node</button>
        <button className="btn ghost sm" onClick={() => addNode('loop')}>+ Loop node</button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={memoNodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
