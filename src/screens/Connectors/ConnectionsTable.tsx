import { Fragment, useState } from 'react';
import { Avatar } from '../../components/shared/Avatar';
import { Pill } from '../../components/shared/Pill';
import { Loading, ErrorMessage } from '../../components/shared/StateMessage';
import { useConnections, useApproveConnection, useRejectConnection } from '../../api/connectors';
import { useAuditLog } from '../../api/auditLog';
import { useToast } from '../../components/shared/Toast';
import type { ConnectionStatus } from '../../api/types';

const statusTone: Record<ConnectionStatus, 'amber' | 'green' | 'red' | 'gray'> = {
  pending: 'amber',
  approved: 'green',
  active: 'green',
  rejected: 'red',
  error: 'red',
};

function HistoryRow({ connectionId }: { connectionId: string }) {
  const { data } = useAuditLog('connection', connectionId);
  if (!data?.length) return <tr><td colSpan={6} style={{ color: 'var(--ink-3)', fontSize: 12 }}>No history yet.</td></tr>;
  return (
    <tr>
      <td colSpan={6}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {data.map((e) => (
            <div key={e.id} style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
              {e.timestamp} — <b>{e.actorName}</b> {e.action}
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export function ConnectionsTable({ status }: { status: ConnectionStatus | 'all' }) {
  const { data, isLoading, isError } = useConnections({ status });
  const approve = useApproveConnection();
  const reject = useRejectConnection();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="t">
        <thead>
          <tr>
            <th>Name</th><th>Type</th><th>Status</th><th>Owner</th><th>Created</th><th>Last synced</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <tr><td colSpan={6}><Loading /></td></tr>}
          {isError && <tr><td colSpan={6}><ErrorMessage /></td></tr>}
          {data?.map((c) => (
            <Fragment key={c.id}>
              <tr className="row-h" onClick={() => setExpanded(expanded === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                <td><b>{c.name}</b></td>
                <td>{c.connectorTypeName}</td>
                <td>
                  <Pill tone={statusTone[c.status]}>{c.status}</Pill>
                  {c.status === 'pending' && (
                    <span style={{ marginLeft: 8 }}>
                      <button
                        className="btn primary sm"
                        onClick={(e) => { e.stopPropagation(); approve.mutate(c.id, { onSuccess: () => showToast(`${c.name} approved`) }); }}
                      >
                        Approve
                      </button>
                      <button
                        className="btn ghost sm"
                        style={{ marginLeft: 6 }}
                        onClick={(e) => { e.stopPropagation(); reject.mutate(c.id, { onSuccess: () => showToast(`${c.name} rejected`) }); }}
                      >
                        Reject
                      </button>
                    </span>
                  )}
                </td>
                <td><span className="human"><Avatar initials={c.owner.initials} background={c.owner.avatarBg} size={22} fontSize={9} />{c.owner.name}</span></td>
                <td>{c.createdDate}</td>
                <td>{c.lastSyncedAt ?? '—'}</td>
              </tr>
              {expanded === c.id && <HistoryRow connectionId={c.id} />}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
