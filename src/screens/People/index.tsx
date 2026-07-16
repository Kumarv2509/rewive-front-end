import { Intro } from '../../components/shared/Intro';
import { ScopeBanner } from '../../components/shared/ScopeBanner';
import { HighlightCards } from './HighlightCards';
import { LeaderboardTable } from './LeaderboardTable';
import { LoopSpeedTable } from './LoopSpeedTable';

export function PeopleScreen() {
  return (
    <section className="screen">
      <h1 className="page">Performance</h1>
      <Intro
        line="Where the loop closes fastest — every mandate, its owner, its counterpart, and how quickly drift comes back to target."
        more="Scores measure execution, not surveillance: actions closed, timeliness, and whether the decisions a person sponsored actually worked. Agents and people are held to the same standard."
      />
      <ScopeBanner />

      <HighlightCards />

      <div className="sec-head" style={{ padding: '20px 0 12px' }}>
        <h3>Loop speed by mandate</h3>
      </div>
      <LoopSpeedTable />
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
        Time to decide is drift detected → dispositioned; time to close is drift detected → the number back at target. Closed in window is the share of loops closed inside the exit condition's window.
      </div>

      <div className="sec-head" style={{ padding: '20px 0 12px' }}>
        <h3>People &amp; counterparts</h3>
      </div>
      <LeaderboardTable />

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        Scores measure execution, not surveillance: actions closed, timeliness, and whether the decisions a person sponsored actually worked. Agents and people are held to the same standard.
      </div>
    </section>
  );
}
