// server/routes/teacherRoutes.js

const router  = require('express').Router();
const fs      = require('fs');
const path    = require('path');
const { dataDir } = require('../config/config');

// GET /api/teachers
router.get('/', (req, res) => {
  const raw = fs.readFileSync(path.join(dataDir, 'teachers.json'), 'utf8');
  res.json(JSON.parse(raw));
});

module.exports = router;
