import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Intro } from '../../components/shared/Intro';
import { Pill } from '../../components/shared/Pill';
import { SectionTabs, EXECUTION_TABS } from '../../components/shared/SectionTabs';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useTasks, useAddTaskFeedback, useUpdateTaskStatus, useUpdateTaskChannel } from '../../api/solutionDesign';
import type { SolutionTask, SolutionTaskStatus, SolutionTaskType, TaskChannel } from '../../api/types';

const typeTone: Record<SolutionTaskType, { tone: 'indigo' | 'teal' | 'gray'; label: string }> = {
  new_agent: { tone: 'indigo', label: 'new agent' },
  existing_agent: { tone: 'teal', label: 'existing agent' },
  human_task: { tone: 'gray', label: 'human task' },
};

const statusTone: Record<SolutionTaskStatus, 'gray' | 'amber' | 'indigo' | 'green'> = {
  proposed: 'gray',
  needs_review: 'amber',
  in_progress: 'indigo',
  confirmed: 'green',
  done: 'green',
};

const advanceStages: SolutionTaskStatus[] = ['proposed', 'needs_review', 'in_progress', 'done'];
const channelLabel: Record<TaskChannel, string> = { app: 'In app', teams: 'Microsoft Teams', slack: 'Slack', servicenow: 'ServiceNow' };

function TaskRow({ task }: { task: SolutionTask }) {
  const [comment, setComment] = useState('');
  const addFeedback = useAddTaskFeedback();
  const updateStatus = useUpdateTaskStatus();
  const updateChannel = useUpdateTaskChannel();
  const stageIndex = advanceStages.indexOf(task.status);
  const nextStage = stageIndex >= 0 ? advanceStages[stageIndex + 1] : undefined;

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Pill tone={typeTone[task.type].tone}>{typeTone[task.type].label}</Pill>
        <div style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{task.title}</div>
        <Pill tone={statusTone[task.status]}>{task.status.replace('_', ' ')}</Pill>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 10 }}>
        {task.solutionName && <>from <Link to={`/build/solutions/${task.solutionId}`}>{task.solutionName}</Link> &middot; </>}
        assigned to {task.owner}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>Notify via</span>
        <select
          value={task.channel}
          onChange={(e) => updateChannel.mutate({ taskId: task.id, channel: e.target.value as TaskChannel })}
          style={{ border: '1px solid var(--border-strong)', borderRadius: 7, padding: '4px 8px', fontSize: 12 }}
        >
          {(Object.keys(channelLabel) as TaskChannel[]).map((c) => <option key={c} value={c}>{channelLabel[c]}</option>)}
        </select>
        <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>(preview only — not yet wired to a real channel)</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
        {task.comments.map((c) => (
          <div key={c.id} style={{ fontSize: 12.5 }}>
            <b>{c.authorName}</b> <span style={{ color: 'var(--ink-3)' }}>&middot; {new Date(c.createdAt).toLocaleString()}</span>
            <div style={{ color: 'var(--ink-2)' }}>{c.text}</div>
          </div>
        ))}
        {task.comments.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No feedback yet.</div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Add your feedback on this task…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        />
        <button
          className="btn ghost sm"
          disabled={!comment || addFeedback.isPending}
          onClick={() => { addFeedback.mutate({ taskId: task.id, text: comment }); setComment(''); }}
        >
          Comment
        </button>
        {nextStage && (
          <button className="btn primary sm" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ taskId: task.id, status: nextStage })}>
            Move to {nextStage.replace('_', ' ')}
          </button>
        )}
      </div>
    </div>
  );
}

export function TasksScreen() {
  const { data, isLoading, isError } = useTasks();

  return (
    <section className="screen">
      <h1 className="page">Execution</h1>
      <Intro line="Everything assigned to you or your team from an approved solution design, with a spot to leave feedback." />
      <SectionTabs tabs={EXECUTION_TABS} />

      {isLoading && <Loading />}
      {isError && <ErrorMessage />}
      {data?.length === 0 && (
        <div className="card" style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>No tasks yet — and that's how it should start.</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', maxWidth: 520, margin: '0 auto 14px', lineHeight: 1.6 }}>
            Tasks are born when a finding's <b style={{ color: 'var(--ink)' }}>Act</b> disposition opens a solution:
            the solution is broken into tasks, new work goes to agents, existing agents are reused, and humans own the rest.
          </div>
          <Link className="btn primary sm" to="/operate/findings">See open findings →</Link>
        </div>
      )}
      {data?.map((task) => <TaskRow key={task.id} task={task} />)}
    </section>
  );
}
