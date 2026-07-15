// server/middleware/authMiddleware.js
// Verifies JWT on protected routes.

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No token — please log in' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { protect };
