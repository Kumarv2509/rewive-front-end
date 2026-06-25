import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudioCanvas } from './StudioCanvas';
import { StudioToolbar } from './StudioToolbar';
import { SimulationPanel } from './SimulationPanel';
import { useWorkflow, useCreateWorkflow, useSaveWorkflow, useSimulateWorkflow, usePublishWorkflow } from '../../api/agentStudio';
import { useToast } from '../../components/shared/Toast';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import type { SimulationResult, StudioEdge, StudioNode } from '../../api/types';

export function AgentStudioScreen() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const { data: workflow, isLoading, isError } = useWorkflow(workflowId);
  const createWorkflow = useCreateWorkflow();
  const saveWorkflow = useSaveWorkflow(workflowId ?? '');
  const simulate = useSimulateWorkflow(workflowId ?? '');
  const publish = usePublishWorkflow(workflowId ?? '');
  const { showToast } = useToast();
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const graphRef = useRef<{ nodes: StudioNode[]; edges: StudioEdge[] }>({ nodes: [], edges: [] });

  if (!workflowId) {
    return (
      <section className="screen">
        <h1 className="page">Agent Studio</h1>
        <div className="sub">Build agents visually — drag, connect, and simulate before publishing.</div>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <button
            className="btn primary"
            disabled={createWorkflow.isPending}
            onClick={() =>
              createWorkflow.mutate(undefined, {
                onSuccess: (wf) => navigate(`/build/studio/${wf.id}`),
              })
            }
          >
            + Create an agent
          </button>
        </div>
      </section>
    );
  }

  if (isLoading) return <section className="screen"><Loading label="Loading workflow…" /></section>;
  if (isError || !workflow) return <section className="screen"><ErrorMessage message="Couldn't load this workflow." /></section>;

  return (
    <section className="screen" style={{ maxWidth: 'none', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <StudioToolbar
        workflow={workflow}
        saving={saveWorkflow.isPending}
        simulating={simulate.isPending}
        publishing={publish.isPending}
        onRename={(name) => saveWorkflow.mutate({ name })}
        onSave={() => saveWorkflow.mutate(graphRef.current, { onSuccess: () => showToast('Draft saved') })}
        onSimulate={() =>
          saveWorkflow.mutate(graphRef.current, {
            onSuccess: () =>
              simulate.mutate(undefined, {
                onSuccess: (result) => setSimResult(result),
              }),
          })
        }
        onPublish={() =>
          saveWorkflow.mutate(graphRef.current, {
            onSuccess: () =>
              publish.mutate(undefined, {
                onSuccess: () => showToast(`${workflow.name} published to Agent Space`),
              }),
          })
        }
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <StudioCanvas
          workflowId={workflowId}
          workflow={workflow}
          onGraphChange={(nodes, edges) => { graphRef.current = { nodes, edges }; }}
        />
      </div>
      {simResult && <SimulationPanel result={simResult} onClose={() => setSimResult(null)} />}
    </section>
  );
}
