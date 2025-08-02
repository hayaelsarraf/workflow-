const express = require('express');
const Chat = require('../models/Chat');
const { authenticate } = require('../middleware/auth');

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
router.post('/send', authenticate, async (req, res) => {
  try {
    const { recipient_id, message_text, message_type = 'text' } = req.body;
    
    const chatModel = new Chat(req.db);
    const message = await chatModel.sendMessage({
      sender_id: req.user.id,
      recipient_id,
      message_text,
      message_type
    });
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
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