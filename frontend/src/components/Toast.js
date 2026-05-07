import React from 'react';
import { useNotifications } from '../context/NotificationContext';

const ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => dismissToast(t.id)}>
          <span className="toast-icon">{ICONS[t.type] || '🔔'}</span>
          <span>{t.message}</span>
          <button className="toast-close" onClick={() => dismissToast(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
