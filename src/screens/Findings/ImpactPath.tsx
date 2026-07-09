import { Pill } from '../../components/shared/Pill';
import type { ImpactPathStep } from '../../api/types';

const kindLabel = { driver: 'sense', stream_kpi: 'mandate', target: 'intent' } as const;
const kindTone = { driver: 'gray', stream_kpi: 'indigo', target: 'teal' } as const;

// The propagation chain from the leaf where the finding fired up to the org target it threatens.
export function ImpactPath({ steps }: { steps: ImpactPathStep[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
      {steps.map((step, i) => (
        <div key={step.nodeId} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 14px',
              minWidth: 150,
              maxWidth: 210,
              background: step.kind === 'target' ? 'var(--accent-soft)' : 'var(--surface)',
            }}
          >
            <Pill tone={kindTone[step.kind]}>{kindLabel[step.kind]}</Pill>
            <div style={{ fontWeight: 700, fontSize: 12.5, margin: '6px 0 3px' }}>{step.nodeName}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{step.effect}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{ padding: '0 8px', color: 'var(--ink-3)', fontSize: 16, flexShrink: 0 }}>→</div>
          )}
        </div>
      ))}
    </div>
  );
}
