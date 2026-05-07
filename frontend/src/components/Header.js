import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { formatRelative } from '../utils/api';

export default function Header({ page, setPage }) {
  const { notifications, unreadCount, connected, markRead, markAllRead, deleteNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifClick = (n) => {
    if (!n.read) markRead(n.id);
  };

  return (
    <header className="header">
      <div className="header-logo" onClick={() => setPage('upload')}>
        <div className="logo-icon">📁</div>
        <span className="logo-text">Doc<span>Vault</span></span>
      </div>

      <nav className="header-nav">
        <button className={`nav-link ${page === 'upload' ? 'active' : ''}`} onClick={() => setPage('upload')}>
          Upload
        </button>
        <button className={`nav-link ${page === 'documents' ? 'active' : ''}`} onClick={() => setPage('documents')}>
          Documents
        </button>
        <button className={`nav-link ${page === 'notifications' ? 'active' : ''}`} onClick={() => setPage('notifications')}>
          Notifications
        </button>
      </nav>

      <div className="header-actions">
        <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
          <span className={`conn-dot ${connected ? 'connected' : 'disconnected'}`}></span>
          {connected ? 'Live' : 'Reconnecting...'}
        </span>

        <div className="notif-bell-wrap" ref={dropRef}>
          <button className="notif-bell" onClick={() => setOpen(o => !o)} aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>

          {open && (
            <div className="notif-dropdown">
              <div className="notif-dropdown-header">
                <span className="notif-dropdown-title">Notifications {unreadCount > 0 && `(${unreadCount})`}</span>
                {unreadCount > 0 && (
                  <button className="notif-mark-all" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">No notifications yet</div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => handleNotifClick(n)}>
                      <span className={`notif-dot ${!n.read ? n.type : 'read-dot'}`}></span>
                      <div className="notif-content">
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">{formatRelative(n.timestamp)}</div>
                      </div>
                      <button className="notif-delete" onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}>×</button>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--gray-100)', textAlign: 'center' }}>
                  <button className="notif-mark-all" onClick={() => { setOpen(false); setPage('notifications'); }}>
                    View all notifications →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
