const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDB, saveDB } = require('../utils/db');
const { broadcast } = require('../utils/sse');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = `${uuidv4()}-${file.originalname}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});

// GET all files
router.get('/', (req, res) => {
  const db = getDB();
  res.json(db.files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
});

// POST upload files
router.post('/upload', (req, res) => {
  upload.array('files', 50)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const db = getDB();
    const sessionId = uuidv4();
    const isBulk = req.files.length > 3;
    const uploadedFiles = [];

    for (const file of req.files) {
      const fileRecord = {
        id: uuidv4(),
        name: file.originalname,
        storedName: file.filename,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        sessionId,
        status: 'complete'
      };
      db.files.push(fileRecord);
      uploadedFiles.push(fileRecord);
    }

    // Create notification
    const notif = {
      id: uuidv4(),
      message: isBulk
        ? `${req.files.length} files uploaded successfully`
        : req.files.length === 1
          ? `"${req.files[0].originalname}" uploaded successfully`
          : `${req.files.length} files uploaded successfully`,
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false,
      fileCount: req.files.length,
      sessionId
    };
    db.notifications.push(notif);
    saveDB(db);

    // Broadcast SSE for bulk uploads
    if (isBulk) {
      setTimeout(() => {
        broadcast('upload_complete', {
          notificationId: notif.id,
          message: notif.message,
          timestamp: notif.timestamp,
          fileCount: req.files.length
        });
      }, 500);
    }

    // Always broadcast notification update
    broadcast('notification_update', { unreadCount: db.notifications.filter(n => !n.read).length });

    res.json({
      success: true,
      files: uploadedFiles,
      sessionId,
      isBulk,
      notification: notif
    });
  });
});

// GET download a file
router.get('/download/:id', (req, res) => {
  const db = getDB();
  const file = db.files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(UPLOADS_DIR, file.storedName);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  res.download(filePath, file.name);
});

// DELETE a file
router.delete('/:id', (req, res) => {
  const db = getDB();
  const idx = db.files.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'File not found' });

  const file = db.files[idx];
  const filePath = path.join(UPLOADS_DIR, file.storedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.files.splice(idx, 1);
  saveDB(db);
  res.json({ success: true });
});

module.exports = router;
