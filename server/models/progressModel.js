// server/models/progressModel.js
// Data access layer for user progress — backed by JSON today, swappable to MongoDB.
// Structure: { [userId]: { [subjectId]: { completedAt: ISO string } } }

const fs   = require('fs');
const path = require('path');
const { dataDir } = require('../config/config');

const FILE = path.join(dataDir, 'progress.json');

/** Read the full progress store */
function readAll() {
  const raw = fs.readFileSync(FILE, 'utf8');
  return JSON.parse(raw);
}

/** Persist the full progress store */
function writeAll(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

/** Get all completed subject IDs for a user */
function getForUser(userId) {
  const data = readAll();
  return data[userId] || {};
}

/** Mark a subject as complete for a user */
function markComplete(userId, subjectId) {
  const data = readAll();
  if (!data[userId]) data[userId] = {};
  data[userId][subjectId] = { completedAt: new Date().toISOString() };
  writeAll(data);
  return data[userId][subjectId];
}

/** Unmark a subject (toggle) */
function markIncomplete(userId, subjectId) {
  const data = readAll();
  if (data[userId]) {
    delete data[userId][subjectId];
    writeAll(data);
  }
}

module.exports = { getForUser, markComplete, markIncomplete };
