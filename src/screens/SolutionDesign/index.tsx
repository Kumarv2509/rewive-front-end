import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSignalDetail } from '../../api/signalStudio';
import {
  useSolutionDesign,
  useCopySolution,
  useRunValidation,
  useSendForApproval,
  useApproveSolution,
} from '../../api/solutionDesign';
import { useCreateAgentSpec } from '../../api/agentSpec';
import { Pill } from '../../components/shared/Pill';
import { Avatar } from '../../components/shared/Avatar';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useToast } from '../../components/shared/Toast';
import type { SolutionTaskType, Verdict } from '../../api/types';

const verdictTone: Record<Verdict, 'green' | 'red' | 'amber'> = { worked: 'green', not_worked: 'red', too_early: 'amber' };
const taskTone: Record<SolutionTaskType, { tone: 'indigo' | 'teal' | 'gray'; label: string }> = {
  new_agent: { tone: 'indigo', label: 'new' },
  existing_agent: { tone: 'teal', label: 'existing, reused' },
  human_task: { tone: 'gray', label: 'human task' },
};

export function SolutionDesignScreen() {
  const { solutionId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: solution, isLoading, isError } = useSolutionDesign(solutionId);
  const { data: signalDetail } = useSignalDetail(solution?.signalId);
  const copySolution = useCopySolution(solutionId ?? '');
  const runValidation = useRunValidation(solutionId ?? '');
  const sendForApproval = useSendForApproval(solutionId ?? '');
  const approve = useApproveSolution(solutionId ?? '');
  const createAgentSpec = useCreateAgentSpec();

  if (isLoading) return <section className="screen"><Loading /></section>;
  if (isError || !solution) return <section className="screen"><ErrorMessage message="Couldn't load this solution design." /></section>;

  const matchesWithSolutions = signalDetail?.similarSignals.filter((s) => s.priorSolution) ?? [];
  const approved = solution.status === 'approved';
  // Solutions opened by a finding's "act" disposition carry the finding id as signalId (v4).
  const fromFinding = /-f-/.test(solution.signalId);

  return (
    <section className="screen">
      <Link
        to={fromFinding ? `/operate/findings/${solution.signalId}` : `/insights/signals/${solution.signalId}`}
        className="btn ghost sm"
        style={{ marginBottom: 14, display: 'inline-flex' }}
      >
        &larr; {fromFinding ? 'Finding' : 'Signal detail'}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 className="page" style={{ marginBottom: 0 }}>Solution design &mdash; {solution.signalName}</h1>
      </div>
      <div className="sub">Owner {solution.owner.name} &middot; status {solution.status.replace(/_/g, ' ')}</div>

      <div className="concept-note">
        {approved
          ? 'Approved. Design each worker below using the Unified Worker Studio — business altitude alone is enough for some, others will need a developer.'
          : 'This is a solution design document. No development work has started yet.'}
      </div>

      {matchesWithSolutions.length > 0 && solution.status === 'drafting' && (
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>Prior solutions for similar signals</div>
          {matchesWithSolutions.map((s) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ flex: 1, fontSize: 12.5 }}>
                <b>{s.label}</b>
                <div style={{ color: 'var(--ink-2)', marginTop: 2 }}>{s.priorSolution!.summary}</div>
              </div>
              <Pill tone={verdictTone[s.priorSolution!.verdict]}>{s.priorSolution!.verdict.replace('_', ' ')}</Pill>
              <div style={{ fontSize: 11.5, color: 'var(--ink-2)', textAlign: 'right' }}>
                cost {s.priorSolution!.cost}<br />value {s.priorSolution!.valueGenerated}
              </div>
              <button
                className="btn sm"
                disabled={copySolution.isPending}
                onClick={() => copySolution.mutate({ fromSimilarSignalId: s.id }, { onSuccess: () => showToast('Copied and ready to tweak') })}
              >
                Copy and tweak
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>This solution design</div>
          {solution.copiedFromLabel && <Pill tone="indigo">copied from {solution.copiedFromLabel}</Pill>}
        </div>
        <div className="pv-row"><span className="l">Approach</span><span className="v" style={{ maxWidth: 460 }}>{solution.approach}</span></div>
        <div className="pv-row"><span className="l">Data needed</span><span className="v">{solution.dataNeeded}</span></div>
        <div className="pv-row"><span className="l">Owner</span><span className="v"><span className="human"><Avatar initials={solution.owner.initials} background={solution.owner.avatarBg} size={20} fontSize={9} />{solution.owner.name}</span></span></div>
        <div className="pv-row" style={{ borderBottom: 'none' }}><span className="l">Guardrails</span><span className="v" style={{ maxWidth: 460 }}>{solution.guardrails}</span></div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 10 }}>What this needs &mdash; task list</div>
        {solution.taskList.map((task) => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <Pill tone={taskTone[task.type].tone}>{taskTone[task.type].label}</Pill>
            <div style={{ flex: 1, fontSize: 12.5 }}>{task.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{task.owner}</div>
            {!approved && task.status === 'needs_review' && <Pill tone="amber">needs review</Pill>}
            {approved && task.type === 'new_agent' && (
              <button
                className="btn primary sm"
                disabled={createAgentSpec.isPending}
                onClick={() =>
                  createAgentSpec.mutate(
                    { solutionId: solution.id, taskId: task.id },
                    { onSuccess: (spec) => navigate(`/build/agent-studio/${spec.id}`) }
                  )
                }
              >
                Design worker &rarr;
              </button>
            )}
            {approved && task.type === 'human_task' && <Link className="btn ghost sm" to="/operate/tasks">Track in Tasks &rarr;</Link>}
            {approved && task.type === 'existing_agent' && <Pill tone="gray">no design needed</Pill>}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16, padding: '16px 20px', background: 'var(--teal-soft)', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>Validation worker review</span>
          {solution.validation && <Pill tone={solution.validation.recommendation === 'dev_handoff' ? 'amber' : 'green'} style={{ marginLeft: 'auto' }}>
            recommends: {solution.validation.recommendation === 'dev_handoff' ? 'hand off to dev / IT' : 'ready for Runs & Actions'}
          </Pill>}
        </div>
        {!solution.validation && (
          <button className="btn primary sm" disabled={runValidation.isPending} onClick={() => runValidation.mutate(undefined)}>
            Run validation
          </button>
        )}
        {solution.validation && (
          <>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8 }}>{solution.validation.recommendationReason}</div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>Pros</div>
                {solution.validation.pros.map((p, i) => <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)' }}>{p}</div>)}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)' }}>Cons</div>
                {solution.validation.cons.map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)' }}>{c}</div>)}
              </div>
            </div>
            <div style={{ fontSize: 12, display: 'flex', gap: 18 }}>
              <div><b>Expected ROI</b> {solution.validation.expectedRoi}</div>
              <div><b>Expected cost</b> {solution.validation.expectedCost}</div>
              <div><b>Time to value</b> {solution.validation.timeToValue}</div>
            </div>
          </>
        )}
      </div>

      {solution.status === 'drafting' && solution.validation && (
        <button className="btn primary" disabled={sendForApproval.isPending} onClick={() => sendForApproval.mutate(undefined, { onSuccess: () => showToast('Sent for approval') })}>
          Send for approval
        </button>
      )}

      {solution.status === 'pending_approval' && (
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Pill tone="amber">pending approval</Pill>
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--ink-2)' }}>Waiting on a reviewer to approve this solution design.</div>
          <button className="btn primary sm" disabled={approve.isPending} onClick={() => approve.mutate(undefined, { onSuccess: () => showToast('Solution design approved') })}>
            Approve (as reviewer)
          </button>
        </div>
      )}
    </section>
  );
}
