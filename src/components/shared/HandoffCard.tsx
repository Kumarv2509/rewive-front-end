import type { HandoffCardData } from '../../api/types';

export function HandoffCard({ card }: { card: HandoffCardData }) {
  const isHandback = card.kind === 'handback';
  return (
    <div className="concept-note" style={{ background: isHandback ? 'var(--teal-soft)' : 'var(--amber-soft)', border: 'none', color: isHandback ? 'var(--teal)' : 'var(--amber)' }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 12 }}>
          {isHandback ? 'Handed back to business' : 'Escalated to developer'}
        </div>
        <div style={{ fontSize: 12.5, marginTop: 4, color: 'var(--ink-2)' }}>
          {card.fromName} ({card.fromRole}) &rarr; {card.toLabel} &middot; {card.note}
        </div>
        {card.contract && (
          <div style={{ fontSize: 12.5, marginTop: 8, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div><b>Does:</b> {card.contract.does}</div>
            <div><b>Will not:</b> {card.contract.wont}</div>
            <div><b>Owner:</b> {card.contract.owner}</div>
            <div><b>When unsure:</b> {card.contract.whenUnsure}</div>
          </div>
        )}
      </div>
    </div>
  );
}
