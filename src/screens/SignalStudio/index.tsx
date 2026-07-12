import { SuggestedSignalsList } from './SuggestedSignalsList';
import { DatasetCoverageView } from './DatasetCoverageView';

export function SignalStudioScreen() {
  return (
    <section className="screen" style={{ maxWidth: 1280 }}>
      <h1 className="page">Signal Studio</h1>
      <div className="sub">Derailers, laggards, cost drainers, and revenue leakage surfaced from your data. Open a signal to see why it fired and assemble a solution.</div>

      <DatasetCoverageView />

      <SuggestedSignalsList />
    </section>
  );
}
