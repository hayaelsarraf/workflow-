const express = require('express');
const Chat = require('../models/Chat');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

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

// Get conversation messages
router.get('/conversation/:otherUserId', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const chatModel = new Chat(req.db);
    const messages = await chatModel.getConversation(req.user.id, otherUserId, limit, offset);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Send message
router.post('/send', authenticate, upload.single('attachment'), async (req, res) => {
  try {
    console.log('📨 Message request body:', req.body);
    
    const recipient_id = req.body.recipient_id;
    const message_text = req.body.message_text;
    const message_type = req.file ? 'file' : 'text';
    
    // Validate required fields
    if (!recipient_id) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }
    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Check if recipient exists and is active
    const [[recipient]] = await req.db.execute(
      'SELECT id, is_active FROM users WHERE id = ?',
      [recipient_id]
    );

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }
    if (!recipient.is_active) {
      return res.status(400).json({ error: 'Cannot send message to inactive user' });
    }

    let attachment_path = null;
    let attachment_name = null;

    if (req.file) {
      attachment_path = req.file.path;
      attachment_name = req.file.originalname;
    }
    
    const chatModel = new Chat(req.db);
    const message = await chatModel.sendMessage({
      sender_id: req.user.id,
      recipient_id,
      message_text: message_text.trim(),
      message_type,
      attachment_path,
      attachment_name
    });
    
    res.json({
      success: true,
      message: {
        ...message,
        sender_first_name: req.user.first_name,
        sender_last_name: req.user.last_name,
        sender_id: req.user.id
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send message',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Mark messages as read
router.put('/mark-read/:otherUserId', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    
    const chatModel = new Chat(req.db);
    await chatModel.markAsRead(req.user.id, otherUserId);
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get users for chat
router.get('/users', authenticate, async (req, res) => {
  try {
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

// Delete message
router.delete('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const chatModel = new Chat(req.db);
    const deleted = await chatModel.deleteMessage(messageId, req.user.id);
    
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