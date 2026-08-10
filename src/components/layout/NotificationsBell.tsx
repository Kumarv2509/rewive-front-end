import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarkNotificationsRead, useNotifications } from '../../api/notifications';
import { useEffectiveLens } from './personaLens';
import { timeAgo } from '../shared/timeAgo';
import type { AppNotification } from '../../api/types';

const TYPE_LABEL: Record<AppNotification['type'], string> = {
  escalation: 'Escalated to you',
  dotted_flag: 'Flagged on the functional line',
};

// The bell is the escalation outbox: what an email would have carried. It only
// lights when the engine has delivered something to a role in the current lens.
export function NotificationsBell() {
  const navigate = useNavigate();
  const { persona, scope } = useEffectiveLens();
  const { data: items = [] } = useNotifications(persona, scope);
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.readAt);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate([n.id]);
    setOpen(false);
    if (n.findingId) navigate(`/operate/findings/${n.findingId}`);
  };

  return (
    <div className="org-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bell"
        style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex' }}
        aria-expanded={open}
        title={unread.length ? `${unread.length} unread` : 'Notifications'}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread.length > 0 && <span className="dot"></span>}
      </button>
      {open && (
        <div className="menu" role="menu" style={{ right: 0, left: 'auto', width: 340, maxHeight: 420, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: 'var(--sp-2) var(--sp-3)' }}>
            <span className="eyebrow">Notifications</span>
            {unread.length > 0 && (
              <button
                type="button"
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', fontSize: 'var(--text-xs)', color: 'var(--ink-3)', cursor: 'pointer' }}
                onClick={() => markRead.mutate(unread.map((n) => n.id))}
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 && (
            <div style={{ padding: 'var(--sp-3)', fontSize: 'var(--text-sm)', color: 'var(--ink-3)' }}>
              Nothing delivered yet. When a finding escalates — an SLA runs out, or a parked re-alert rule
              fires — the new owner hears about it here.
            </div>
          )}
          {items.slice(0, 15).map((n) => (
            <button key={n.id} type="button" className="menu-item" style={{ display: 'block', textAlign: 'left', whiteSpace: 'normal' }} onClick={() => openItem(n)}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)' }}>
                <span className="eyebrow" style={{ color: n.readAt ? 'var(--ink-3)' : 'var(--accent)' }}>
                  {TYPE_LABEL[n.type]}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {timeAgo(n.createdAt)}
                </span>
              </span>
              <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: n.readAt ? 400 : 600, margin: '2px 0' }}>
                {n.title}
              </span>
              <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--ink-2)' }}>{n.body}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
