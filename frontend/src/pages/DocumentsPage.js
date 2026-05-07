import React, { useState, useEffect, useCallback } from 'react';
import { api, formatFileSize, formatDate } from '../utils/api';

export default function DocumentsPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const loadFiles = useCallback(async () => {
    try {
      const data = await api.getFiles();
      setFiles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    setDeleting(id);
    await api.deleteFile(id);
    setFiles(prev => prev.filter(f => f.id !== id));
    setDeleting(null);
  };

  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">All uploaded PDF documents</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon blue">📄</div>
          <div>
            <div className="stat-value">{files.length}</div>
            <div className="stat-label">Total Files</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">💾</div>
          <div>
            <div className="stat-value">{formatFileSize(totalSize)}</div>
            <div className="stat-label">Total Storage</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">📅</div>
          <div>
            <div className="stat-value">
              {files.length > 0 ? new Date(files[0]?.uploadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
            </div>
            <div className="stat-label">Latest Upload</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">All Files ({filtered.length})</span>
          <input
            type="text"
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 14px',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              outline: 'none',
              fontFamily: 'Livvic, sans-serif',
              color: 'var(--gray-700)',
              width: '220px'
            }}
          />
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <div className="empty-msg">Loading files...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <div className="empty-msg">{search ? 'No files match your search' : 'No documents uploaded yet'}</div>
            <div className="empty-sub">{!search && 'Head to the Upload page to add your first document.'}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="files-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Size</th>
                  <th>Type</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(file => (
                  <tr key={file.id}>
                    <td>
                      <div className="file-name-cell">
                        <div className="pdf-icon">PDF</div>
                        {file.name}
                      </div>
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td><span style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>application/pdf</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(file.uploadedAt)}</td>
                    <td>
                      <a
                        href={api.getDownloadUrl(file.id)}
                        className="action-btn download"
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ↓ Download
                      </a>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(file.id)}
                        disabled={deleting === file.id}
                      >
                        {deleting === file.id ? '...' : '🗑'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
