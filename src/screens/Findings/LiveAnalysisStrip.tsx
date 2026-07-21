import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRunSweepNow, useSweepProgress } from '../../api/tracking';
import { Pill } from '../../components/shared/Pill';
import type { SweepStep, SweepStepStatus } from '../../api/types';

// The sweep writes its analysis trail as it walks, so this strip shows the
// agents working rather than only their output: each mandate moves
// queued → analyzing → an outcome, and anything raised lands as a row you can
// open. Idle, it collapses to "last swept ..." plus the trigger.

const DOT: Record<SweepStepStatus, string> = {
  queued: '', analyzing: '', authoring: '', clear: '✓', drift: '!',
  raised: '!', 're-alert': '!', recovered: '✓', skipped: '–',
};

const VERB: Record<SweepStepStatus, string> = {
  queued: 'queued',
  analyzing: 'reading the series',
  authoring: 'writing the finding',
  clear: 'on mandate',
  drift: 'drifting',
  raised: 'raised a finding',
  're-alert': 'trip-wire fired',
  recovered: 'recovering',
  skipped: 'skipped',
};

const SETTLED: SweepStepStatus[] = ['clear', 'drift', 'raised', 're-alert', 'recovered', 'skipped'];

function relative(iso: string) {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  return `${Math.round(secs / 3600)}h ago`;
}

function StepRow({ step }: { step: SweepStep }) {
  const body = (
    <>
      <span className={`sw-dot ${step.status}`}>{DOT[step.status]}</span>
      <span className="sw-who">{step.counterpartName}</span>
      <span className="sw-node">{step.nodeName}</span>
      <span className="sw-detail">{step.detail ?? VERB[step.status]}</span>
      {step.findingId && <Pill tone={step.status === 'recovered' ? 'teal' : 'red'}>{VERB[step.status]}</Pill>}
    </>
  );
  return step.findingId ? (
    <Link className={`sw-step ${step.status} linked`} to={`/operate/findings/${step.findingId}`}>{body}</Link>
  ) : (
    <div className={`sw-step ${step.status}`}>{body}</div>
  );
}

export function LiveAnalysisStrip() {
  const runSweep = useRunSweepNow();
  // While the trigger is in flight the cache still holds the previous run, so
  // the poll has to be told a sweep is happening — see useSweepProgress.
  const { data: run } = useSweepProgress(runSweep.isPending);
  const queryClient = useQueryClient();
  const lastRaised = useRef(0);

  // The strip polls; the findings list underneath does not know a sweep is
  // running. Pull it forward whenever the raise count moves, so a new finding
  // appears in the list at the moment its row appears here. Counted off the
  // steps, not run.findingsRaised — the counters are only written when the
  // sweep finishes, and this has to move mid-run.
  const raised = (run?.steps ?? []).filter((s) => s.findingId && s.status !== 'recovered').length;
  const finished = run?.finishedAt ?? null;
  useEffect(() => {
    if (raised === lastRaised.current) return;
    lastRaised.current = raised;
    queryClient.invalidateQueries({ queryKey: ['findings'] });
    queryClient.invalidateQueries({ queryKey: ['closure-kpis'] });
  }, [raised, queryClient]);
  useEffect(() => {
    if (finished) queryClient.invalidateQueries({ queryKey: ['findings'] });
  }, [finished, queryClient]);

  if (!run) return null;

  const steps = run.steps ?? [];
  const done = steps.filter((s) => SETTLED.includes(s.status)).length;
  // A sweep walks every industry in one pass, but these steps are only yours.
  // Settle the strip when your mandates are done rather than when the global
  // run finishes — otherwise it pulses "4 of 4" for another several seconds
  // while it works through industries this viewer will never see.
  const live = !run.finishedAt && done < steps.length;
  // Idle: the queue is noise once it is over — keep only what the sweep found.
  const shown = live ? steps : steps.filter((s) => s.findingId);

  return (
    <div className={`sweep-strip${live ? ' live' : ''}`} data-tour="findings-live">
      <div className="sw-head">
        <span className={`sw-beacon${live ? ' on' : ''}`} />
        <b>{live ? 'Agents analyzing' : 'Agents idle'}</b>
        <span className="sw-sub">
          {live
            ? `${done} of ${steps.length} mandates`
            : `last swept ${relative(run.startedAt)} · ${steps.length} mandates · ${raised} raised`}
        </span>
        <div className="sw-acts">
          {run.authoredByClaude > 0 && <Pill tone="indigo">{run.authoredByClaude} authored by Claude</Pill>}
          {!live && (
            // Still disabled while the global run finishes: the sweep takes a
            // lock, so a click here would come back "skipped" and look broken.
            <button
              className="btn sm"
              disabled={runSweep.isPending || !run.finishedAt}
              onClick={() => runSweep.mutate()}
            >
              {runSweep.isPending || !run.finishedAt ? 'Sweeping…' : 'Run sweep now'}
            </button>
          )}
        </div>
      </div>

      {live && (
        <div className="sw-bar"><i style={{ width: `${steps.length ? (done / steps.length) * 100 : 0}%` }} /></div>
      )}

      {shown.length > 0 && (
        <div className="sw-steps">
          {shown.map((s) => <StepRow key={s.nodeId} step={s} />)}
        </div>
      )}
    </div>
  );
}
