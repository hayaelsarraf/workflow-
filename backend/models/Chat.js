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

  // ✅ FIXED: Simplified getRecentConversations method with correct parameter count
  async getRecentConversations(userId, limit = 20) {
    try {
      // ✅ FIXED: Ensure parameters are properly converted to integers
      const userIdInt = parseInt(userId);
      const limitInt = parseInt(limit);

      const [conversations] = await this.db.execute(
        `SELECT 
          conversation_data.other_user_id,
          conversation_data.other_user_first_name,
          conversation_data.other_user_last_name,
          conversation_data.other_user_email,
          conversation_data.other_user_role,
          conversation_data.last_message,
          conversation_data.last_message_time,
          conversation_data.last_sender_id
         FROM (
           SELECT DISTINCT
             CASE 
               WHEN m.sender_id = ? THEN m.recipient_id 
               ELSE m.sender_id 
             END as other_user_id,
             CASE 
               WHEN m.sender_id = ? THEN recipient.first_name 
               ELSE sender.first_name 
             END as other_user_first_name,
             CASE 
               WHEN m.sender_id = ? THEN recipient.last_name 
               ELSE sender.last_name 
             END as other_user_last_name,
             CASE 
               WHEN m.sender_id = ? THEN recipient.email 
               ELSE sender.email 
             END as other_user_email,
             CASE 
               WHEN m.sender_id = ? THEN recipient.role 
               ELSE sender.role 
             END as other_user_role,
             m.message_text as last_message,
             m.created_at as last_message_time,
             m.sender_id as last_sender_id,
             ROW_NUMBER() OVER (
               PARTITION BY 
                 CASE 
                   WHEN m.sender_id < m.recipient_id 
                   THEN CONCAT(m.sender_id, '-', m.recipient_id)
                   ELSE CONCAT(m.recipient_id, '-', m.sender_id)
                 END 
               ORDER BY m.created_at DESC
             ) as rn
           FROM messages m
           JOIN users sender ON m.sender_id = sender.id
           JOIN users recipient ON m.recipient_id = recipient.id
           WHERE (m.sender_id = ? OR m.recipient_id = ?)
             AND sender.is_active = TRUE 
             AND recipient.is_active = TRUE
         ) as conversation_data
         WHERE conversation_data.rn = 1
         ORDER BY conversation_data.last_message_time DESC
         LIMIT ?`,
        [userIdInt, userIdInt, userIdInt, userIdInt, userIdInt, userIdInt, userIdInt, limitInt]
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
        attachment_url = null
      } = messageData;

      const [result] = await this.db.execute(
        `INSERT INTO messages (sender_id, recipient_id, message_text, attachment_url, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [sender_id, recipient_id, message_text, attachment_url]
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
