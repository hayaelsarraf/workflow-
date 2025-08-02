const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const Notification = require('../models/Notification');
const fs = require('fs-extra');

const router = express.Router();

// Get all tasks (filtered by user role)
router.get('/', authenticate, async (req, res) => {
  try {
    const taskModel = new Task(req.db);
    const tasks = await taskModel.findByUser(req.user.id, req.user.role);
    
    res.json({ 
      success: true, 
      tasks: tasks,
      count: tasks.length 
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const taskModel = new Task(req.db);
    const task = await taskModel.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user can view this task
    const canView = req.user.role === 'admin' || 
                   task.created_by === req.user.id || 
                   task.assignee_id === req.user.id;

    if (!canView) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ success: true, task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', authenticate, authorize(['admin', 'manager']), upload.single('attachment'), async (req, res) => {
  try {
    console.log('🔵 ===== TASK CREATION START =====');
    console.log('👤 Current user from auth:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role
    });
    console.log('📦 Request Body:', req.body);
    console.log('📁 File:', req.file ? req.file.originalname : 'No file');

    // ✅ FIXED: Extract ALL variables at the top with proper destructuring
    const {
      title,
      description,
      due_date: rawDueDate,
      priority,
      assignee_id: rawAssigneeId,
      notify_on_view: rawNotifyOnView
    } = req.body;

    // ✅ FIXED: Process due_date properly
    let due_date = null;
    if (rawDueDate && rawDueDate.trim() !== '') {
      try {
        const date = new Date(rawDueDate);
        if (!isNaN(date.getTime())) {
          due_date = date.toISOString().slice(0, 19).replace('T', ' ');
          console.log('📅 Date conversion:', {
            original: rawDueDate,
            converted: due_date
          });
        } else {
          console.warn('⚠️ Invalid date provided:', rawDueDate);
          due_date = null;
        }
      } catch (dateError) {
        console.error('❌ Date conversion error:', dateError);
        due_date = null;
      }
    }

    // ✅ FIXED: Process assignee_id properly
    const assignee_id = rawAssigneeId && rawAssigneeId !== '' ? 
                       parseInt(rawAssigneeId) : null;

    // ✅ FIXED: Process notify_on_view properly with all possible input types
    let notifyOnView = true; // Default value
    if (rawNotifyOnView !== undefined) {
      if (typeof rawNotifyOnView === 'string') {
        notifyOnView = rawNotifyOnView === 'true';
      } else if (typeof rawNotifyOnView === 'boolean') {
        notifyOnView = rawNotifyOnView;
      } else {
        notifyOnView = Boolean(rawNotifyOnView);
      }
    }

    console.log('📝 All processed values:', {
      title: title || 'undefined',
      description: description || 'empty',
      due_date: due_date || 'null',
      priority: priority || 'default',
      assignee_id: assignee_id || 'null',
      notifyOnView: notifyOnView
    });

    // Manual validation
    const errors = [];

    if (!title || title.trim() === '') {
      errors.push({
        param: 'title',
        msg: 'Title is required',
        value: title,
        location: 'body'
      });
    } else if (title.length > 255) {
      errors.push({
        param: 'title',
        msg: 'Title must be less than 255 characters',
        value: title,
        location: 'body'
      });
    }

    if (description && description.length > 5000) {
      errors.push({
        param: 'description',
        msg: 'Description must be less than 5000 characters',
        value: description,
        location: 'body'
      });
    }

    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      errors.push({
        param: 'priority',
        msg: 'Priority must be low, medium, or high',
        value: priority,
        location: 'body'
      });
    }

    if (assignee_id && (isNaN(assignee_id) || assignee_id < 1)) {
      errors.push({
        param: 'assignee_id',
        msg: 'Assignee ID must be a valid positive number',
        value: assignee_id,
        location: 'body'
      });
    }

    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      if (req.file) {
        fs.removeSync(req.file.path);
      }
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors
      });
    }

    console.log('✅ Validation passed');

    // Verify assignee exists if provided
    if (assignee_id) {
      console.log('👥 Verifying assignee exists:', assignee_id);
      const userModel = new User(req.db);
      const assignee = await userModel.findById(assignee_id);
      if (!assignee) {
        console.log('❌ Assignee not found');
        if (req.file) fs.removeSync(req.file.path);
        return res.status(400).json({ 
          error: 'Assignee not found',
          message: `User with ID ${assignee_id} does not exist`
        });
      }
      console.log('✅ Assignee verified:', assignee.first_name, assignee.last_name);
    }

    // ✅ FIXED: Prepare task data with ALL properly defined variables
    const taskData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      due_date: due_date, // Properly processed variable
      priority: priority || 'medium',
      assignee_id: assignee_id, // Properly processed variable
      created_by: req.user.id,
      notify_on_view: notifyOnView // ✅ NOW PROPERLY DEFINED
    };

    // Add file information if uploaded
    if (req.file) {
      taskData.attachment_path = req.file.path;
      taskData.attachment_name = req.file.originalname;
      taskData.attachment_size = req.file.size;
      
      console.log('📎 File attached:', {
        name: req.file.originalname,
        size: req.file.size + ' bytes',
        type: req.file.mimetype,
        path: req.file.path
      });
    }

    console.log('💾 Final task data for database:', taskData);

    // Create task
    const taskModel = new Task(req.db);
    const taskId = await taskModel.create(taskData);

    // Create assignment notification (always sent when task is assigned)
    if (taskData.assignee_id && taskData.assignee_id !== req.user.id) {
      console.log('📧 Creating assignment notification for:', taskData.assignee_id);
      
      try {
        const notificationModel = new Notification(req.db);
        await notificationModel.create({
          type: 'task_assigned',
          recipient_id: taskData.assignee_id,
          sender_id: req.user.id,
          task_id: taskId,
          message: `You have been assigned a new task: "${taskData.title}"`
        });
        
        console.log('✅ Assignment notification created successfully');
      } catch (notificationError) {
        console.error('⚠️ Failed to create assignment notification:', notificationError);
        // Don't fail the task creation if notification fails
      }
    }

    // Fetch the created task
    const createdTask = await taskModel.findById(taskId);

    console.log('🎉 Task created successfully with ID:', taskId);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: createdTask
    });

  } catch (error) {
    console.error('❌ Task creation error:', error);
    
    if (req.file) {
      try {
        fs.removeSync(req.file.path);
        console.log('🧹 File cleaned up after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to create task',
      message: error.message 
    });
  }
});

// Update task - Enhanced debugging version
router.put('/:id', authenticate, [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done'])
    .withMessage('Status must be todo, in_progress, or done'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  
  body('assignee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Assignee ID must be a valid user ID')
], async (req, res) => {
  try {
    console.log('🔄 =================================');
    console.log('🔄 PUT /api/tasks/:id - REQUEST RECEIVED');
    console.log('🔄 =================================');
    console.log('📋 Task ID:', req.params.id);
    console.log('👤 User Info:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role
    });
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Database Available:', req.db ? 'YES' : 'NO');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ VALIDATION FAILED:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    console.log('✅ Validation passed');

    const taskId = req.params.id;
    const { title, description, due_date, status, priority, assignee_id } = req.body;

    console.log('📝 Extracted Update Fields:', {
      taskId,
      title: title || 'unchanged',
      description: description ? `${description.length} chars` : 'unchanged',
      due_date: due_date || 'unchanged',
      status: status || 'unchanged',
      priority: priority || 'unchanged',
      assignee_id: assignee_id || 'unchanged'
    });

    // Verify assignee exists if provided
    if (assignee_id) {
      console.log('👥 Verifying assignee exists:', assignee_id);
      const userModel = new User(req.db);
      const assignee = await userModel.findById(assignee_id);
      if (!assignee) {
        console.log('❌ Assignee not found');
        return res.status(400).json({ error: 'Assignee not found' });
      }
      console.log('✅ Assignee verified:', assignee.first_name, assignee.last_name);
    }

    console.log('🏭 Creating Task model instance...');
    const taskModel = new Task(req.db);
    
    console.log('🔄 Calling taskModel.update...');
    const updateResult = await taskModel.update(taskId, {
      title, description, due_date, status, priority, assignee_id
    }, req.user.id, req.user.role);

    console.log('📊 Update Result:', updateResult);

    if (!updateResult) {
      console.log('❌ Update returned false - task not found or not updated');
      return res.status(404).json({ error: 'Task not found or not updated' });
    }
    console.log('✅ Task update successful');

    // Fetch updated task
    console.log('📋 Fetching updated task details...');
    const updatedTask = await taskModel.findById(taskId);
    console.log('📋 Updated task retrieved:', updatedTask ? 'SUCCESS' : 'FAILED');
    
    if (updatedTask) {
      console.log('📋 Updated task data:', {
        id: updatedTask.id,
        title: updatedTask.title,
        status: updatedTask.status,
        priority: updatedTask.priority
      });
    }

    console.log('🎉 Sending success response');
    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.log('❌ =================================');
    console.log('❌ PUT /api/tasks/:id - ERROR OCCURRED');
    console.log('❌ =================================');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Stack:', error.stack);
    
    if (error.message === 'Task not found' || error.message === 'Unauthorized to update this task') {
      console.log('🚫 Authorization/Not Found Error');
      return res.status(404).json({ error: error.message });
    }
    
    console.log('💥 Internal Server Error');
    res.status(500).json({ 
      error: 'Failed to update task',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const taskModel = new Task(req.db);
    const deleted = await taskModel.delete(req.params.id, req.user.id, req.user.role);

    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    if (error.message === 'Task not found' || error.message === 'Unauthorized to delete this task') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get all users for task assignment
router.get('/users/list', authenticate, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const [users] = await req.db.execute(
      'SELECT id, first_name, last_name, email, role FROM users WHERE is_active = true ORDER BY first_name, last_name'
    );
    
    res.json({ 
      success: true, 
      users: users 
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});





// Serve uploaded files
router.get('/attachments/:filename', authenticate, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Optional: Add permission check to ensure user can access this file
    // You can add task ownership verification here
    
    res.download(filePath);
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});


module.exports = router;
