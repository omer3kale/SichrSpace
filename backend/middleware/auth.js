const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware for Express.
 * Checks for a valid JWT in the Authorization header.
 * Attaches the user object to req.user if valid.
 */
module.exports = async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ error: 'No token provided' });

    // Expecting header format: "Bearer <token>"
    const token = authHeader.split(' ')[1];
    if (!token)
      return res.status(401).json({ error: 'Malformed token' });

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ error: 'User not found' });

    // Optionally, check if user is blocked
    if (user.blocked)
      return res.status(403).json({ error: 'User is blocked' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};