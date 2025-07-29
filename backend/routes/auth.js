const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user or admin
 * @access  Public
 */
router.post(
  '/register',
  [
    body('username')
      .isLength({ min: 3, max: 32 })
      .withMessage('Username must be 3-32 characters.')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores.'),
    body('email')
      .isEmail()
      .withMessage('Invalid email address.'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter.')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter.')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number.')
      .matches(/[^a-zA-Z0-9]/)
      .withMessage('Password must contain at least one special character.'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be either user or admin.')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next({ status: 400, errors: errors.array() });
      }

      const { username, email, password, role } = req.body;

      // Check if user or email already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return next({ status: 409, message: 'Username or email already exists.' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword,
        role: role === 'admin' ? 'admin' : 'user'
      });
      await user.save();

      // Issue JWT
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: 'Registration successful.',
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT
 * @access  Public
 */
router.post(
  '/login',
  [
    body('emailOrUsername')
      .notEmpty()
      .withMessage('Email or username is required.'),
    body('password')
      .notEmpty()
      .withMessage('Password is required.')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next({ status: 400, errors: errors.array() });
      }

      const { emailOrUsername, password } = req.body;

      // Find user by email or username
      const user = await User.findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
      });
      if (!user) {
        return next({ status: 401, message: 'Invalid credentials.' });
      }

      // Account lockout check
      if (user.isLocked && user.isLocked()) {
        return next({
          status: 423,
          message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.'
        });
      }

      if (user.blocked) {
        return next({ status: 403, message: 'User is blocked.' });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        // Increment failed login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        // Lock account for 15 minutes after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          await user.save();
          return next({
            status: 423,
            message: 'Account locked for 15 minutes due to too many failed login attempts.'
          });
        }
        await user.save();
        return next({ status: 401, message: 'Invalid credentials.' });
      }

      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      // Issue JWT
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: 'Login successful.',
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role }
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;