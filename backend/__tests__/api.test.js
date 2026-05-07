const request = require('supertest');
const app = require('../server');
const path = require('path');
const fs = require('fs');

// Clean test DB before each test
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const resetDB = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify({ files: [], notifications: [], uploadSessions: [] }, null, 2));
};

beforeEach(resetDB);
afterAll(resetDB);

describe('Health check', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Notifications API', () => {
  test('GET /api/notifications returns empty array', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('POST /api/notifications creates notification', async () => {
    const res = await request(app)
      .post('/api/notifications')
      .send({ message: 'Test notification', type: 'info' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Test notification');
    expect(res.body.type).toBe('info');
    expect(res.body.read).toBe(false);
    expect(res.body.id).toBeDefined();
  });

  test('GET /api/notifications/unread-count returns correct count', async () => {
    await request(app).post('/api/notifications').send({ message: 'A', type: 'info' });
    await request(app).post('/api/notifications').send({ message: 'B', type: 'success' });
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.body.count).toBe(2);
  });

  test('PATCH /api/notifications/:id/read marks as read', async () => {
    const created = await request(app).post('/api/notifications').send({ message: 'X', type: 'info' });
    const id = created.body.id;

    await request(app).patch(`/api/notifications/${id}/read`);
    const res = await request(app).get('/api/notifications');
    const notif = res.body.find(n => n.id === id);
    expect(notif.read).toBe(true);
  });

  test('PATCH /api/notifications/read-all marks all as read', async () => {
    await request(app).post('/api/notifications').send({ message: 'A', type: 'info' });
    await request(app).post('/api/notifications').send({ message: 'B', type: 'success' });

    await request(app).patch('/api/notifications/read-all');
    const res = await request(app).get('/api/notifications');
    expect(res.body.every(n => n.read)).toBe(true);
  });

  test('DELETE /api/notifications/:id removes notification', async () => {
    const created = await request(app).post('/api/notifications').send({ message: 'Delete me', type: 'info' });
    const id = created.body.id;

    await request(app).delete(`/api/notifications/${id}`);
    const res = await request(app).get('/api/notifications');
    expect(res.body.find(n => n.id === id)).toBeUndefined();
  });

  test('PATCH read on non-existent notification returns 404', async () => {
    const res = await request(app).patch('/api/notifications/nonexistent/read');
    expect(res.status).toBe(404);
  });
});

describe('Files API', () => {
  test('GET /api/files returns empty array', async () => {
    const res = await request(app).get('/api/files');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/files/upload rejects non-PDF', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .attach('files', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('POST /api/files/upload with no files returns 400', async () => {
    const res = await request(app).post('/api/files/upload');
    expect(res.status).toBe(400);
  });

  test('POST /api/files/upload accepts PDF', async () => {
    // Minimal valid PDF
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    const res = await request(app)
      .post('/api/files/upload')
      .attach('files', pdfContent, { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.files.length).toBe(1);
    expect(res.body.files[0].name).toBe('test.pdf');
  });

  test('Uploading >3 files sets isBulk true', async () => {
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    let req = request(app).post('/api/files/upload');
    for (let i = 0; i < 4; i++) {
      req = req.attach('files', pdfContent, { filename: `file${i}.pdf`, contentType: 'application/pdf' });
    }
    const res = await req;
    expect(res.status).toBe(200);
    expect(res.body.isBulk).toBe(true);
  });

  test('Uploading 3 files sets isBulk false', async () => {
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    let req = request(app).post('/api/files/upload');
    for (let i = 0; i < 3; i++) {
      req = req.attach('files', pdfContent, { filename: `file${i}.pdf`, contentType: 'application/pdf' });
    }
    const res = await req;
    expect(res.status).toBe(200);
    expect(res.body.isBulk).toBe(false);
  });

  test('Upload creates a notification', async () => {
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    await request(app)
      .post('/api/files/upload')
      .attach('files', pdfContent, { filename: 'doc.pdf', contentType: 'application/pdf' });

    const res = await request(app).get('/api/notifications');
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].type).toBe('success');
  });

  test('DELETE /api/files/:id removes file', async () => {
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    const upload = await request(app)
      .post('/api/files/upload')
      .attach('files', pdfContent, { filename: 'todelete.pdf', contentType: 'application/pdf' });

    const fileId = upload.body.files[0].id;
    await request(app).delete(`/api/files/${fileId}`);

    const filesRes = await request(app).get('/api/files');
    expect(filesRes.body.find(f => f.id === fileId)).toBeUndefined();
  });

  test('DELETE /api/files/:id on non-existent returns 404', async () => {
    const res = await request(app).delete('/api/files/nonexistent-id');
    expect(res.status).toBe(404);
  });
});
