import { PageHeader } from '../../components/shared/PageHeader';
import { PlStatement } from '../Decisions/PlStatement';
import { BusinessTabs } from './BusinessTabs';

// The P&L as a context surface: same statement FP&A works from (Decisions ·
// P&L impact), placed next to the sales base data so the money view and the
// operational view sit side by side.
export function BusinessPlScreen() {
  return (
    <section className="screen">
      <PageHeader
        title="P&L"
        subtitle="Actual vs budget vs forecast, drillable by two dimensions — drift anomalies route to the role whose call they are."
        tabs={<BusinessTabs />}
      />
      <PlStatement />
    </section>
  );
}
