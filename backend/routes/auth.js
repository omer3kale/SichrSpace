const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const UserService = require('../services/UserService');
const EmailService = require('../services/emailService');
const router = express.Router();

const emailService = new EmailService();

// Validation middleware
const validateRegistration = [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phone').optional().matches(/^[\+\d\s\-\(\)]+$/).withMessage('Please enter a valid phone number'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['tenant', 'landlord']).withMessage('Role must be either tenant or landlord'),
  body('terms').equals('true').withMessage('You must agree to the terms and conditions')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// User Registration
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, phone, username, password, role } = req.body;

    // Check if user already exists
    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if username is taken
    const existingUsername = await UserService.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerificationToken = jwt.sign(
      { email: email.toLowerCase() },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // Create user with role mapping
    const user = await UserService.create({
      username: username,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone: phone,
      password: hashedPassword,
      role: role, // UserService will handle the mapping
      email_verified: false,
      email_verification_token: emailVerificationToken,
      account_status: 'active'
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, emailVerificationToken);
    } catch (emailError) {
      console.warn('Failed to send verification email:', emailError.message);
    }

    // Get the effective role for response
    const userRole = UserService.getUserRole(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: userRole, // Return original role
        emailVerified: false
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// User Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await UserService.findByEmail(email.toLowerCase());
    if (!user) {
      await UserService.trackFailedLogin(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user can login
    if (!UserService.canUserLogin(user)) {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended or blocked. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await UserService.trackFailedLogin(email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Track successful login
    await UserService.trackSuccessfulLogin(user.id);

    // Get effective role
    const userRole = UserService.getUserRole(user);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: userRole
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: userRole,
        emailVerified: user.email_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
});

// Email Verification
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // Find user and update verification status
    const user = await UserService.findByEmail(decoded.email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.email_verified) {
      return res.status(200).json({
        success: true,
        message: 'Email already verified'
      });
    }

    // Update user verification status
    await UserService.update(user.id, {
      email_verified: true,
      email_verification_token: null
    });

    res.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired verification token'
    });
  }
});

// Password Reset Request
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    const { email } = req.body;
    
    const user = await UserService.findByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '1h' }
    );

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken);
    } catch (emailError) {
      console.warn('Failed to send password reset email:', emailError.message);
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Password Reset
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    
    // Find user
    const user = await UserService.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await UserService.update(user.id, {
      password: hashedPassword
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    const user = await UserService.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.bio || 'user', // Return original role from bio
        emailVerified: user.email_verified,
        accountStatus: user.account_status
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router;