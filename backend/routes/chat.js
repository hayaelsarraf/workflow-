const express = require('express');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');

const router = express.Router();

// Get recent conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const chatModel = new Chat(req.db);
    const conversations = await chatModel.getRecentConversations(req.user.id);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get conversation with specific user
router.get('/conversation/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const chatModel = new Chat(req.db);
    const messages = await chatModel.getConversation(
      req.user.id, 
      parseInt(userId), 
      parseInt(limit), 
      parseInt(offset)
    );

    // Mark messages as read
    await chatModel.markAsRead(req.user.id, parseInt(userId));

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Send a message
// Send a message - ENHANCED with user info
router.post('/send', authenticate, async (req, res) => {
  try {
    const { recipient_id, message_text, message_type = 'text' } = req.body;

    if (!recipient_id || !message_text?.trim()) {
      return res.status(400).json({ error: 'Recipient and message are required' });
    }

    // Verify recipient exists and get their info
    const userModel = new User(req.db);
    const recipient = await userModel.findById(recipient_id);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const chatModel = new Chat(req.db);
    const message = await chatModel.sendMessage({
      sender_id: req.user.id,
      recipient_id: parseInt(recipient_id),
      message_text: message_text.trim(),
      message_type
    });

    // ✅ ENHANCED: Add user info to socket messages
    const enhancedMessage = {
      ...message,
      sender_first_name: req.user.first_name,
      sender_last_name: req.user.last_name,
      sender_email: req.user.email,
      recipient_first_name: recipient.first_name,
      recipient_last_name: recipient.last_name,
      recipient_email: recipient.email
    };

    // Emit to Socket.IO if available
    if (req.app.get('io')) {
      req.app.get('io').to(`user_${recipient_id}`).emit('new_message', enhancedMessage);
      req.app.get('io').to(`user_${req.user.id}`).emit('message_sent', enhancedMessage);
    }

    res.status(201).json({
      success: true,
      message: enhancedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});


// Send message with file attachment
router.post('/send-file', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { recipient_id, message_text = '' } = req.body;

    if (!recipient_id || !req.file) {
      return res.status(400).json({ error: 'Recipient and file are required' });
    }

    const chatModel = new Chat(req.db);
    const message = await chatModel.sendMessage({
      sender_id: req.user.id,
      recipient_id: parseInt(recipient_id),
      message_text: message_text.trim() || `Sent a file: ${req.file.originalname}`,
      message_type: 'file',
      attachment_path: req.file.path,
      attachment_name: req.file.originalname
    });

    // Emit to Socket.IO if available
    if (req.app.get('io')) {
      req.app.get('io').to(`user_${recipient_id}`).emit('new_message', message);
      req.app.get('io').to(`user_${req.user.id}`).emit('message_sent', message);
    }

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Send file message error:', error);
    res.status(500).json({ error: 'Failed to send file message' });
  }
});

// Get all users for chat (colleagues)
router.get('/users', authenticate, async (req, res) => {
  try {
    const userModel = new User(req.db);
    const [users] = await req.db.execute(
      `SELECT id, first_name, last_name, email, role 
       FROM users 
       WHERE id != ? AND is_active = TRUE
       ORDER BY first_name, last_name`,
      [req.user.id]
    );

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Mark conversation as read
router.put('/mark-read/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const chatModel = new Chat(req.db);
    
    const markedCount = await chatModel.markAsRead(req.user.id, parseInt(userId));

    res.json({
      success: true,
      marked_count: markedCount
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Get unread message count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const chatModel = new Chat(req.db);
    const unreadCount = await chatModel.getUnreadCount(req.user.id);

    res.json({
      success: true,
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Delete a message
router.delete('/message/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const chatModel = new Chat(req.db);
    
    const deleted = await chatModel.deleteMessage(parseInt(messageId), req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;