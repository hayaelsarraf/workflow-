const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const ChatGroup = require('../models/ChatGroup');

const router = express.Router();

// Get all user groups
router.get('/', authenticate, async (req, res) => {
  try {
    const chatGroup = new ChatGroup(req.db);
    const groups = await chatGroup.getUserGroups(req.user.id);
    res.json({ success: true, groups });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Send group message
router.post('/:groupId/send', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { message_text, message_type = 'text', attachment_path = null } = req.body;
    
    const chatGroup = new ChatGroup(req.db);
    
    // Verify user is a member
    const groups = await chatGroup.getUserGroups(req.user.id);
    const isMember = groups.some(g => g.id === parseInt(groupId));
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const message = await chatGroup.sendGroupMessage(groupId, req.user.id, {
      message_text,
      message_type,
      attachment_path
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get group messages
router.get('/:groupId/messages', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const chatGroup = new ChatGroup(req.db);
    
    // Verify user is a member
    const groups = await chatGroup.getUserGroups(req.user.id);
    const isMember = groups.some(g => g.id === parseInt(groupId));
    
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    const messages = await chatGroup.getGroupMessages(groupId, limit, offset);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Failed to fetch group messages' });
  }
});

// Create a new chat group (manager only)
router.post('/', [
  authenticate,
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('description').optional().trim(),
  body('members').optional().isArray().withMessage('Members must be an array of user IDs')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only managers can create groups
    if (req.user.role !== 'manager' && req.user.role !== 'member') {
      return res.status(403).json({ error: 'Only managers can create chat groups' });
    }

    const { name, description, members = [] } = req.body;
    const chatGroup = new ChatGroup(req.db);

    // Create the group
    const groupId = await chatGroup.create(req.user.id, name, description);

    // Add members if provided
    if (members.length > 0) {
      const allMembers = Array.from(new Set([...members]));
      await chatGroup.addMembers(groupId, allMembers);
    }

    // Get the created group with members
    const groups = await chatGroup.getUserGroups(req.user.id);
    const createdGroup = groups.find(g => g.id === groupId);

    res.status(201).json({ 
      message: 'Chat group created successfully',
      group: createdGroup
    });
  } catch (error) {
    console.error('Create chat group error:', error);
    res.status(500).json({ error: 'Failed to create chat group' });
  }
});

// Get all groups for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const chatGroup = new ChatGroup(req.db);
    const groups = await chatGroup.getUserGroups(req.user.id);
    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to get chat groups' });
  }
});

// Add members to group (manager only)
router.post('/:groupId/members', [
  authenticate,
  body('members').isArray().withMessage('Members must be an array of user IDs')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { members } = req.body;
    const chatGroup = new ChatGroup(req.db);

    // Verify user is group manager
    const isManager = await chatGroup.isGroupManager(groupId, req.user.id);
    if (!isManager) {
      return res.status(403).json({ error: 'Only group manager can add members' });
    }

    await chatGroup.addMembers(groupId, members);
    const updatedGroup = (await chatGroup.getUserGroups(req.user.id))
      .find(g => g.id === parseInt(groupId));

    res.json({ 
      message: 'Members added successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// Remove members from group (manager only)
router.delete('/:groupId/members', [
  authenticate,
  body('members').isArray().withMessage('Members must be an array of user IDs')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { members } = req.body;
    const chatGroup = new ChatGroup(req.db);

    // Verify user is group manager
    const isManager = await chatGroup.isGroupManager(groupId, req.user.id);
    if (!isManager) {
      return res.status(403).json({ error: 'Only group manager can remove members' });
    }

    await chatGroup.removeMembers(groupId, members);
    const updatedGroup = (await chatGroup.getUserGroups(req.user.id))
      .find(g => g.id === parseInt(groupId));

    res.json({ 
      message: 'Members removed successfully',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Remove members error:', error);
    res.status(500).json({ error: 'Failed to remove members' });
  }
});

// Get group messages
router.get('/:groupId/messages', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const chatGroup = new ChatGroup(req.db);

    const messages = await chatGroup.getGroupMessages(groupId, req.user.id, limit, offset);
    res.json({ messages });
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: 'Failed to get group messages' });
  }
});

// Send message to group
router.post('/:groupId/messages', [
  authenticate,
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('messageType').optional().isIn(['text', 'file']).withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { message, messageType = 'text' } = req.body;
    const chatGroup = new ChatGroup(req.db);

    const messageId = await chatGroup.sendGroupMessage(
      groupId,
      req.user.id,
      message,
      messageType
    );

    const [newMessage] = await chatGroup.getGroupMessages(groupId, 1, 0);
    res.json({ 
      message: 'Message sent successfully',
      messageDetails: newMessage
    });
  } catch (error) {
    console.error('Send group message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Close group (manager only)
router.post('/:groupId/close', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const chatGroup = new ChatGroup(req.db);

    const closed = await chatGroup.closeGroup(groupId, req.user.id);
    if (!closed) {
      return res.status(403).json({ error: 'Only group manager can close the group' });
    }

    res.json({ message: 'Group closed successfully' });
  } catch (error) {
    console.error('Close group error:', error);
    res.status(500).json({ error: 'Failed to close group' });
  }
});

// Reopen group (manager only)
router.post('/:groupId/reopen', authenticate, async (req, res) => {
  try {
    const { groupId } = req.params;
    const chatGroup = new ChatGroup(req.db);

    const reopened = await chatGroup.reopenGroup(groupId, req.user.id);
    if (!reopened) {
      return res.status(403).json({ error: 'Only group manager can reopen the group' });
    }

    res.json({ message: 'Group reopened successfully' });
  } catch (error) {
    console.error('Reopen group error:', error);
    res.status(500).json({ error: 'Failed to reopen group' });
  }
});

module.exports = router;
