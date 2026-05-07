const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = {
  // Files
  getFiles: () => fetch(`${BASE_URL}/files`).then(r => r.json()),
  deleteFile: (id) => fetch(`${BASE_URL}/files/${id}`, { method: 'DELETE' }).then(r => r.json()),
  getDownloadUrl: (id) => `${BASE_URL}/files/download/${id}`,

  uploadFiles: (files, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/files/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(xhr.responseText));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  },

  // Notifications
  getNotifications: () => fetch(`${BASE_URL}/notifications`).then(r => r.json()),
  getUnreadCount: () => fetch(`${BASE_URL}/notifications/unread-count`).then(r => r.json()),
  markRead: (id) => fetch(`${BASE_URL}/notifications/${id}/read`, { method: 'PATCH' }).then(r => r.json()),
  markAllRead: () => fetch(`${BASE_URL}/notifications/read-all`, { method: 'PATCH' }).then(r => r.json()),
  deleteNotification: (id) => fetch(`${BASE_URL}/notifications/${id}`, { method: 'DELETE' }).then(r => r.json()),
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatRelative = (iso) => {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const SSE_URL = `${BASE_URL}/notifications/stream`;
