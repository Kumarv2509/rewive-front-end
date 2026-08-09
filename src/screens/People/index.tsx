import { PageHeader } from '../../components/shared/PageHeader';
import { HighlightCards } from './HighlightCards';
import { LeaderboardTable } from './LeaderboardTable';
import { LoopSpeedTable } from './LoopSpeedTable';

export function PeopleScreen() {
  return (
    <section className="screen">
      <PageHeader
        title="Performance"
        subtitle="Where the loop closes fastest — every mandate, its owner, its agent, and how quickly drift comes back to target."
      />

      <HighlightCards />

      <div className="sec-head" style={{ padding: '20px 0 12px' }}>
        <h3>Loop speed by mandate</h3>
      </div>
      <LoopSpeedTable />
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)' }}>
        Time to decide is drift detected → decided; time to close is drift detected → the number back at target. Closed in window is the share of loops closed inside the recovery target's window.
      </div>

      <div className="sec-head" style={{ padding: '20px 0 12px' }}>
        <h3>People &amp; agents</h3>
      </div>
      <LeaderboardTable />

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        Scores measure execution, not surveillance: actions closed, timeliness, and whether the decisions a person sponsored actually worked. Agents and people are held to the same standard.
      </div>
    </section>
  );
}
