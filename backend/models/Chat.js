class Chat {
  constructor(db) {
    this.db = db;
  }

  // Get conversation between two users
  async getConversation(userId1, userId2, limit = 50, offset = 0) {
    try {
      // ✅ FIXED: Ensure parameters are properly converted to integers
      const userId1Int = parseInt(userId1);
      const userId2Int = parseInt(userId2);
      const limitInt = parseInt(limit);
      const offsetInt = parseInt(offset);

      const [messages] = await this.db.execute(
        `SELECT 
          m.*,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name,
          recipient.first_name as recipient_first_name,
          recipient.last_name as recipient_last_name
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users recipient ON m.recipient_id = recipient.id
         WHERE (m.sender_id = ? AND m.recipient_id = ?) 
            OR (m.sender_id = ? AND m.recipient_id = ?)
         ORDER BY m.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId1Int, userId2Int, userId2Int, userId1Int, limitInt, offsetInt]
      );

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Get conversation error:', error);
      throw error;
    }
  }

  async getRecentConversations(userId, limit = 20) {
    try {
      const userIdInt = parseInt(userId);
      const limitInt = parseInt(limit);

      const [conversations] = await this.db.execute(
        `SELECT 
          other_user.id as other_user_id,
          other_user.first_name as other_user_first_name,
          other_user.last_name as other_user_last_name,
          other_user.email as other_user_email,
          other_user.role as other_user_role,
          latest_messages.message_text as last_message,
          latest_messages.created_at as last_message_time,
          latest_messages.sender_id as last_sender_id
        FROM users other_user
        INNER JOIN (
          SELECT 
            CASE 
              WHEN sender_id = ? THEN recipient_id
              ELSE sender_id 
            END as other_user_id,
            message_text,
            created_at,
            sender_id,
            ROW_NUMBER() OVER (
              PARTITION BY 
                CASE 
                  WHEN sender_id = ? THEN recipient_id
                  ELSE sender_id 
                END
              ORDER BY created_at DESC
            ) as rn
          FROM messages
          WHERE sender_id = ? OR recipient_id = ?
        ) latest_messages ON other_user.id = latest_messages.other_user_id
        WHERE latest_messages.rn = 1
          AND other_user.id != ? 
          AND other_user.is_active = TRUE
        ORDER BY latest_messages.created_at DESC
        LIMIT ?`,
        [userIdInt, userIdInt, userIdInt, userIdInt, userIdInt, limitInt]
      );

      return conversations;
    } catch (error) {
      console.error('Get conversations error:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(messageData) {
    try {
      const {
        sender_id,
        recipient_id,
        message_text,
        message_type = 'text',
        attachment_path = null,
        attachment_name = null
      } = messageData;

      const [result] = await this.db.execute(
        `INSERT INTO messages (sender_id, recipient_id, message_text, message_type, attachment_path, attachment_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [sender_id, recipient_id, message_text, message_type, attachment_path, attachment_name]
      );

      // Get the created message with user details
      const [messages] = await this.db.execute(
        `SELECT 
          m.*,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name,
          recipient.first_name as recipient_first_name,
          recipient.last_name as recipient_last_name
         FROM messages m
         JOIN users sender ON m.sender_id = sender.id
         JOIN users recipient ON m.recipient_id = recipient.id
         WHERE m.id = ?`,
        [result.insertId]
      );

      return messages[0];
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markAsRead(recipientId, senderId) {
    try {
      const [result] = await this.db.execute(
        `UPDATE messages 
         SET is_read = TRUE, read_at = NOW()
         WHERE recipient_id = ? AND sender_id = ? AND is_read = FALSE`,
        [recipientId, senderId]
      );
      return result.affectedRows;
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  // Get unread message count for a user
  async getUnreadCount(userId) {
    try {
      const [result] = await this.db.execute(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = ? AND is_read = FALSE',
        [userId]
      );
      return result[0].count;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }
}

module.exports = Chat;
