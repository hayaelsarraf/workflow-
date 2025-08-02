const express = require('express');
const Announcement = require('../models/Announcement');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Create announcement (managers and admins only)
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if user can create announcements
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only managers and admins can create announcements' });
    }

    const {
      title,
      content,
      announcement_type = 'general',
      course_name,
      course_description,
      course_start_date,
      target_audience = 'all'
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const announcementModel = new Announcement(req.db);
    const announcement = await announcementModel.createAnnouncement({
      sender_id: req.user.id,
      title,
      content,
      announcement_type,
      course_name,
      course_description,
      course_start_date,
      target_audience
    });

    // Emit to Socket.IO for real-time notifications
    if (req.app.get('io')) {
      req.app.get('io').emit('new_announcement', {
        ...announcement,
        for_role: target_audience
      });
    }

    res.status(201).json({
      success: true,
      announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// Get announcements for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const announcementModel = new Announcement(req.db);
    const announcements = await announcementModel.getAnnouncementsForUser(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get my announcements (for managers)
router.get('/my-announcements', authenticate, async (req, res) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const announcementModel = new Announcement(req.db);
    const announcements = await announcementModel.getMyAnnouncements(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      announcements
    });
  } catch (error) {
    console.error('Get my announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Mark announcement as viewed
router.put('/:id/view', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const announcementModel = new Announcement(req.db);
    await announcementModel.markAsViewed(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Announcement marked as viewed'
    });
  } catch (error) {
    console.error('Mark as viewed error:', error);
    res.status(500).json({ error: 'Failed to mark as viewed' });
  }
});

// Show interest in course
router.post('/:id/interest', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { interest_level = 'interested', message = '' } = req.body;

    const announcementModel = new Announcement(req.db);
    const result = await announcementModel.showCourseInterest(
      parseInt(id),
      req.user.id,
      { interest_level, message }
    );

    // Emit to Socket.IO for real-time updates
    if (req.app.get('io')) {
      req.app.get('io').emit('course_interest_updated', {
        announcement_id: parseInt(id),
        user_id: req.user.id,
        user_name: `${req.user.first_name} ${req.user.last_name}`,
        interest_level,
        total_interested: result.total_interested
      });
    }

    res.json({
      success: true,
      message: 'Interest recorded successfully',
      total_interested: result.total_interested
    });
  } catch (error) {
    console.error('Show course interest error:', error);
    res.status(500).json({ error: 'Failed to record interest' });
  }
});

// Get course interests (for managers)
router.get('/:id/interests', authenticate, async (req, res) => {
  try {
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { id } = req.params;

    const announcementModel = new Announcement(req.db);
    const interests = await announcementModel.getCourseInterests(parseInt(id));

    res.json({
      success: true,
      interests
    });
  } catch (error) {
    console.error('Get course interests error:', error);
    res.status(500).json({ error: 'Failed to fetch course interests' });
  }
});

// Delete announcement
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const announcementModel = new Announcement(req.db);
    const deleted = await announcementModel.deleteAnnouncement(parseInt(id), req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Announcement not found or not authorized' });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
