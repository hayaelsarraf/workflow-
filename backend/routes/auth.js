const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize, requireAdmin } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User Registration
router.post('/register', [
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required'),
  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { first_name, last_name, email, password, role = 'member' } = req.body;
    const userModel = new User(req.db);

    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email address' 
      });
    }

    const userId = await userModel.create({ 
      first_name, 
      last_name, 
      email, 
      password, 
      role 
    });

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        first_name,
        last_name,
        email,
        role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error. Please try again later.' 
    });
  }
});

// User Login
router.post('/login', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const userModel = new User(req.db);

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await userModel.validatePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Forgot Password
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid email address',
        details: errors.array() 
      });
    }

    const { email } = req.body;
    const userModel = new User(req.db);

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.json({ 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await req.db.execute(
      'DELETE FROM password_reset_tokens WHERE user_id = ?', 
      [user.id]
    );

    await req.db.execute(
      'INSERT INTO password_reset_tokens (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, email, hashedToken, expiresAt]
    );

    await sendPasswordResetEmail(email, resetToken, user.first_name);

    res.json({ 
      message: 'If an account with that email exists, we have sent a password reset link.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      error: 'Unable to process password reset request. Please try again.' 
    });
  }
});

// Reset Password
router.post('/reset-password/:token', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Invalid password format',
        details: errors.array() 
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [tokenResults] = await req.db.execute(
      `SELECT rt.*, u.id as user_id, u.email, u.first_name 
       FROM password_reset_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token = ? AND rt.expires_at > NOW() AND rt.used = false`,
      [hashedToken]
    );

    if (tokenResults.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token' 
      });
    }

    const resetRecord = tokenResults[0];
    const hashedPassword = await bcrypt.hash(password, 12);

    await req.db.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, resetRecord.user_id]
    );

    await req.db.execute(
      'UPDATE password_reset_tokens SET used = true WHERE id = ?',
      [resetRecord.id]
    );

    res.json({ 
      message: 'Password reset successful! You can now log in with your new password.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      error: 'Unable to reset password. Please try again.' 
    });
  }
});

// Verify Reset Token
router.get('/reset-password/:token/verify', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [tokenResults] = await req.db.execute(
      `SELECT rt.expires_at, u.email, u.first_name 
       FROM password_reset_tokens rt 
       JOIN users u ON rt.user_id = u.id 
       WHERE rt.token = ? AND rt.expires_at > NOW() AND rt.used = false`,
      [hashedToken]
    );

    if (tokenResults.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        valid: false 
      });
    }

    res.json({ 
      valid: true,
      email: tokenResults[0].email,
      firstName: tokenResults[0].first_name
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Unable to verify token',
      valid: false 
    });
  }
});

// Update user profile (protected route)
router.put('/profile', authenticate, [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { first_name, last_name, email } = req.body;
    const userId = req.user.id;

    const [existingUser] = await req.db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?', 
      [email, userId]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email is already taken' });
    }

    await req.db.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE id = ?',
      [first_name, last_name, email, userId]
    );

    const [updatedUser] = await req.db.execute(
      'SELECT id, first_name, last_name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({ user: updatedUser[0] });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin only route example
router.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const [users] = await req.db.execute(
      'SELECT id, first_name, last_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
