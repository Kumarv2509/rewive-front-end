import type { ReactNode } from 'react';

// One-line screen intro with the doctrine tucked behind a "How this works"
// disclosure — vocabulary on demand instead of a paragraph tax on every visit.
export function Intro({ line, more }: { line: ReactNode; more?: ReactNode }) {
  return (
    <div className="intro">
      <span className="intro-line">
        {line}
        {more && (
          <details>
            <summary>How this works</summary>
            <div className="intro-more">{more}</div>
          </details>
        )}
      </span>
    </div>
  );
}
