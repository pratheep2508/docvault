const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDB, saveDB } = require('../utils/db');
const { addClient, broadcast } = require('../utils/sse');

// SSE endpoint
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  addClient(res);

  // Send initial unread count
  const db = getDB();
  const unreadCount = db.notifications.filter(n => !n.read).length;
  res.write(`event: connected\ndata: ${JSON.stringify({ unreadCount })}\n\n`);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => clearInterval(heartbeat));
});

// GET all notifications
router.get('/', (req, res) => {
  const db = getDB();
  res.json(db.notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
});

// GET unread count
router.get('/unread-count', (req, res) => {
  const db = getDB();
  const count = db.notifications.filter(n => !n.read).length;
  res.json({ count });
});

// PATCH mark one as read
router.patch('/:id/read', (req, res) => {
  const db = getDB();
  const notif = db.notifications.find(n => n.id === req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  notif.read = true;
  saveDB(db);

  broadcast('notification_update', { unreadCount: db.notifications.filter(n => !n.read).length });
  res.json({ success: true });
});

// PATCH mark all as read
router.patch('/read-all', (req, res) => {
  const db = getDB();
  db.notifications.forEach(n => (n.read = true));
  saveDB(db);

  broadcast('notification_update', { unreadCount: 0 });
  res.json({ success: true });
});

// POST create a system notification (for testing)
router.post('/', (req, res) => {
  const { message, type = 'info' } = req.body;
  const db = getDB();
  const notif = {
    id: uuidv4(),
    message,
    type,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.notifications.push(notif);
  saveDB(db);

  broadcast('notification_update', { unreadCount: db.notifications.filter(n => !n.read).length });
  res.json(notif);
});

// DELETE a notification
router.delete('/:id', (req, res) => {
  const db = getDB();
  const idx = db.notifications.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.notifications.splice(idx, 1);
  saveDB(db);
  broadcast('notification_update', { unreadCount: db.notifications.filter(n => !n.read).length });
  res.json({ success: true });
});

module.exports = router;
