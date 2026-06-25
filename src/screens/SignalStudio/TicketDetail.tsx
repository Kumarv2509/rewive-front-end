import { useState } from 'react';
import { Avatar } from '../../components/shared/Avatar';
import { useUpdateTicketStatus, useAddTicketComment } from '../../api/signalStudio';
import type { ItsmStatus, TrackedKpiTicket } from '../../api/types';

const stages: ItsmStatus[] = ['new', 'acknowledged', 'in_progress', 'resolved', 'closed'];

export function TicketDetail({ ticket, onClose }: { ticket: TrackedKpiTicket; onClose: () => void }) {
  const [comment, setComment] = useState('');
  const updateStatus = useUpdateTicketStatus();
  const addComment = useAddTicketComment();
  const nextStage = stages[stages.indexOf(ticket.status) + 1];

  return (
    <div className="card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>{ticket.signalName}</div>
        <button className="btn ghost sm" onClick={onClose}>Close</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', margin: '8px 0' }}>
        Assigned to <Avatar initials={ticket.assignedTo.initials} background={ticket.assignedTo.avatarBg} size={18} fontSize={8} /> {ticket.assignedTo.name}
        {' · '}Lineage: {ticket.lineage.map((l) => l.fieldsUsed.join(', ')).join('; ')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '14px 0' }}>
        {ticket.comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 8 }}>
            <Avatar initials={c.authorInitials} background={c.authorAvatarBg} size={24} fontSize={10} />
            <div>
              <div style={{ fontSize: 12.5 }}><b>{c.authorName}</b> <span style={{ color: 'var(--ink-3)' }}>· {c.stageAtComment}</span></div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{c.text}</div>
            </div>
          </div>
        ))}
        {ticket.comments.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>No comments yet.</div>}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Add a comment / feedback…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
        />
        <button
          className="btn ghost sm"
          disabled={!comment || addComment.isPending}
          onClick={() => { addComment.mutate({ id: ticket.id, text: comment }); setComment(''); }}
        >
          Comment
        </button>
        {nextStage && (
          <button
            className="btn primary sm"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: ticket.id, status: nextStage })}
          >
            Move to {nextStage.replace('_', ' ')}
          </button>
        )}
      </div>
    </div>
  );
}
