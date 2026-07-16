import { Intro } from '../../components/shared/Intro';
import { PlStatement } from '../Decisions/PlStatement';
import { BusinessTabs } from './BusinessTabs';

// The P&L as a context surface: same statement FP&A works from (Decisions ·
// P&L impact), placed next to the sales base data so the money view and the
// operational view sit side by side.
export function BusinessPlScreen() {
  return (
    <section className="screen">
      <h1 className="page">P&amp;L</h1>
      <Intro
        line="Actual vs budget vs forecast, drillable by two dimensions — drift anomalies route to the role whose call they are."
        more={<>This is the same statement FP&amp;A works from in Decisions → P&amp;L impact. Every anomaly chip is a drift a counterpart has translated onto a P&amp;L line; the ones with a thread link to their finding.</>}
      />
      <BusinessTabs />
      <PlStatement />
    </section>
  );
}
