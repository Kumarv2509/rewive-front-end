import { useState } from 'react';
import { useLeadershipAction } from '../../api/shadowOrg';
import { useToast } from '../../components/shared/Toast';
import { personaLabel, roleSubtree } from '../CommandCenter/personas';
import type { Finding, LeadershipAction, Persona } from '../../api/types';

// What a senior role gets on a finding owned below them — instead of the four
// A's, which are the owner's call. Offering Accept/Act/Acknowledge/Abandon
// here would let a leader silently take a decision the ledger will attribute
// to the wrong person, and would make "every mandate, held twice" meaningless.

const OPTIONS: { key: LeadershipAction; title: string; consequence: string }[] = [
  { key: 'ask', title: 'Ask', consequence: 'Request a status — ownership and the clock stay where they are' },
  { key: 'reassign', title: 'Reassign', consequence: 'Move it to another role below you; the new owner gets a fresh 24h clock' },
  { key: 'raise_priority', title: 'Raise priority', consequence: 'Bump severity one notch and halve the remaining SLA' },
  { key: 'take', title: 'Take it', consequence: 'Pull ownership up to you — then it is your disposition to make' },
];

export function LeadershipBar({ finding, lensRole }: { finding: Finding; lensRole: Persona }) {
  const { showToast } = useToast();
  const act = useLeadershipAction(finding.id);
  const [selected, setSelected] = useState<LeadershipAction | null>(null);
  const [note, setNote] = useState('');
  const [target, setTarget] = useState<Persona | ''>('');

  // Reassign can only move work sideways/down within the leader's own subtree.
  const below = roleSubtree(lensRole).filter((r) => r !== lensRole && r !== finding.persona);

  const run = (action: LeadershipAction) => {
    act.mutate(
      {
        action,
        byPersona: lensRole,
        toPersona: action === 'reassign' ? (target as Persona) : undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (updated) => {
          setSelected(null);
          setNote('');
          setTarget('');
          const last = updated.leadershipLog?.[updated.leadershipLog.length - 1];
          showToast(last?.summary ?? 'Recorded');
        },
        onError: () => showToast('Could not record that — check the target role'),
      },
    );
  };

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 16, borderColor: 'var(--border-strong)' }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
        This is {personaLabel(finding.persona)}'s call, not yours
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 12 }}>
        The disposition stays with the owner — that is what makes the ledger mean anything. You can still push on it.
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`dispo-opt${selected === opt.key ? ' on' : ''}`}
            disabled={act.isPending}
            onClick={() => setSelected(selected === opt.key ? null : opt.key)}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{opt.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.45 }}>{opt.consequence}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {selected === 'reassign' && (
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as Persona)}
              style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' }}
            >
              <option value="">Move to…</option>
              {below.map((r) => (
                <option key={r} value={r}>{personaLabel(r)}</option>
              ))}
            </select>
          )}
          <input
            style={{ flex: 1, minWidth: 220, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' }}
            placeholder={
              selected === 'ask'
                ? 'What do you want to know? (goes to the owner with the finding)'
                : 'Optional note — recorded on the thread'
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="btn primary sm"
            disabled={act.isPending || (selected === 'reassign' && !target)}
            onClick={() => run(selected)}
          >
            {OPTIONS.find((o) => o.key === selected)?.title}
          </button>
        </div>
      )}
    </div>
  );
}
