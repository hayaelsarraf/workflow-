const express = require('express');
const Announcement = require('../models/Announcement');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all announcements for the current user (all users can view)
router.get('/', authenticate, async (req, res) => {
  try {
    const announcementModel = new Announcement(req.db);
    const announcements = await announcementModel.getAllForUser(req.user.id, req.user.role);

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get announcement by ID (all users can view)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const announcementModel = new Announcement(req.db);
    const announcement = await announcementModel.getById(parseInt(id));

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('Get announcement error:', error);
    res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// Create new announcement (managers and admins only)
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if user has permission to create announcements
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers and admins can create announcements' });
    }

    const {
      title,
      content,
      announcement_type = 'general',
      course_name,
      course_description,
      course_start_date
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Validate announcement type
    const validTypes = ['general', 'course_enrollment', 'urgent'];
    if (!validTypes.includes(announcement_type)) {
      return res.status(400).json({ error: 'Invalid announcement type' });
    }

    const announcementModel = new Announcement(req.db);
    const announcement = await announcementModel.create({
      sender_id: req.user.id,
      title,
      content,
      announcement_type,
      course_name,
      course_description,
      course_start_date
    });

    res.status(201).json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Update announcement (only the sender can update)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      announcement_type,
      course_name,
      course_description,
      course_start_date,
      target_audience
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcementModel = new Announcement(req.db);
    const announcement = await announcementModel.update(parseInt(id), {
      title,
      content,
      announcement_type,
      course_name,
      course_description,
      course_start_date,
      target_audience
    }, req.user.id);

    res.json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    if (error.message === 'Announcement not found or not authorized') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// Delete announcement (only the sender can delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has permission to delete announcements
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers and admins can delete announcements' });
    }
    
    const announcementModel = new Announcement(req.db);
    
    await announcementModel.delete(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    if (error.message === 'Announcement not found or not authorized') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// Get announcements by sender (for managers to see their own announcements)
router.get('/sender/:senderId', authenticate, async (req, res) => {
  try {
    const { senderId } = req.params;
    
    // Only allow users to see their own announcements or admins to see all
    if (req.user.role !== 'admin' && req.user.id !== parseInt(senderId)) {
      return res.status(403).json({ error: 'Not authorized to view these announcements' });
    }

    const announcementModel = new Announcement(req.db);
    const announcements = await announcementModel.getBySender(parseInt(senderId));

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Get announcements by sender error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

module.exports = router;