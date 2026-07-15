// server/controllers/authController.js

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const userModel = require('../models/userModel');
const { jwtSecret, jwtExpiresIn } = require('../config/config');

/** Sign a JWT for a user */
function signToken(userId) {
  return jwt.sign({ id: userId }, jwtSecret, { expiresIn: jwtExpiresIn });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (userModel.findByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = userModel.create({ id: uuidv4(), name, email, passwordHash });

    const token = signToken(user.id);
    res.status(201).json({ token, user: userModel.toPublic(user) });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id);
    res.json({ token, user: userModel.toPublic(user) });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

// GET /api/auth/me  (protected)
function me(req, res) {
  const user = require('../models/userModel').findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: userModel.toPublic(user) });
}

module.exports = { register, login, me };
