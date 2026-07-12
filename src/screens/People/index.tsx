import { HighlightCards } from './HighlightCards';
import { LeaderboardTable } from './LeaderboardTable';

export function PeopleScreen() {
  return (
    <section className="screen">
      <h1 className="page">Performance</h1>
      <div className="sub">Where the loop closes fastest — every mandate, its owner, its counterpart, and how quickly drift comes back to target.</div>

      <HighlightCards />
      <LeaderboardTable />

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        Scores measure execution, not surveillance: actions closed, timeliness, and whether the decisions a person sponsored actually worked. Agents and people are held to the same standard.
      </div>
    </section>
  );
}
