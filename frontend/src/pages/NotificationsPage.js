import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { formatDate, formatRelative } from '../utils/api';

const TYPE_ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification } = useNotifications();

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Notification Center</h1>
          <p className="page-subtitle">
            All system notifications — persisted in database
            {unreadCount > 0 && <span style={{ color: 'var(--blue-500)', marginLeft: '8px' }}>· {unreadCount} unread</span>}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost" onClick={markAllRead}>✓ Mark all as read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <div className="empty-msg">No notifications yet</div>
          <div className="empty-sub">Upload documents to receive notifications here.</div>
        </div>
      ) : (
        <div className="notif-page-list">
          {notifications.map(n => (
            <div key={n.id} className={`notif-page-item ${!n.read ? 'unread' : ''}`}>
              <div className={`notif-type-icon ${n.type}`}>
                {TYPE_ICONS[n.type] || '🔔'}
              </div>
              <div className="notif-page-content">
                <div className="notif-page-msg">{n.message}</div>
                <div className="notif-page-time">
                  {formatDate(n.timestamp)} · {formatRelative(n.timestamp)}
                  {!n.read && (
                    <span style={{
                      marginLeft: '8px',
                      background: 'var(--blue-100)',
                      color: 'var(--blue-600)',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      textTransform: 'uppercase'
                    }}>New</span>
                  )}
                </div>
              </div>
              <div className="notif-page-actions">
                {!n.read && (
                  <button className="action-btn download" onClick={() => markRead(n.id)}>
                    Mark read
                  </button>
                )}
                <button className="action-btn delete" onClick={() => deleteNotification(n.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
