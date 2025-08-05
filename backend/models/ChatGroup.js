class ChatGroup {
  constructor(db) {
    this.db = db;
  }

  // Create a new chat group
  async create(managerId, name, description = '') {
    try {
      const [result] = await this.db.execute(
        'INSERT INTO chat_groups (manager_id, name, description, created_at) VALUES (?, ?, ?, NOW())',
        [managerId, name, description]
      );
      return result.insertId;
    } catch (error) {
      console.error('Create chat group error:', error);
      throw error;
    }
  }

  // Add members to a group
  async addMembers(groupId, memberIds) {
    try {
      const values = memberIds.map(memberId => [groupId, memberId]);
      const [result] = await this.db.query(
        'INSERT INTO chat_group_members (group_id, user_id) VALUES ?',
        [values]
      );
      return true;
    } catch (error) {
      console.error('Add group members error:', error);
      throw error;
    }
  }

  // Remove members from a group
  async removeMembers(groupId, memberIds) {
    try {
      await this.db.execute(
        'DELETE FROM chat_group_members WHERE group_id = ? AND user_id IN (?)',
        [groupId, memberIds]
      );
      return true;
    } catch (error) {
      console.error('Remove group members error:', error);
      throw error;
    }
  }

  // Get all groups for a user (including managed and member of)
  async getUserGroups(userId) {
    try {
      const [groups] = await this.db.execute(`
        SELECT 
          g.*,
          m.user_id IS NOT NULL as is_member,
          g.manager_id = ? as is_manager,
          (SELECT COUNT(DISTINCT user_id) FROM chat_group_members WHERE group_id = g.id) as member_count,
          (SELECT GROUP_CONCAT(DISTINCT CONCAT(u.first_name, ' ', u.last_name)) 
           FROM chat_group_members gm2 
           JOIN users u ON gm2.user_id = u.id 
           WHERE gm2.group_id = g.id) as member_names,
          (SELECT message_text 
           FROM group_messages gm3 
           WHERE gm3.group_id = g.id 
           ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT created_at 
           FROM group_messages gm4 
           WHERE gm4.group_id = g.id 
           ORDER BY created_at DESC LIMIT 1) as last_message_time,
          (SELECT sender_id 
           FROM group_messages gm5 
           WHERE gm5.group_id = g.id 
           ORDER BY created_at DESC LIMIT 1) as last_sender_id,
          (SELECT CONCAT(u2.first_name, ' ', u2.last_name) 
           FROM group_messages gm6 
           JOIN users u2 ON gm6.sender_id = u2.id 
           WHERE gm6.group_id = g.id 
           ORDER BY gm6.created_at DESC LIMIT 1) as last_sender_name
        FROM chat_groups g
        LEFT JOIN chat_group_members m ON g.id = m.group_id AND m.user_id = ?
        WHERE g.is_active = TRUE 
          AND (g.manager_id = ? OR m.user_id IS NOT NULL)
        ORDER BY 
          COALESCE((SELECT created_at 
                    FROM group_messages gm7 
                    WHERE gm7.group_id = g.id 
                    ORDER BY created_at DESC LIMIT 1), 
                   g.created_at) DESC
      `, [userId, userId, userId]);

      return groups || [];
    } catch (error) {
      console.error('Get user groups error:', error);
      throw error;
    }
  }

  // Get messages for a group
 async getGroupMessages(groupId, userId, limit = 50, offset = 0) {
  try {
    const isMember = await this.isGroupMember(groupId, userId);
    const isManager = await this.isGroupManager(groupId, userId);

    if (!isMember && !isManager) {
      throw new Error('Access denied: You are not a member of this group.');
    }

    const limitInt = parseInt(limit);
    const offsetInt = parseInt(offset);

    const [messages] = await this.db.execute(`
      SELECT  
        m.*, 
        u.id as sender_id, 
        u.first_name as sender_first_name, 
        u.last_name as sender_last_name, 
        CONCAT(u.first_name, ' ', u.last_name) as sender_name, 
        u.email as sender_email, 
        u.role as sender_role 
      FROM group_messages m 
      JOIN users u ON m.sender_id = u.id 
      WHERE m.group_id = ? 
      ORDER BY m.created_at DESC 
      LIMIT ? OFFSET ?
    `, [groupId, limitInt, offsetInt]);

    return messages.reverse();
  } catch (error) {
    console.error('Get group messages error:', error);
    throw error;
  }
}


  // Send a message to a group
  async sendGroupMessage(groupId, senderId, messageData) {
    try {
      const {
        message_text,
        message_type = 'text',
        attachment_path = null,
        attachment_name = null
      } = messageData;

      // Insert the message
      const [result] = await this.db.execute(`
        INSERT INTO group_messages 
        (group_id, sender_id, message_text, message_type, attachment_path, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [groupId, senderId, message_text, message_type, attachment_path]);

      // Get the created message with sender details
      const [messages] = await this.db.execute(`
        SELECT 
          m.*,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.email as sender_email,
          u.role as sender_role
        FROM group_messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `, [result.insertId]);

      return messages[0];
    } catch (error) {
      console.error('Send group message error:', error);
      throw error;
    }
  }

  // Check if a user is the manager of a group
  async isGroupManager(groupId, userId) {
    try {
      const [rows] = await this.db.execute(
        'SELECT 1 FROM chat_groups WHERE id = ? AND manager_id = ? AND is_active = TRUE',
        [groupId, userId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('Check group manager error:', error);
      throw error;
    }
  }

  // Check if a user is a member of a group
  async isGroupMember(groupId, userId) {
    try {
      const [rows] = await this.db.execute(
        'SELECT 1 FROM chat_group_members WHERE group_id = ? AND user_id = ?',
        [groupId, userId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('Check group member error:', error);
      throw error;
    }
  }
}

module.exports = ChatGroup;
