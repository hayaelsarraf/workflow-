const mysql = require('mysql2/promise');

class Task {
  constructor(db) {
    this.db = db;
  }

  // Add to your Task model create method
async create(taskData) {
  const {
    title,
    description,
    due_date,
    status = 'todo',
    priority = 'medium',
    assignee_id,
    created_by,
    project_id = null,
    attachment_path = null,
    attachment_name = null,
    attachment_size = null,
    notify_on_view = true // ✅ Add notification preference
  } = taskData;

  try {
    console.log('💾 Task model create called with:', taskData);
    
    const [result] = await this.db.execute(
      `INSERT INTO tasks (title, description, due_date, status, priority, assignee_id, created_by, project_id, attachment_path, attachment_name, attachment_size, notify_on_view) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, due_date, status, priority, assignee_id, created_by, project_id, attachment_path, attachment_name, attachment_size, notify_on_view]
    );

    console.log('✅ Task created with ID:', result.insertId);
    return result.insertId;
  } catch (error) {
    console.error('❌ Task model create error:', error);
    throw error;
  }
}



  async findById(taskId) {
    try {
      const [rows] = await this.db.execute(
        `SELECT t.*, 
                u_assignee.first_name as assignee_first_name, 
                u_assignee.last_name as assignee_last_name,
                u_assignee.email as assignee_email,
                u_creator.first_name as creator_first_name,
                u_creator.last_name as creator_last_name
         FROM tasks t
         LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
         LEFT JOIN users u_creator ON t.created_by = u_creator.id
         WHERE t.id = ?`,
        [taskId]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async findByUser(userId, role) {
    try {
      let query;
      let params;

      if (role === 'admin') {
        // Admins can see all tasks
        query = `SELECT t.*, 
                        u_assignee.first_name as assignee_first_name, 
                        u_assignee.last_name as assignee_last_name,
                        u_creator.first_name as creator_first_name,
                        u_creator.last_name as creator_last_name
                 FROM tasks t
                 LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
                 LEFT JOIN users u_creator ON t.created_by = u_creator.id
                 ORDER BY t.created_at DESC`;
        params = [];
      } else if (role === 'manager') {
        // Managers can see tasks they created or are assigned to them
        query = `SELECT t.*, 
                        u_assignee.first_name as assignee_first_name, 
                        u_assignee.last_name as assignee_last_name,
                        u_creator.first_name as creator_first_name,
                        u_creator.last_name as creator_last_name
                 FROM tasks t
                 LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
                 LEFT JOIN users u_creator ON t.created_by = u_creator.id
                 WHERE t.created_by = ? OR t.assignee_id = ?
                 ORDER BY t.created_at DESC`;
        params = [userId, userId];
      } else {
        // Members can only see tasks assigned to them
        query = `SELECT t.*, 
                        u_assignee.first_name as assignee_first_name, 
                        u_assignee.last_name as assignee_last_name,
                        u_creator.first_name as creator_first_name,
                        u_creator.last_name as creator_last_name
                 FROM tasks t
                 LEFT JOIN users u_assignee ON t.assignee_id = u_assignee.id
                 LEFT JOIN users u_creator ON t.created_by = u_creator.id
                 WHERE t.assignee_id = ?
                 ORDER BY t.created_at DESC`;
        params = [userId];
      }

      const [rows] = await this.db.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  async update(taskId, taskData, userId, userRole) {
  try {
    console.log('🔧 ===== TASK MODEL UPDATE =====');
    console.log('🆔 Task ID:', taskId, typeof taskId);
    console.log('👤 User ID:', userId, typeof userId);
    console.log('🎭 User Role:', userRole);
    console.log('📦 Task Data:', JSON.stringify(taskData, null, 2));

    const {
      title,
      description,
      due_date,
      status,
      priority,
      assignee_id
    } = taskData;

    // Check if user can update this task
    console.log('🔍 Finding existing task...');
    const task = await this.findById(taskId);
    
    if (!task) {
      console.log('❌ Task not found in database');
      throw new Error('Task not found');
    }

    console.log('📋 Existing task found:', {
      id: task.id,
      title: task.title,
      status: task.status,
      created_by: task.created_by,
      assignee_id: task.assignee_id
    });

    console.log('🔐 Checking update permissions...');
    console.log('- User role:', userRole);
    console.log('- Task creator:', task.created_by);
    console.log('- Task assignee:', task.assignee_id);
    console.log('- Current user:', userId);

    const canUpdate = userRole === 'admin' || 
                     userRole === 'manager' || 
                     task.assignee_id === parseInt(userId);

    console.log('🔐 Permission check result:', canUpdate);

    if (!canUpdate) {
      console.log('❌ User unauthorized to update this task');
      throw new Error('Unauthorized to update this task');
    }

    console.log('✅ Permission check passed');

    // Prepare update values (keep existing values if new ones not provided)
    const updateValues = {
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      due_date: due_date !== undefined ? due_date : task.due_date,
      status: status !== undefined ? status : task.status,
      priority: priority !== undefined ? priority : task.priority,
      assignee_id: assignee_id !== undefined ? assignee_id : task.assignee_id
    };

    console.log('📝 Final update values:', updateValues);

    console.log('💾 Executing database UPDATE...');
    const [result] = await this.db.execute(
      `UPDATE tasks 
       SET title = ?, description = ?, due_date = ?, status = ?, priority = ?, assignee_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        updateValues.title,
        updateValues.description,
        updateValues.due_date,
        updateValues.status,
        updateValues.priority,
        updateValues.assignee_id,
        taskId
      ]
    );

    console.log('💾 Database UPDATE result:', {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
      insertId: result.insertId,
      warningCount: result.warningCount
    });

    const success = result.affectedRows > 0;
    console.log('✅ Update operation result:', success ? 'SUCCESS' : 'NO ROWS AFFECTED');

    return success;

  } catch (error) {
    console.log('❌ ===== TASK MODEL ERROR =====');
    console.error('Model Error Name:', error.name);
    console.error('Model Error Message:', error.message);
    console.error('Model Error Code:', error.code);
    console.error('Model Error Stack:', error.stack);
    throw error;
  }
}

  async delete(taskId, userId, userRole) {
    try {
      const task = await this.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (userRole !== 'admin' && task.created_by !== userId) {
        throw new Error('Unauthorized to delete this task');
      }

      const [result] = await this.db.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Task;
