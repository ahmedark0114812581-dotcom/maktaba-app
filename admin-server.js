const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// تحميل .env بدون مكتبات خارجية
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const LF = String.fromCharCode(10);
    const CR = String.fromCharCode(13);
    fs.readFileSync(envPath, 'utf8').split(LF).forEach((rawLine) => {
      const line = rawLine.split(CR).join('');
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    });
  }
} catch (e) {
  console.error('تعذر تحميل .env:', e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// مسار البيانات: على Render بيكون /data (ديسك دائم)، محلياً يكون مجلد المشروع
const DATA_DIR = process.env.DATA_DIR || __dirname;
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // CSP لازم تسمح بالـ inline لأن لوحة التحكم ملف واحد فيه سكربت وأنماط مدمجة
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'"
  );
  next();
});

// CORS - restrict in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:8082', 'http://localhost:3000'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Rate limiting (simple in-memory)
const rateLimitStore = {};
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 1000); // 1000 طلب / 15 دقيقة لكل IP
app.use('/api/', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  if (!rateLimitStore[ip]) rateLimitStore[ip] = [];
  rateLimitStore[ip] = rateLimitStore[ip].filter(t => now - t < 15 * 60 * 1000);
  if (rateLimitStore[ip].length > RATE_LIMIT_MAX) return res.status(429).json({ error: 'طلبات كثيرة جداً، حاول لاحقاً' });
  rateLimitStore[ip].push(now);
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// لوحة التحكم على الجذر — الملف اسمه admin.html عشان ميتعارضش مع واجهة تطبيق Expo
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// صفحة تعريفية عامة للتطبيق (للإعلانات والمراجعة)
app.get('/landing', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
// صفحة مكتبة الفيديوهات العامة (محتوى حقيقي للموقع)
app.get('/videos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'videos.html')));

// Data storage
const DATA_FILE = path.join(DATA_DIR, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return {
        users: data.users || {},
        files: data.files || [],
        videos: data.videos || [],
        requests: data.requests || [],
        codes: data.codes || [],
        downloads: data.downloads || [],
        config: data.config || {},
        analytics: data.analytics || { totalViews: 0, videosWatched: 0, dailyUsers: [] }
      };
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return {
    users: {},
    files: [],
    videos: [],
    requests: [],
    codes: [],
    downloads: [],
    config: {},
    analytics: { totalViews: 0, videosWatched: 0, dailyUsers: [] }
  };
}

function saveData() {
  const payload = JSON.stringify({ users, files, videos, requests, codes, downloads, config, analytics }, null, 2);
  try {
    fs.writeFileSync(DATA_FILE, payload);
  } catch (e) {
    console.error('Error saving data:', e);
  }
  // نسخة احتياطية على B2 — عشان Render المجاني بيمسح القرص مع كل إعادة تشغيل
  persistToCloud(payload);
}

// بتتحط بعد تهيئة B2 (تحت) — no-op لو B2 مش مفعّل
let persistToCloud = () => {};

let { users, files, videos, requests, codes, downloads, config, analytics } = loadData();

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
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || crypto.randomBytes(32).toString('hex');
if (!process.env.ADMIN_TOKEN) {
  console.warn('⚠️  ADMIN_TOKEN غير محدد. مفتاح مؤقت لهذه الجلسة:', ADMIN_TOKEN);
} else {
  console.log('🔑 ADMIN_TOKEN محمّل من .env');
}

// ============ جلسات لوحة التحكم ============
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // الجلسة صالحة 7 أيام

if (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
  console.warn('⚠️  مفيش كلمة سر للوحة التحكم! حط ADMIN_PASSWORD في .env وإلا مش هتقدر تسجّل دخول.');
} else {
  console.log('🔒 لوحة التحكم محمية بكلمة سر');
}

function passwordMatches(input) {
  if (typeof input !== 'string' || !input) return false;
  if (ADMIN_PASSWORD_HASH) {
    const h = crypto.createHash('sha256').update(input).digest('hex');
    const a = Buffer.from(h);
    const b = Buffer.from(String(ADMIN_PASSWORD_HASH).toLowerCase().trim());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  if (!ADMIN_PASSWORD) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signSession(expiresAt) {
  const sig = crypto.createHmac('sha256', ADMIN_TOKEN).update(String(expiresAt)).digest('hex');
  return `${expiresAt}.${sig}`;
}

function verifySession(token) {
  if (typeof token !== 'string') return false;
  const idx = token.indexOf('.');
  if (idx < 1) return false;
  const exp = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const n = Number(exp);
  if (!Number.isFinite(n) || n < Date.now()) return false;
  const expected = crypto.createHmac('sha256', ADMIN_TOKEN).update(exp).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// حماية من تخمين كلمة السر: 10 محاولات كل 15 دقيقة
const loginAttempts = {};
function loginRateLimited(ip) {
  const now = Date.now();
  if (!loginAttempts[ip]) loginAttempts[ip] = [];
  loginAttempts[ip] = loginAttempts[ip].filter(t => now - t < 15 * 60 * 1000);
  if (loginAttempts[ip].length >= 10) return true;
  loginAttempts[ip].push(now);
  return false;
}

app.post('/api/admin/login', (req, res) => {
  if (loginRateLimited(req.ip)) {
    return res.status(429).json({ error: 'محاولات كثيرة جداً. استنى 15 دقيقة.' });
  }
  if (!ADMIN_PASSWORD && !ADMIN_PASSWORD_HASH) {
    return res.status(500).json({ error: 'مفيش كلمة سر مضبوطة على السيرفر (ADMIN_PASSWORD في .env)' });
  }
  const { password } = req.body || {};
  if (!passwordMatches(password)) {
    return res.status(401).json({ error: 'كلمة السر غلط' });
  }
  const expiresAt = Date.now() + SESSION_TTL_MS;
  res.json({ token: signSession(expiresAt), expiresAt });
});

app.get('/api/admin/check', (req, res) => {
  res.json({ valid: verifySession(req.headers['x-admin-token']) });
});

// كل عمليات الكتابة لازم توكن جلسة صالح (أو المفتاح الرئيسي للسكربتات)
function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (typeof token === 'string' && token.length > 0) {
    const a = Buffer.from(token);
    const b = Buffer.from(ADMIN_TOKEN);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  }
  if (verifySession(token)) return next();
  return res.status(401).json({ error: 'غير مصرح — سجّل دخول الأول' });
}

// Validation helpers
function validateFile(data) {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    return 'اسم الملف مطلوب (2 أحرف على الأقل)';
  }
  if (data.name.length > 100) return 'اسم الملف طويل جداً (100 حرف كحد أقصى)';
  return null;
}

// رابط الفيديو: إما رابط كامل (http/https) أو مسار نسبي من السيرفر (/uploads/x.mp4)
function isValidVideoUrl(u) {
  if (typeof u !== 'string' || !u.trim()) return false;
  const v = u.trim();
  if (v.startsWith('/')) return true;
  if (v.startsWith('b2://')) return true; // فيديو على السحابة
  try { new URL(v); return true; } catch { return false; }
}

function validateVideo(data) {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 2) {
    return 'عنوان الفيديو مطلوب (2 أحرف على الأقل)';
  }
  if (data.title.length > 200) return 'عنوان الفيديو طويل جداً (200 حرف كحد أقصى)';
  if (!isValidVideoUrl(data.url)) return 'رابط الفيديو مطلوب (رابط كامل أو مسار /uploads/...)';
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
app.get('/api/videos', async (req, res) => {
  const { page = 1, limit = 20, fileId } = req.query;
  let result = [...videos];
  if (fileId) result = result.filter(v => v.fileId === Number(fileId));
  result.sort((a, b) => b.id - a.id);
  const start = (Number(page) - 1) * Number(limit);
  const paginated = result.slice(start, start + Number(limit));

  // الفيديوهات على B2 (دلو خاص) → نولّد رابط مؤقت لكل واحد
  const withPlay = await Promise.all(paginated.map(async (v) => {
    const key = b2KeyFromUrl(v.url);
    if (key) {
      try {
        const playUrl = await presignB2(key);
        return { ...v, playUrl, storage: 'b2' };
      } catch (e) {
        console.error('تعذر توليد رابط مؤقت للفيديو ' + v.id + ':', e.message);
        return { ...v, playUrl: null, storage: 'b2' };
      }
    }
    return { ...v, storage: 'local' };
  }));

  res.json({
    data: withPlay,
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

app.delete('/api/videos/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const index = videos.findIndex(v => v.id === id);
  if (index === -1) return res.status(404).json({ error: 'الفيديو غير موجود' });
  const removed = videos.splice(index, 1)[0];

  let fileDeleted = false;
  const u = String(removed.url || '');

  // ⚠️ نتأكد إن مفيش فيديو تاني بيستخدم نفس الملف قبل ما نمسحه
  const stillUsed = videos.some(v => String(v.url || '') === u);

  // 1) ملف على السحابة (B2)
  if (!stillUsed && s3 && b2KeyFromUrl(u)) {
    try {
      fileDeleted = await deleteFromB2(u);
    } catch (e) {
      console.error('تعذر مسح الملف من B2:', e.message);
    }
  }
  // 2) ملف على القرص المحلي
  else if (!stillUsed && u.startsWith('/uploads/')) {
    try {
      const uploadsDir = UPLOADS_DIR;
      const fp = path.resolve(path.join(DATA_DIR, u.replace(/^\/+/, '')));
      if (fp.startsWith(uploadsDir) && fs.existsSync(fp)) {
        fs.unlinkSync(fp);
        fileDeleted = true;
      }
    } catch (e) {
      console.error('تعذر مسح ملف الفيديو:', e.message);
    }
  }

  files.forEach(f => { f.count = videos.filter(v => v.fileId === f.id).length; });
  saveData();
  res.json({ success: true, fileDeleted, fileKept: stillUsed });
});

// ============ التحميلات (لكل جهاز) ============
app.get('/api/downloads', (req, res) => {
  const d = String(req.query.deviceId || '');
  if (!d) return res.status(400).json({ error: 'deviceId مطلوب' });
  res.json({ data: downloads.filter(x => x.deviceId === d) });
});

app.post('/api/download', (req, res) => {
  const { deviceId, videoId, title, size } = req.body || {};
  if (!deviceId || !videoId) return res.status(400).json({ error: 'deviceId و videoId مطلوبين' });
  const did = String(deviceId);
  const vid = String(videoId);
  const existing = downloads.find(x => x.deviceId === did && String(x.videoId) === vid);
  if (existing) {
    existing.title = String(title || existing.title);
    existing.size = Number(size || existing.size);
    existing.updatedAt = Date.now();
    saveData();
    return res.json({ success: true, data: existing });
  }
  const item = { id: Date.now(), deviceId: did, videoId: Number(videoId), title: String(title || ''), size: Number(size || 0), createdAt: Date.now() };
  downloads.push(item);
  saveData();
  res.json({ success: true, data: item });
});

app.delete('/api/download/:id', (req, res) => {
  const d = String(req.query.deviceId || '');
  const id = Number(req.params.id);
  const index = downloads.findIndex(x => x.id === id && (!d || x.deviceId === d));
  if (index === -1) return res.status(404).json({ error: 'التحميل غير موجود' });
  downloads.splice(index, 1);
  saveData();
  res.json({ success: true });
});

// ============ أكواد الاشتراك ============
// توليد كود جديد (من لوحة التحكم)
app.post('/api/admin/codes', requireAuth, (req, res) => {
  const { code, plan, maxUses } = req.body || {};
  if (!code || typeof code !== 'string' || code.trim().length < 4) {
    return res.status(400).json({ error: 'الكود مطلوب (4 حروف على الأقل)' });
  }
  const c = code.trim().toUpperCase();
  if (codes.find(x => x.code === c)) return res.status(409).json({ error: 'الكود موجود بالفعل' });
  codes.push({ code: c, plan: String(plan || 'monthly'), maxUses: Number(maxUses || 0), uses: 0, active: true, createdAt: Date.now() });
  saveData();
  res.json({ success: true });
});

app.get('/api/admin/codes', requireAuth, (req, res) => res.json({ data: codes }));

app.delete('/api/admin/codes/:code', requireAuth, (req, res) => {
  const c = String(req.params.code).toUpperCase();
  const index = codes.findIndex(x => x.code === c);
  if (index === -1) return res.status(404).json({ error: 'الكود غير موجود' });
  codes.splice(index, 1);
  saveData();
  res.json({ success: true });
});

// التحقق من كود (من التطبيق)
app.post('/api/codes/validate', (req, res) => {
  const { code, deviceId } = req.body || {};
  if (!code || !deviceId) return res.status(400).json({ error: 'code و deviceId مطلوبين' });
  const c = String(code).trim().toUpperCase();
  const did = String(deviceId);
  const found = codes.find(x => x.code === c);
  if (!found) return res.json({ valid: false, reason: 'الكود غير صحيح' });
  if (!found.active) return res.json({ valid: false, reason: 'الكود معطّل' });
  if (found.maxUses > 0 && found.uses >= found.maxUses) return res.json({ valid: false, reason: 'الكود استُخدم الحد الأقصى' });
  found.uses += 1;
  users[did] = { plan: found.plan, activatedAt: Date.now(), code: found.code };
  saveData();
  res.json({ valid: true, plan: found.plan });
});

// ============ كشف الفيديوهات المتكررة ============
// بتجمّع حسب: نفس الملف (url) | نفس العنوان | نفس مفتاح B2
app.get('/api/admin/duplicates', requireAuth, (req, res) => {
  const byUrl = {};
  const byTitle = {};
  const byB2 = {};

  videos.forEach((v) => {
    const u = String(v.url || '').trim();
    if (u) (byUrl[u] = byUrl[u] || []).push(v);
    const t = String(v.title || '').trim().toLowerCase();
    if (t) (byTitle[t] = byTitle[t] || []).push(v);
    const k = b2KeyFromUrl(u);
    if (k) (byB2[k] = byB2[k] || []).push(v);
  });

  const dupUrls = Object.values(byUrl).filter((g) => g.length > 1);
  const dupTitles = Object.values(byTitle).filter((g) => g.length > 1);
  const dupB2 = Object.values(byB2).filter((g) => g.length > 1);

  // حساب المساحة المهدرة (الملفات المكررة على B2)
  let wasted = 0;
  dupB2.forEach((g) => {
    // نفس المفتاح مفيش مساحة مهدرة — لكن التكرار في الإدخالات
  });

  res.json({
    byUrl: dupUrls.map((g) => ({ key: g[0].url, items: g })),
    byTitle: dupTitles.map((g) => ({ key: g[0].title, items: g })),
    byB2: dupB2.map((g) => ({ key: g[0].url, items: g })),
    stats: {
      total: videos.length,
      dupUrlGroups: dupUrls.length,
      dupTitleGroups: dupTitles.length,
      dupB2Groups: dupB2.length,
    },
  });
});

// هل الجهاز مشترك؟
app.get('/api/subscription', (req, res) => {
  const did = String(req.query.deviceId || '');
  if (!did) return res.json({ subscribed: false });
  res.json({ subscribed: !!users[did], plan: (users[did] && users[did].plan) || null });
});

// ============ الإعدادات العامة (رابط الإعلان  etc) ============
app.get('/api/config', (req, res) => {
  res.json({ adUrl: String((config && config.adUrl) || '') });
});

app.post('/api/config', requireAuth, (req, res) => {
  const { adUrl } = req.body || {};
  config.adUrl = String(adUrl || '');
  saveData();
  res.json({ success: true, adUrl: config.adUrl });
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
    const uploadDir = UPLOADS_DIR;
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

// ============ التخزين السحابي (Backblaze B2) ============
const B2_KEY_ID = process.env.B2_KEY_ID || '';
const B2_APP_KEY = process.env.B2_APP_KEY || '';
const B2_BUCKET = process.env.B2_BUCKET || '';
const B2_ENDPOINT = process.env.B2_ENDPOINT || '';
const B2_PUBLIC_URL = (process.env.B2_PUBLIC_URL || '').replace(/\/+$/, '');
const B2_PREFIX = process.env.B2_PREFIX || 'videos/';
const useB2 = !!(B2_KEY_ID && B2_APP_KEY && B2_BUCKET && B2_ENDPOINT); // B2_PUBLIC_URL مش مطلوب (الدلو خاص)

let s3 = null;
let PutObjectCommand = null;
let DeleteObjectCommand = null;
let GetObjectCommand = null;
let getSignedUrl = null;

const B2_URL_TTL = Number(process.env.B2_URL_TTL || 12 * 60 * 60); // صلاحية الرابط المؤقت: 12 ساعة

if (useB2) {
  try {
    const aws = require('@aws-sdk/client-s3');
    PutObjectCommand = aws.PutObjectCommand;
    DeleteObjectCommand = aws.DeleteObjectCommand;
    GetObjectCommand = aws.GetObjectCommand;
    getSignedUrl = require('@aws-sdk/s3-request-presigner').getSignedUrl;
    s3 = new aws.S3Client({
      region: process.env.B2_REGION || 'auto',
      endpoint: 'https://' + B2_ENDPOINT,
      credentials: { accessKeyId: B2_KEY_ID, secretAccessKey: B2_APP_KEY },
      // ⚠️ B2 محتاج path-style: s3.endpoint.com/bucket/key (مش bucket.s3.endpoint.com/key)
      forcePathStyle: true,
    });
    console.log('☁️  التخزين السحابي (Backblaze B2) مفعّل — الدلو: ' + B2_BUCKET);
    console.log('⏰ روابط الفيديو مؤقتة — صلاحيتها ' + Math.round(B2_URL_TTL / 3600) + ' ساعة');
  } catch (e) {
    console.error('❌ تعذر تحميل مكتبة التخزين السحابي:', e.message);
    s3 = null;
  }
} else {
  console.log('💾 التخزين محلي (B2 مش مضبوط في .env)');
}

// ============ نسخة احتياطية للبيانات على B2 ============
// Render المجاني بيمسح القرص مع كل إعادة تشغيل/نشر → data.json بيضيع
// الحل: نحفظ نسخة على B2 ونسترجعها لو الملف المحلي مش موجود
const DATA_BACKUP_KEY = process.env.DATA_BACKUP_KEY || 'data/backup.json';

if (useB2 && s3 && PutObjectCommand && GetObjectCommand) {
  let lastPersist = 0;
  let pendingTimer = null;

  persistToCloud = (payload) => {
    // تجميع الكتابات السريعة — بدل رفع مع كل ضغطة
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      lastPersist = Date.now();
      s3.send(new PutObjectCommand({
        Bucket: B2_BUCKET,
        Key: DATA_BACKUP_KEY,
        Body: payload,
        ContentType: 'application/json',
      })).catch((e) => console.error('⚠️  فشل حفظ النسخة على B2:', e.message));
    }, 1200);
  };

  // استرجاع عند بدء التشغيل لو مفيش ملف محلي
  (async () => {
    if (fs.existsSync(DATA_FILE)) {
      console.log('📂 data.json موجود محلياً — مش محتاج استرجاع');
      return;
    }
    try {
      const r = await s3.send(new GetObjectCommand({ Bucket: B2_BUCKET, Key: DATA_BACKUP_KEY }));
      const body = await r.Body.transformToString();
      const d = JSON.parse(body);
      users = d.users || {};
      files = d.files || [];
      videos = d.videos || [];
      requests = d.requests || [];
      codes = d.codes || [];
      downloads = d.downloads || [];
      config = d.config || {};
      analytics = d.analytics || { totalViews: 0, videosWatched: 0, dailyUsers: [] };
      fs.writeFileSync(DATA_FILE, body);
      console.log('♻️  تم استرجاع البيانات من B2 — ملفات:', files.length, '| فيديوهات:', videos.length);
    } catch (e) {
      console.log('ℹ️  مفيش نسخة على B2 — بداية جديدة فاضية');
    }
  })();
} else {
  console.log('ℹ️  نسخة B2 غير مفعّلة — البيانات محلية بس (هتضيع على Render)');
}

// بنخزّن الفيديوهات على B2 بالشكل: b2://videos/xxx.mp4
// (الدلو Private فبنولّد رابط مؤقت وقت الطلب — مفيش رابط دائم يتشارك)
function b2KeyFromUrl(u) {
  const s = String(u || '');
  if (s.indexOf('b2://') === 0) {
    try { return decodeURIComponent(s.slice(5)); } catch (e) { return s.slice(5); }
  }
  if (B2_PUBLIC_URL && s.indexOf(B2_PUBLIC_URL) === 0) return s.slice(B2_PUBLIC_URL.length).replace(/^\/+/, '');
  return null;
}

async function presignB2(key, expiresIn) {
  if (!s3 || !getSignedUrl) return null;
  return await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: B2_BUCKET, Key: key }),
    { expiresIn: expiresIn || B2_URL_TTL }
  );
}

async function uploadToB2(localPath, filename, mimetype) {
  if (!s3) throw new Error('B2 مش مفعّل');
  const key = B2_PREFIX + filename;
  await s3.send(new PutObjectCommand({
    Bucket: B2_BUCKET,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentType: mimetype || 'video/mp4',
  }));
  return { key, url: 'b2://' + key };
}

async function deleteFromB2(url) {
  if (!s3) return false;
  const key = b2KeyFromUrl(url);
  if (!key) return false;
  await s3.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
  return true;
}

app.post('/api/upload', requireAuth, upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع ملف' });

  if (s3) {
    try {
      const out = await uploadToB2(req.file.path, req.file.filename, req.file.mimetype);
      try { fs.unlinkSync(req.file.path); } catch (e) { /* تجاهل */ }
      return res.json({ success: true, url: out.url, filename: req.file.filename, storage: 'b2' });
    } catch (e) {
      console.error('فشل الرفع على B2، هنرجع للتخزين المحلي:', e.message);
    }
  }

  const videoUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: videoUrl, filename: req.file.filename, storage: 'local' });
});

// ===== صورة بنر التطبيق =====
const BANNER_FILE = path.join(__dirname, 'public', 'banner.jpg');
const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'];
    if (ok.includes(file.mimetype)) cb(null, true);
    else cb(new Error('نوع الصورة غير مدعوم. المسموح: jpg, png, webp'));
  },
});

let sharp = null;
try { sharp = require('sharp'); } catch (e) { console.warn('sharp غير متاح — هنحفظ الصورة كما هي'); }

app.post('/api/banner', requireAuth, bannerUpload.single('banner'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع صورة' });
  try {
    if (sharp) {
      await sharp(req.file.buffer)
        .resize(1400, 788, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 88 })
        .toFile(BANNER_FILE);
    } else {
      fs.writeFileSync(BANNER_FILE, req.file.buffer);
    }
    res.json({ success: true, url: '/banner.jpg?v=' + Date.now() });
  } catch (e) {
    console.error('banner error:', e);
    res.status(500).json({ error: 'تعذر معالجة الصورة' });
  }
});

// معلومات البانر الحالي
app.get('/api/banner', (req, res) => {
  const exists = fs.existsSync(BANNER_FILE);
  res.json({
    exists,
    url: exists ? '/banner.jpg?v=' + fs.statSync(BANNER_FILE).mtimeMs : null,
    size: exists ? fs.statSync(BANNER_FILE).size : 0,
  });
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

// الاستماع على IPv4 و IPv6 معاً — عشان localhost ميحاولش IPv6 ويستنى
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}`);
});

server.on('error', (e) => {
  if (e.code === 'EAFNOSUPPORT' || e.code === 'EADDRNOTAVAIL' || e.code === 'EADDRINUSE') {
    console.warn('تعذر التشغيل المزدوج (' + e.code + ') — هنشتغل على IPv4 بس');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (IPv4 only)`);
      console.log(`Admin panel: http://localhost:${PORT}`);
    });
  } else {
    console.error('خطأ في تشغيل السيرفر:', e.message);
  }
});
