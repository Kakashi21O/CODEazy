// server/controllers/courseController.js

const courseModel = require('../models/courseModel');

// GET /api/courses
function getAllCourses(req, res) {
  res.json(courseModel.findAll());
}

// GET /api/courses/:id
function getCourse(req, res) {
  const course = courseModel.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
}

// GET /api/courses/:id/subjects
function getSubjects(req, res) {
  const subjects = courseModel.findSubjects(req.params.id);
  if (!subjects) return res.status(404).json({ error: 'Course not found' });
  res.json(subjects);
}

// GET /api/courses/subject/:subjectId
function getSubject(req, res) {
  const subject = courseModel.findSubjectById(req.params.subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
}

module.exports = { getAllCourses, getCourse, getSubjects, getSubject };
