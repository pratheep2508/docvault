import React, { useState } from 'react';
import './App.css';
import { NotificationProvider } from './context/NotificationContext';
import Header from './components/Header';
import Toast from './components/Toast';
import UploadPage from './pages/UploadPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';

function AppInner() {
  const [page, setPage] = useState('upload');
  const [docKey, setDocKey] = useState(0);

  const handleUploadComplete = () => {
    setDocKey(k => k + 1);
  };

  return (
    <div className="app-layout">
      <Header page={page} setPage={setPage} />
      <main className="main-content">
        {page === 'upload' && <UploadPage onUploadComplete={handleUploadComplete} />}
        {page === 'documents' && <DocumentsPage key={docKey} />}
        {page === 'notifications' && <NotificationsPage />}
      </main>
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppInner />
    </NotificationProvider>
  );
}
