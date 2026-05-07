import React, { useState, useRef, useCallback } from 'react';
import { api, formatFileSize } from '../utils/api';
import { useNotifications } from '../context/NotificationContext';

function UploadItem({ item }) {
  const pct = item.progress || 0;
  return (
    <div className="upload-item">
      <div className="upload-item-header">
        <span className="upload-item-name" title={item.file.name}>{item.file.name}</span>
        <div className="upload-item-meta">
          <span className="upload-item-size">{formatFileSize(item.file.size)}</span>
          <span className={`status-badge ${item.status}`}>{item.status}</span>
        </div>
      </div>
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${item.status}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {item.status === 'uploading' && (
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textAlign: 'right' }}>{pct}%</div>
      )}
    </div>
  );
}

export default function UploadPage({ onUploadComplete }) {
  const [queue, setQueue] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [bulkActive, setBulkActive] = useState(false);
  const [bulkCount, setBulkCount] = useState(0);
  const inputRef = useRef(null);
  const { fetchNotifications } = useNotifications();

  const processFiles = useCallback(async (files) => {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) {
      alert('Please select PDF files only.');
      return;
    }

    const isBulk = validFiles.length > 3;
    const items = validFiles.map(f => ({ id: Math.random().toString(36).slice(2), file: f, status: 'pending', progress: 0 }));
    setQueue(items);

    if (isBulk) {
      setBulkActive(true);
      setBulkCount(validFiles.length);
    }

    // Mark all as uploading
    setQueue(prev => prev.map(i => ({ ...i, status: 'uploading' })));

    try {
      // Simulate per-file progress
      let fakeProgress = 0;
      const progressInterval = setInterval(() => {
        fakeProgress = Math.min(fakeProgress + Math.random() * 15, 90);
        setQueue(prev => prev.map(i => i.status === 'uploading' ? { ...i, progress: Math.round(fakeProgress) } : i));
      }, 200);

      const result = await api.uploadFiles(validFiles, (pct) => {
        setQueue(prev => prev.map(i => ({ ...i, progress: pct })));
      });

      clearInterval(progressInterval);

      if (result.success) {
        setQueue(prev => prev.map(i => ({ ...i, status: 'complete', progress: 100 })));
        await fetchNotifications();
        if (onUploadComplete) onUploadComplete();
        setBulkActive(false);
        // Auto-clear after 3s
        setTimeout(() => setQueue([]), 3000);
      }
    } catch (e) {
      setQueue(prev => prev.map(i => ({ ...i, status: 'failed' })));
      setBulkActive(false);
    }
  }, [fetchNotifications, onUploadComplete]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const onFileChange = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload Documents</h1>
        <p className="page-subtitle">Upload PDF documents — supports single file and bulk upload</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div
            className={`upload-zone ${dragging ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
            <span className="upload-icon">📄</span>
            <div className="upload-title">
              {dragging ? 'Drop your PDFs here' : 'Drag & drop PDFs here'}
            </div>
            <div className="upload-subtitle">PDF files only · Max 50MB per file · Multiple files supported</div>
            <button className="upload-btn" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
              Browse Files
            </button>
          </div>

          {queue.length > 0 && (
            <div className="upload-queue">
              {bulkActive && (
                <div className="bulk-banner">
                  <span>⚡</span>
                  <span>Upload in progress — processing <strong>{bulkCount} files</strong> in background. You'll be notified when complete.</span>
                </div>
              )}
              {queue.map(item => <UploadItem key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <span><strong>Single/small batch (1-3):</strong> Inline progress bars shown</span>
          <span><strong>Bulk (&gt;3 files):</strong> Background mode with real-time notification</span>
          <span><strong>Notifications:</strong> Persisted in database, visible across pages</span>
        </div>
      </div>
    </div>
  );
}
