import { useState } from 'react';
import { Avatar } from '../../components/shared/Avatar';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useKpiTickets } from '../../api/signalStudio';
import { TicketDetail } from './TicketDetail';
import type { ItsmStatus } from '../../api/types';

const columns: { key: ItsmStatus; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'acknowledged', label: 'Acknowledged' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

export function TicketBoard() {
  const { data, isLoading, isError } = useKpiTickets();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) return <Loading />;
  if (isError) return <ErrorMessage />;

  const selected = data?.find((t) => t.id === selectedId);

  return (
    <div>
      {selected && <TicketDetail ticket={selected} onClose={() => setSelectedId(null)} />}
      <div className="itsm-board">
        {columns.map((col) => (
          <div className="itsm-col" key={col.key}>
            <div className="itsm-col-head">{col.label}</div>
            {data?.filter((t) => t.status === col.key).map((t) => (
              <div className="itsm-card" key={t.id} onClick={() => setSelectedId(t.id)}>
                <b>{t.signalName}</b>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Avatar initials={t.assignedTo.initials} background={t.assignedTo.avatarBg} size={20} fontSize={9} />
                  <span style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{t.assignedTo.name}</span>
                </div>
                <div className="comment-badge">{t.comments.length} comment{t.comments.length === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
