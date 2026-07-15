// server/models/courseModel.js
// Data access layer for courses — backed by JSON today, swappable to MongoDB.

const fs   = require('fs');
const path = require('path');
const { dataDir } = require('../config/config');

const FILE = path.join(dataDir, 'courses.json');

/** Read all courses from disk */
function readAll() {
  const raw = fs.readFileSync(FILE, 'utf8');
  return JSON.parse(raw);
}

/** Return all courses (without subjects content to keep list lightweight) */
function findAll() {
  return readAll().map(({ subjects, ...meta }) => ({
    ...meta,
    subjectCount: subjects.length,
  }));
}

/** Return a single course (with subjects) by ID */
function findById(id) {
  return readAll().find(c => c.id === id) || null;
}

/** Return subjects of a course by courseId */
function findSubjects(courseId) {
  const course = findById(courseId);
  return course ? course.subjects : null;
}

/** Return a single subject across all courses */
function findSubjectById(subjectId) {
  const courses = readAll();
  for (const course of courses) {
    const subject = course.subjects.find(s => s.id === subjectId);
    if (subject) return { ...subject, courseId: course.id, courseTitle: course.title };
  }
  return null;
}

module.exports = { findAll, findById, findSubjects, findSubjectById };
