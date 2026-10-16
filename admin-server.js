const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Rate limiting (simple in-memory)
const rateLimitStore = {};
app.use('/api/', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  if (!rateLimitStore[ip]) rateLimitStore[ip] = [];
  rateLimitStore[ip] = rateLimitStore[ip].filter(t => now - t < 15 * 60 * 1000);
  if (rateLimitStore[ip].length > 100) return res.status(429).json({ error: 'طلبات كثيرة جداً، حاول لاحقاً' });
  rateLimitStore[ip].push(now);
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Data storage
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return {
        users: data.users || {},
        files: data.files || [],
        videos: data.videos || [],
        requests: data.requests || [],
        analytics: data.analytics || { totalViews: 0, videosWatched: 0, dailyUsers: [] }
      };
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return {
    users: {},
    files: [
      { id: 1, name: 'رياضيات', count: 0, createdAt: Date.now() },
      { id: 2, name: 'كيمياء', count: 0, createdAt: Date.now() },
      { id: 3, name: 'فيزياء', count: 0, createdAt: Date.now() },
    ],
    videos: [],
    requests: [],
    analytics: { totalViews: 0, videosWatched: 0, dailyUsers: [] }
  };
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users, files, videos, requests, analytics }, null, 2));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

let { users, files, videos, requests, analytics } = loadData();

// Auth
app.post('/api/login', (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return res.status(400).json({ error: 'اسم مستخدم مطلوب (2 أحرف على الأقل)' });
  }
  const userId = 'user_' + crypto.randomUUID();
  users[userId] = { id: userId, username: username.trim(), created: Date.now() };
  saveData();
  res.json({ userId, username: username.trim() });
});

// Admin auth middleware
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'maktaba2026';
function requireAuth(req, res, next) {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  next();
}

// Validation helpers
function validateFile(data) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    return 'اسم الملف مطلوب (2 أحرف على الأقل)';
  }
  if (data.name.length > 100) return 'اسم الملف طويل جداً (100 حرف كحد أقصى)';
  return null;
}

function validateVideo(data) {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
    return 'عنوان الفيديو مطلوب (2 أحرف على الأقل)';
  }
  if (data.title.length > 200) return 'عنوان الفيديو طويل جداً (200 حرف كحد أقصى)';
  if (!data.url || typeof data.url !== 'string') return 'رابط الفيديو مطلوب';
  try { new URL(data.url); } catch { return 'رابط الفيديو غير صالح'; }
  if (data.url.length > 2000) return 'رابط الفيديو طويل جداً';
  return null;
}

// API Routes

// Files
app.get('/api/files', (req, res) => res.json(files));

app.post('/api/files', requireAuth, (req, res) => {
  const error = validateFile(req.body);
  if (error) return res.status(400).json({ error });
  const newFile = { id: Date.now(), name: req.body.name.trim(), count: 0, createdAt: Date.now() };
  files.push(newFile);
  saveData();
  res.json(newFile);
});

app.delete('/api/files/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const index = files.findIndex(f => f.id === id);
  if (index === -1) return res.status(404).json({ error: 'الملف غير موجود' });
  videos = videos.filter(v => v.fileId !== id);
  files.splice(index, 1);
  saveData();
  res.json({ success: true });
});

// Videos
app.get('/api/videos', (req, res) => {
  const { page = 1, limit = 20, fileId } = req.query;
  let result = [...videos];
  if (fileId) result = result.filter(v => v.fileId === Number(fileId));
  result.sort((a, b) => b.id - a.id);
  const start = (Number(page) - 1) * Number(limit);
  const paginated = result.slice(start, start + Number(limit));
  res.json({
    data: paginated,
    pagination: { page: Number(page), limit: Number(limit), total: result.length, pages: Math.ceil(result.length / Number(limit)) }
  });
});

app.post('/api/videos', requireAuth, (req, res) => {
  const error = validateVideo(req.body);
  if (error) return res.status(400).json({ error });
  const newVideo = {
    id: Date.now(),
    title: req.body.title.trim(),
    url: req.body.url.trim(),
    fileId: Number(req.body.fileId) || null,
    views: 0,
    duration: req.body.duration || '0:00',
    isVertical: Boolean(req.body.isVertical),
    createdAt: Date.now()
  };
  videos.push(newVideo);
  if (newVideo.fileId) {
    const file = files.find(f => f.id === newVideo.fileId);
    if (file) file.count = videos.filter(v => v.fileId === file.id).length;
  }
  saveData();
  res.json(newVideo);
});

app.patch('/api/videos/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const index = videos.findIndex(v => v.id === id);
  if (index === -1) return res.status(404).json({ error: 'الفيديو غير موجود' });
  const updates = {};
  if (req.body.title !== undefined) updates.title = req.body.title.trim();
  if (req.body.url !== undefined) updates.url = req.body.url.trim();
  if (req.body.fileId !== undefined) updates.fileId = Number(req.body.fileId);
  if (req.body.duration !== undefined) updates.duration = req.body.duration;
  if (req.body.isVertical !== undefined) updates.isVertical = Boolean(req.body.isVertical);
  videos[index] = { ...videos[index], ...updates };
  files.forEach(f => { f.count = videos.filter(v => v.fileId === f.id).length; });
  saveData();
  res.json(videos[index]);
});

app.delete('/api/videos/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const index = videos.findIndex(v => v.id === id);
  if (index === -1) return res.status(404).json({ error: 'الفيديو غير موجود' });
  videos.splice(index, 1);
  files.forEach(f => { f.count = videos.filter(v => v.fileId === f.id).length; });
  saveData();
  res.json({ success: true });
});

// Requests
app.get('/api/requests', (req, res) => res.json(requests));

app.post('/api/requests', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length < 3) {
    return res.status(400).json({ error: 'نص الطلب مطلوب (3 أحرف على الأقل)' });
  }
  if (text.length > 500) return res.status(400).json({ error: 'نص الطلب طويل جداً (500 حرف كحد أقصى)' });
  const newRequest = { id: Date.now(), text: text.trim(), status: 'قيد المراجعة', count: 1, createdAt: Date.now() };
  requests.push(newRequest);
  saveData();
  res.json(newRequest);
});

// Analytics
app.get('/api/analytics', (req, res) => res.json(analytics));

// File upload
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الملف غير مدعوم. الأنواع المسموحة: mp4, webm, ogg, mov'));
  }
});

app.post('/api/upload', requireAuth, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع ملف' });
  const videoUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: videoUrl, filename: req.file.filename });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'حجم الملف كبير جداً (500 ميجابايت كحد أقصى)' });
    return res.status(400).json({ error: 'خطأ في رفع الملف' });
  }
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'غير موجود' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}`);
});
