import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisposeFinding, useEscalateFinding } from '../../api/shadowOrg';
import { useToast } from '../../components/shared/Toast';
import type { Finding, FindingDisposition } from '../../api/types';

// UI labels over the four API disposition values — the values themselves
// (accept/act/acknowledge/abandon) never change.
const OPTIONS: { key: FindingDisposition; title: string; consequence: string }[] = [
  { key: 'accept', title: 'Accept', consequence: 'Real — set a recovery target, watched until the number is back' },
  { key: 'act', title: 'Act', consequence: 'Open a fix — a solution design with tasks and a worker' },
  { key: 'acknowledge', title: 'Park', consequence: 'Known issue — it re-alerts if it gets worse' },
  { key: 'abandon', title: 'Dismiss', consequence: 'Not real — your reason tunes the agent' },
];

export function DispositionBar({ finding }: { finding: Finding }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const dispose = useDisposeFinding(finding.id);
  const escalate = useEscalateFinding(finding.id);
  const [selected, setSelected] = useState<FindingDisposition | null>(null);
  const [reason, setReason] = useState('');
  const [reAlert, setReAlert] = useState('');

  const needsInput = selected === 'abandon' || selected === 'acknowledge';

  const confirm = (disposition: FindingDisposition) => {
    dispose.mutate(
      {
        disposition,
        reason: disposition === 'abandon' ? reason : undefined,
        reAlertCondition: disposition === 'acknowledge' && reAlert.trim() ? reAlert : undefined,
      },
      {
        onSuccess: (updated) => {
          if (disposition === 'act' && updated.solutionDesignId) {
            showToast('Fix opened from this finding');
            navigate(`/build/solutions/${updated.solutionDesignId}`);
          } else if (disposition === 'accept') {
            showToast('Accepted — recovery target set, the agent keeps watching');
          } else if (disposition === 'acknowledge') {
            showToast('Parked — it will re-alert if it worsens');
          } else {
            showToast('Dismissed — the reason was fed back to tune the agent');
          }
        },
        // The server's own message is the truthful one — a stale tab whose
        // finding was already dispositioned elsewhere used to be told
        // "abandon needs a reason", which is about a different failure entirely.
        onError: (err: unknown) => {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          showToast(message ?? 'Could not record the decision — please try again.');
        },
      },
    );
  };

  return (
    <div className="card" style={{ padding: '16px 20px', marginBottom: 16, borderColor: 'var(--accent)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>Your decision</div>
        <button
          className="btn ghost sm"
          disabled={escalate.isPending}
          onClick={() => escalate.mutate(undefined, { onSuccess: () => showToast('Escalated up the chain of agents') })}
        >
          Not mine — escalate ↑
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            className={`dispo-opt${selected === opt.key ? ' on' : ''}`}
            onClick={() => {
              setSelected(opt.key);
              if (opt.key === 'accept' || opt.key === 'act') confirm(opt.key);
            }}
            disabled={dispose.isPending}
          >
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{opt.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.45 }}>{opt.consequence}</div>
          </button>
        ))}
      </div>

      {needsInput && (
        <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {selected === 'abandon' ? (
            <textarea
              rows={2}
              style={{ flex: 1, resize: 'vertical', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' }}
              placeholder="Why is this not a real finding? The reason tunes the agent — be specific."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          ) : (
            <input
              style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' }}
              placeholder="Optional re-alert condition (defaults to: worsens a further 5% or 14 days pass)"
              value={reAlert}
              onChange={(e) => setReAlert(e.target.value)}
            />
          )}
          <button
            className="btn primary sm"
            disabled={dispose.isPending || (selected === 'abandon' && !reason.trim())}
            onClick={() => selected && confirm(selected)}
          >
            Confirm {selected === 'abandon' ? 'dismiss' : 'park'}
          </button>
        </div>
      )}
    </div>
  );
}
