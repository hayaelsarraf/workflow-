const express = require('express');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    console.log('📧 Getting notifications for user:', req.user.id);
    
    const notificationModel = new Notification(req.db);
    const notifications = await notificationModel.findByRecipient(req.user.id);
    const unreadCount = await notificationModel.getUnreadCount(req.user.id);

    res.json({
      success: true,
      notifications,
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notifications only
router.get('/unread', authenticate, async (req, res) => {
  try {
    const notificationModel = new Notification(req.db);
    const notifications = await notificationModel.findByRecipient(req.user.id, false);
    const unreadCount = await notificationModel.getUnreadCount(req.user.id);

    res.json({
      success: true,
      notifications,
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('Get unread notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notificationModel = new Notification(req.db);
    const updated = await notificationModel.markAsRead(req.params.id, req.user.id);

    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    const notificationModel = new Notification(req.db);
    const updatedCount = await notificationModel.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${updatedCount} notifications marked as read`
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Mark task as viewed by assignee
// Mark task as viewed by assignee
router.put('/task/:id/viewed', authenticate, async (req, res) => {
  try {
    console.log('👁️ Marking task as viewed:', req.params.id, 'by user:', req.user.id);
    
    const taskModel = new Task(req.db);
    const task = await taskModel.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is the assignee
    if (task.assignee_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    // Mark task as viewed
    await req.db.execute(
      'UPDATE tasks SET viewed_by_assignee = TRUE, viewed_at = NOW() WHERE id = ?',
      [req.params.id]
    );

    // ✅ UPDATED: Only create notification if the creator opted in
    if (task.notify_on_view) {
      const notificationModel = new Notification(req.db);
      await notificationModel.create({
        type: 'task_viewed',
        recipient_id: task.created_by,
        sender_id: req.user.id,
        task_id: task.id,
        message: `${req.user.first_name} ${req.user.last_name} has viewed the task "${task.title}"`
      });

      console.log('✅ Task marked as viewed and creator notified');
    } else {
      console.log('✅ Task marked as viewed (no notification - creator opted out)');
    }

    res.json({
      success: true,
      message: task.notify_on_view ? 
        'Task marked as viewed and creator has been notified' :
        'Task marked as viewed'
    });
  } catch (error) {
    console.error('Mark task as viewed error:', error);
    res.status(500).json({ error: 'Failed to mark task as viewed' });
  }
});


module.exports = router;
