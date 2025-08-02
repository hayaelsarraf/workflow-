const express = require('express');
const CourseInterest = require('../models/CourseInterest');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Add/Update interest in a course
router.post('/', authenticate, async (req, res) => {
  try {
    const { announcement_id, interest_level, message } = req.body;

    if (!announcement_id) {
      return res.status(400).json({ error: 'Announcement ID is required' });
    }

    const courseInterestModel = new CourseInterest(req.db);
    const result = await courseInterestModel.addInterest({
      announcement_id: parseInt(announcement_id),
      user_id: req.user.id,
      interest_level: interest_level || 'interested',
      message: message || null
    });

    res.json({
      success: true,
      message: 'Interest expressed successfully'
    });
  } catch (error) {
    console.error('Add interest error:', error);
    res.status(500).json({ error: 'Failed to express interest' });
  }
});

// Get interests for an announcement (managers and admins only)
router.get('/announcement/:announcementId', authenticate, async (req, res) => {
  try {
    const { announcementId } = req.params;

    // Check if user has permission to view interests
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Not authorized to view course interests' });
    }

    const courseInterestModel = new CourseInterest(req.db);
    const interests = await courseInterestModel.getInterestsByAnnouncement(parseInt(announcementId));

    res.json({
      success: true,
      interests
    });
  } catch (error) {
    console.error('Get interests error:', error);
    res.status(500).json({ error: 'Failed to fetch interests' });
  }
});

// Get interest count for an announcement
router.get('/count/:announcementId', authenticate, async (req, res) => {
  try {
    const { announcementId } = req.params;

    const courseInterestModel = new CourseInterest(req.db);
    const count = await courseInterestModel.getInterestCount(parseInt(announcementId));

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Get interest count error:', error);
    res.status(500).json({ error: 'Failed to fetch interest count' });
  }
});

// Get user's interest for an announcement
router.get('/user/:announcementId', authenticate, async (req, res) => {
  try {
    const { announcementId } = req.params;

    const courseInterestModel = new CourseInterest(req.db);
    const interest = await courseInterestModel.getUserInterest(parseInt(announcementId), req.user.id);

    res.json({
      success: true,
      interest
    });
  } catch (error) {
    console.error('Get user interest error:', error);
    res.status(500).json({ error: 'Failed to fetch user interest' });
  }
});

// Remove interest
router.delete('/:announcementId', authenticate, async (req, res) => {
  try {
    const { announcementId } = req.params;

    const courseInterestModel = new CourseInterest(req.db);
    const result = await courseInterestModel.removeInterest(parseInt(announcementId), req.user.id);

    if (result) {
      res.json({
        success: true,
        message: 'Interest removed successfully'
      });
    } else {
      res.status(404).json({ error: 'Interest not found' });
    }
  } catch (error) {
    console.error('Remove interest error:', error);
    res.status(500).json({ error: 'Failed to remove interest' });
  }
});

module.exports = router; 