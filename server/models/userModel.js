// server/models/userModel.js
// Data access layer for users — backed by JSON today, swappable to MongoDB.

const fs   = require('fs');
const path = require('path');
const { dataDir } = require('../config/config');

const FILE = path.join(dataDir, 'users.json');

/** Read all users from disk */
function readAll() {
  const raw = fs.readFileSync(FILE, 'utf8');
  return JSON.parse(raw);
}

/** Write users array to disk */
function writeAll(users) {
  fs.writeFileSync(FILE, JSON.stringify(users, null, 2));
}

/** Find a single user by field/value */
function findOne(field, value) {
  return readAll().find(u => u[field] === value) || null;
}

/** Find a user by ID */
function findById(id) {
  return findOne('id', id);
}

/** Find a user by email */
function findByEmail(email) {
  return findOne('email', email.toLowerCase());
}

/** Create and persist a new user */
function create({ id, name, email, passwordHash }) {
  const users = readAll();
  const user = {
    id,
    name,
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeAll(users);
  return user;
}

/** Return a safe public version of a user (no passwordHash) */
function toPublic(user) {
  const { passwordHash, ...pub } = user;
  return pub;
}

module.exports = { findById, findByEmail, create, toPublic };
