// server/controllers/progressController.js

const progressModel = require('../models/progressModel');
const courseModel   = require('../models/courseModel');

// GET /api/progress  — full progress for logged-in user, enriched with course metadata
function getProgress(req, res) {
  const completed = progressModel.getForUser(req.userId);
  const courses   = courseModel.findAll(); // lightweight (no notes content)

  // Build per-course progress stats
  const summary = courses.map(course => {
    const full = courseModel.findById(course.id);
    const totalSubjects = full.subjects.length;
    const completedSubjects = full.subjects.filter(s => !!completed[s.id]).length;
    return {
      courseId: course.id,
      courseTitle: course.title,
      icon: course.icon,
      totalSubjects,
      completedSubjects,
      percent: Math.round((completedSubjects / totalSubjects) * 100),
    };
  });

  res.json({ completed, summary });
}

// POST /api/progress/:subjectId — mark complete
function markComplete(req, res) {
  const result = progressModel.markComplete(req.userId, req.params.subjectId);
  res.json({ subjectId: req.params.subjectId, ...result });
}

// DELETE /api/progress/:subjectId — mark incomplete
function markIncomplete(req, res) {
  progressModel.markIncomplete(req.userId, req.params.subjectId);
  res.json({ subjectId: req.params.subjectId, status: 'removed' });
}

module.exports = { getProgress, markComplete, markIncomplete };
