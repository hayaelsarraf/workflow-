const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Verify reset token endpoint
router.get('/reset-password/:token/verify', async (req, res) => {
  try {
    const { token } = req.params;

    // Check if token exists and is not expired
    const [resetTokens] = await req.db.execute(
      'SELECT t.*, u.first_name, u.last_name, u.email FROM password_reset_tokens t ' +
      'JOIN users u ON t.user_id = u.id ' +
      'WHERE t.token = ? AND t.expires_at > NOW() AND t.used = 0',
      [token]
    );

    if (!resetTokens || resetTokens.length === 0) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid or expired reset token' 
      });
    }

    const resetToken = resetTokens[0];

    res.json({
      valid: true,
      user_id: resetToken.user_id,
      first_name: resetToken.first_name,
      last_name: resetToken.last_name,
      email: resetToken.email,
      expires_at: resetToken.expires_at
    });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Failed to verify reset token' 
    });
  }
});

// Reset password endpoint
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
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    // Begin transaction
    const connection = await req.db.getConnection();
    await connection.beginTransaction();

    try {
      // Check if token exists and is not expired
      const [resetTokens] = await connection.execute(
        'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > NOW() AND used = 0 FOR UPDATE',
        [token]
      );

      if (!resetTokens || resetTokens.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const resetToken = resetTokens[0];

      // Get user information
      const [users] = await connection.execute(
        'SELECT id, email FROM users WHERE id = ? FOR UPDATE',
        [resetToken.user_id]
      );

      if (!users || users.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'User not found' });
      }

      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Update user's password
      await connection.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, resetToken.user_id]
      );

      // Mark token as used
      await connection.execute(
        'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
        [resetToken.id]
      );

      // Commit transaction
      await connection.commit();

      res.json({ 
        message: 'Password reset successful',
        email: users[0].email 
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
