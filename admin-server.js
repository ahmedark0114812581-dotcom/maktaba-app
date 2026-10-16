const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    const initial = {
      files: [
        { id: 1, name: 'ملف 1', count: 546 },
        { id: 2, name: 'ملف 2', count: 8 },
        { id: 3, name: 'ملف 3', count: 115 },
      ],
      videos: [
        { id: 1, title: 'فيديو 1', views: 546, duration: '15:30', fileId: 1 },
        { id: 2, title: 'فيديو 2', views: 8, duration: '12:45', fileId: 1 },
      ],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
}

let db = loadData();

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/api/files', (req, res) => res.json(db.files));
app.post('/api/files', (req, res) => {
  db.files.push({ ...req.body, id: Date.now() });
  saveData();
  res.json(db.files);
});
app.delete('/api/files/:id', (req, res) => {
  db.files = db.files.filter(f => f.id !== Number(req.params.id));
  db.videos = db.videos.filter(v => v.fileId !== Number(req.params.id));
  saveData();
  res.json(db.files);
});

app.get('/api/videos', (req, res) => res.json(db.videos));
app.post('/api/videos', (req, res) => {
  db.videos.push({ ...req.body, id: Date.now() });
  saveData();
  res.json(db.videos);
});
app.patch('/api/videos/:id', (req, res) => {
  const idx = db.videos.findIndex(v => v.id === Number(req.params.id));
  if (idx !== -1) db.videos[idx] = { ...db.videos[idx], ...req.body };
  saveData();
  res.json(db.videos);
});
app.delete('/api/videos/:id', (req, res) => {
  db.videos = db.videos.filter(v => v.id !== Number(req.params.id));
  saveData();
  res.json(db.videos);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin panel: http://localhost:${PORT}`);
  console.log(`On phone: http://<your-ip>:${PORT}`);
});
