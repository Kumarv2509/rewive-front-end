import { Fragment } from 'react';

const STAGES = ['Sense', 'Find', 'Decide', 'Act', 'Close'] as const;
export type LoopStage = (typeof STAGES)[number];

// The loop, always the same five words, with the current stage lit. This is
// the one persistent place the product shows where you are in
// Sense → Find → Decide → Act → Close.
export function LoopStrip({ stage, className }: { stage?: LoopStage; className?: string }) {
  return (
    <div className={`loop-strip${className ? ` ${className}` : ''}`} aria-label="The loop">
      {STAGES.map((s, i) => (
        <Fragment key={s}>
          {i > 0 && <span className="loop-arrow">→</span>}
          <span className={`loop-node${s === stage ? ' on' : ''}`}>
            <i className="ln-dot" />
            {s}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
