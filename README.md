# DocVault — Document Management Dashboard

A full-stack document management web application with real-time upload progress, smart bulk notifications via Server-Sent Events, and a persistent notification center.

---

## Features

### Feature 1 — File Upload (Single & Bulk)
- Drag-and-drop or click-to-browse file upload zone
- Accepts PDF files only (up to 50MB each)
- Per-file real-time progress bars with filename, size, and status
- Upload status states: `pending → uploading → complete / failed`
- Files stored on disk; metadata in JSON database
- Document list with name, size, upload date, and download/delete options

### Feature 2 — Smart Bulk Notifications
- 1–3 files: Inline progress bars, no extra banner
- 4+ files: Immediate banner — *"Upload in progress — processing X files in background"*
- Progress bars remain visible in the upload queue
- Once complete, a real-time SSE push notification fires: *"X files uploaded successfully"*
- Notification arrives even if user has navigated to a different page

### Feature 3 — Notification Center
- Every event (upload complete, failure, system alert) is saved to the database
- Header bell icon shows live unread count badge
- Dropdown shows latest 10 notifications with mark-read and delete
- Dedicated Notifications page lists all notifications with type, timestamp, and read status
- Mark individual or all notifications as read
- Data persists across page refreshes (fetched from backend, not localStorage)
- Live SSE connection indicator in header

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React (CRA) | Fast setup, good ecosystem |
| Styling | Custom CSS with Livvic font | Matches SWS AI brand (white/blue theme) |
| Real-time | Server-Sent Events (SSE) | Simple, one-directional, no extra libs |
| Backend | Node.js + Express | Lightweight, familiar |
| File storage | Local disk (`/uploads`) | Simple for local dev; swap to S3 easily |
| Database | JSON file (`/data/db.json`) | Zero-dependency, easy to inspect |
| Testing | Jest + Supertest | Standard Node.js testing stack |

---

## Database Schema (ERD)

```
files
├── id          UUID (PK)
├── name        string  — original filename
├── storedName  string  — UUID-prefixed disk filename
├── size        number  — bytes
├── mimeType    string
├── uploadedAt  ISO timestamp
├── sessionId   UUID    — links to upload session
└── status      enum: pending | complete | failed

notifications
├── id          UUID (PK)
├── message     string
├── type        enum: success | error | info
├── timestamp   ISO timestamp
├── read        boolean
├── fileCount   number (optional)
└── sessionId   UUID (optional)
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd docvault

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

Backend (`backend/.env` — optional, defaults shown):
```
PORT=3001
NODE_ENV=development
```

Frontend (`frontend/.env` — optional):
```
REACT_APP_API_URL=http://localhost:3001/api
```

### 3. Run

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
# → Running on http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
# → Opens http://localhost:3000
```

### 4. Production Build

```bash
cd frontend
npm run build
# Serve the build/ folder with any static host

# OR let Express serve it:
cd backend
NODE_ENV=production node server.js
# Copy frontend/build → alongside backend
```

---

## Running Tests

### Backend (17 tests)

```bash
cd backend
npx jest --forceExit
```

Tests cover:
- `GET /api/health`
- Notifications: create, list, unread count, mark read, mark all read, delete, 404 handling
- Files: list, upload PDF, reject non-PDF, reject empty upload, bulk detection (>3 files), notification on upload, delete, 404 handling

### Frontend

```bash
cd frontend
npm test
```

---

## API Reference

### Files
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/files` | List all files |
| POST | `/api/files/upload` | Upload one or more PDFs (multipart `files[]`) |
| GET | `/api/files/download/:id` | Download a file |
| DELETE | `/api/files/:id` | Delete a file |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List all notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| GET | `/api/notifications/stream` | SSE stream for real-time events |
| POST | `/api/notifications` | Create a notification |
| PATCH | `/api/notifications/:id/read` | Mark one as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete a notification |

### SSE Events
| Event | Payload | Trigger |
|-------|---------|---------|
| `connected` | `{ unreadCount }` | On SSE connection |
| `upload_complete` | `{ message, timestamp, fileCount }` | After bulk upload finishes |
| `notification_update` | `{ unreadCount }` | Any notification change |

---

## Project Structure

```
docvault/
├── backend/
│   ├── routes/
│   │   ├── files.js          # Upload, list, download, delete
│   │   └── notifications.js  # CRUD + SSE stream
│   ├── utils/
│   │   ├── db.js             # JSON file DB helpers
│   │   └── sse.js            # SSE client manager + broadcast
│   ├── uploads/              # Stored PDF files
│   ├── data/db.json          # Database (auto-created)
│   ├── __tests__/api.test.js # Backend unit tests
│   └── server.js             # Express app entry
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Header.js         # Nav + notification bell + dropdown
        │   └── Toast.js          # Toast notification container
        ├── context/
        │   └── NotificationContext.js  # SSE + state management
        ├── pages/
        │   ├── UploadPage.js     # Upload zone + progress queue
        │   ├── DocumentsPage.js  # File table with stats
        │   └── NotificationsPage.js    # Full notification center
        ├── utils/api.js          # API helper functions
        └── App.js                # Root with routing
```

---

## Deployment

### Docker (optional)

```dockerfile
# backend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

For production, swap the JSON file database with PostgreSQL/MongoDB and local disk storage with AWS S3.
