class Announcement {
  constructor(db) {
    this.db = db;
  }

  // Create a new announcement
  async create(announcementData) {
    try {
      const {
        sender_id,
        title,
        content,
        announcement_type = 'general',
        course_name = null,
        course_description = null,
        course_start_date = null
      } = announcementData;

      // ✅ FIXED: Handle empty string dates properly
      const processedCourseStartDate = course_start_date && course_start_date.trim() !== '' 
        ? course_start_date 
        : null;

      const [result] = await this.db.execute(
        `INSERT INTO announcements (
          sender_id, title, content, announcement_type, 
          course_name, course_description, course_start_date, target_audience
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'all')`,
        [sender_id, title, content, announcement_type, course_name, course_description, processedCourseStartDate]
      );

      const [announcements] = await this.db.execute(
        `SELECT 
          a.*,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.email as sender_email
         FROM announcements a
         JOIN users u ON a.sender_id = u.id
         WHERE a.id = ?`,
        [result.insertId]
      );

      return announcements[0];
    } catch (error) {
      console.error('Create announcement error:', error);
      throw error;
    }
  }

  // Get all announcements for a user based on their role
  async getAllForUser(userId, userRole) {
    try {
      let query = `
        SELECT 
          a.*,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.email as sender_email
         FROM announcements a
         JOIN users u ON a.sender_id = u.id
         WHERE a.is_active = TRUE
      `;

      const params = [];

      // ✅ FIXED: Simplified filtering - all users can see all announcements
      query += ` ORDER BY a.created_at DESC`;

      const [announcements] = await this.db.execute(query, params);
      return announcements;
    } catch (error) {
      console.error('Get announcements error:', error);
      throw error;
    }
  }

  // Get announcement by ID
  async getById(id) {
    try {
      const [announcements] = await this.db.execute(
        `SELECT 
          a.*,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.email as sender_email
         FROM announcements a
         JOIN users u ON a.sender_id = u.id
         WHERE a.id = ? AND a.is_active = TRUE`,
        [id]
      );

      return announcements[0];
    } catch (error) {
      console.error('Get announcement by ID error:', error);
      throw error;
    }
  }

  // Update announcement
  async update(id, announcementData, userId) {
    try {
      const {
        title,
        content,
        announcement_type,
        course_name,
        course_description,
        course_start_date
      } = announcementData;

      // ✅ FIXED: Handle empty string dates properly
      const processedCourseStartDate = course_start_date && course_start_date.trim() !== '' 
        ? course_start_date 
        : null;

      const [result] = await this.db.execute(
        `UPDATE announcements 
         SET title = ?, content = ?, announcement_type = ?, 
             course_name = ?, course_description = ?, course_start_date = ?, 
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND sender_id = ?`,
        [title, content, announcement_type, course_name, course_description, 
         processedCourseStartDate, id, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Announcement not found or not authorized');
      }

      return this.getById(id);
    } catch (error) {
      console.error('Update announcement error:', error);
      throw error;
    }
  }

  // Delete announcement (soft delete)
  async delete(id, userId) {
    try {
      const [result] = await this.db.execute(
        `UPDATE announcements 
         SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND sender_id = ?`,
        [id, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Announcement not found or not authorized');
      }

      return true;
    } catch (error) {
      console.error('Delete announcement error:', error);
      throw error;
    }
  }

  // Get announcements by sender
  async getBySender(senderId) {
    try {
      const [announcements] = await this.db.execute(
        `SELECT 
          a.*,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.email as sender_email
         FROM announcements a
         JOIN users u ON a.sender_id = u.id
         WHERE a.sender_id = ? AND a.is_active = TRUE
         ORDER BY a.created_at DESC`,
        [senderId]
      );

      return announcements;
    } catch (error) {
      console.error('Get announcements by sender error:', error);
      throw error;
    }
  }
}

module.exports = Announcement;