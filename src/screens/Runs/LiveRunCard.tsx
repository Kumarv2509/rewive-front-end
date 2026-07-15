import { useRunDetail, usePauseRun, useResumeRun } from '../../api/runs';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useToast } from '../../components/shared/Toast';

const dotIcon: Record<string, string> = { done: '✓', live: '●', wait: '', gate: '⏸' };

export function LiveRunCard({ runId }: { runId: string }) {
  const { data, isLoading, isError } = useRunDetail(runId);
  const pause = usePauseRun();
  const resume = useResumeRun();
  const { showToast } = useToast();

  if (isLoading) return <div className="card run-x"><Loading /></div>;
  if (isError || !data) return <div className="card run-x"><ErrorMessage /></div>;

  return (
    <div className="card run-x">
      <div className="rx-head">
        {data.paused ? <Pill tone="amber">⏸ PAUSED</Pill> : <Pill tone="indigo">● LIVE</Pill>}
        <div>
          <div className="nm">{data.name}</div>
          <div className="meta">{data.meta}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {data.paused ? (
            <button
              className="btn ghost sm"
              disabled={resume.isPending}
              onClick={() => resume.mutate(runId, { onSuccess: () => showToast('Run resumed') })}
            >
              Resume
            </button>
          ) : (
            <button
              className="btn ghost sm"
              disabled={pause.isPending}
              onClick={() => pause.mutate(runId, { onSuccess: () => showToast('Run paused') })}
            >
              Pause
            </button>
          )}
        </div>
      </div>
      <div className="timeline">
        {data.steps.map((step) => (
          <div className="tl-step" key={step.id}>
            <div className={`tl-dot ${step.status}`}>
              {step.status === 'wait' ? step.icon ?? '' : dotIcon[step.status]}
            </div>
            <div>
              <div className="s1">{step.label}</div>
              <div className="s2">{step.description}</div>
            </div>
            <div className="dur">{step.duration}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
