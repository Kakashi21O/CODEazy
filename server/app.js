// server/app.js
// CODEazy — Express entry point

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { port } = require('./config/config');

const authRoutes     = require('./routes/authRoutes');
const courseRoutes   = require('./routes/courseRoutes');
const progressRoutes = require('./routes/progressRoutes');
const teacherRoutes  = require('./routes/teacherRoutes');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Static frontend ───────────────────────────────────────────────────────────
// Serves all HTML / CSS / JS / images from /public
app.use(express.static(path.join(__dirname, '../public')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/courses',  courseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/teachers', teacherRoutes);

// ── SPA fallback — serve index (home) for unknown paths ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home.html'));
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`✅  CODEazy server running → http://localhost:${port}`);
});

module.exports = app;
