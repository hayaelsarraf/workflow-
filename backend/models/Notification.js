class Notification {
  constructor(db) {
    this.db = db;
  }

  async create(notificationData) {
    const {
      type,
      recipient_id,
      sender_id,
      task_id,
      message
    } = notificationData;

    try {
      console.log('📧 Creating notification:', notificationData);
      
      const [result] = await this.db.execute(
        `INSERT INTO notifications (type, recipient_id, sender_id, task_id, message) 
         VALUES (?, ?, ?, ?, ?)`,
        [type, recipient_id, sender_id, task_id, message]
      );

      return result.insertId;
    } catch (error) {
      console.error('❌ Notification creation error:', error);
      throw error;
    }
  }

  async findByRecipient(recipientId, isRead = null) {
    try {
      let query = `
        SELECT 
          n.*,
          t.title as task_title,
          t.priority as task_priority,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name,
          sender.email as sender_email
        FROM notifications n
        JOIN tasks t ON n.task_id = t.id
        JOIN users sender ON n.sender_id = sender.id
        WHERE n.recipient_id = ?
      `;
      
      const params = [recipientId];
      
      if (isRead !== null) {
        query += ' AND n.is_read = ?';
        params.push(isRead);
      }
      
      query += ' ORDER BY n.created_at DESC';
      
      const [notifications] = await this.db.execute(query, params);
      return notifications;
    } catch (error) {
      console.error('❌ Find notifications error:', error);
      throw error;
    }
  }

  async markAsRead(notificationId, recipientId) {
    try {
      const [result] = await this.db.execute(
        `UPDATE notifications 
         SET is_read = TRUE, read_at = NOW() 
         WHERE id = ? AND recipient_id = ?`,
        [notificationId, recipientId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Mark notification as read error:', error);
      throw error;
    }
  }

  async markAllAsRead(recipientId) {
    try {
      const [result] = await this.db.execute(
        `UPDATE notifications 
         SET is_read = TRUE, read_at = NOW() 
         WHERE recipient_id = ? AND is_read = FALSE`,
        [recipientId]
      );

      return result.affectedRows;
    } catch (error) {
      console.error('❌ Mark all notifications as read error:', error);
      throw error;
    }
  }

  async getUnreadCount(recipientId) {
    try {
      const [result] = await this.db.execute(
        'SELECT COUNT(*) as unread_count FROM notifications WHERE recipient_id = ? AND is_read = FALSE',
        [recipientId]
      );

      return result[0].unread_count;
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      throw error;
    }
  }
}

module.exports = Notification;
