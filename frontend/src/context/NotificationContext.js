import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, SSE_URL } from '../utils/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const esRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (e) { console.error(e); }
  }, []);

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    fetchNotifications();

    // SSE
    const connect = () => {
      const es = new EventSource(SSE_URL);
      esRef.current = es;

      es.addEventListener('connected', (e) => {
        setConnected(true);
        const data = JSON.parse(e.data);
        setUnreadCount(data.unreadCount);
      });

      es.addEventListener('upload_complete', (e) => {
        const data = JSON.parse(e.data);
        addToast(data.message, 'success');
        fetchNotifications();
      });

      es.addEventListener('notification_update', (e) => {
        const data = JSON.parse(e.data);
        setUnreadCount(data.unreadCount);
        fetchNotifications();
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => { if (esRef.current) esRef.current.close(); };
  }, [fetchNotifications, addToast]);

  const markRead = async (id) => {
    await api.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id) => {
    await api.deleteNotification(id);
    const notif = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notif && !notif.read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, connected, toasts,
      fetchNotifications, markRead, markAllRead, deleteNotification, dismissToast
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
