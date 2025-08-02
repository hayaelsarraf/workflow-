class Announcement {
  constructor(db) {
    this.db = db;
  }

  // Create new announcement
  async createAnnouncement(announcementData) {
    const {
      sender_id,
      title,
      content,
      announcement_type = 'general',
      course_name = null,
      course_description = null,
      course_start_date = null,
      target_audience = 'all'
    } = announcementData;

    try {
      const [result] = await this.db.execute(
        `INSERT INTO announcements 
         (sender_id, title, content, announcement_type, course_name, course_description, course_start_date, target_audience)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sender_id, title, content, announcement_type, course_name, course_description, course_start_date, target_audience]
      );

      // Get the created announcement with sender info
      const [announcements] = await this.db.execute(
        `SELECT 
          a.*,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.email as sender_email,
          u.role as sender_role
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

  // Get announcements for user
  async getAnnouncementsForUser(userId, limit = 20, offset = 0) {
    try {
      const [announcements] = await this.db.execute(
        `SELECT 
          a.*,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.role as sender_role,
          av.viewed_at,
          CASE WHEN av.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_viewed,
          ci.interest_level,
          ci.message as interest_message,
          (SELECT COUNT(*) FROM course_interests WHERE announcement_id = a.id) as total_interested
         FROM announcements a
         JOIN users u ON a.sender_id = u.id
         LEFT JOIN announcement_views av ON a.id = av.announcement_id AND av.user_id = ?
         LEFT JOIN course_interests ci ON a.id = ci.announcement_id AND ci.user_id = ?
         WHERE a.is_active = TRUE
           AND (a.target_audience = 'all' 
                OR (a.target_audience = 'members' AND (SELECT role FROM users WHERE id = ?) = 'member')
                OR (a.target_audience = 'managers' AND (SELECT role FROM users WHERE id = ?) IN ('manager', 'admin')))
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, userId, userId, userId, limit, offset]
      );

      return announcements;
    } catch (error) {
      console.error('Get announcements error:', error);
      throw error;
    }
  }

  // Mark announcement as viewed
  async markAsViewed(announcementId, userId) {
    try {
      await this.db.execute(
        `INSERT IGNORE INTO announcement_views (announcement_id, user_id)
         VALUES (?, ?)`,
        [announcementId, userId]
      );
      return true;
    } catch (error) {
      console.error('Mark as viewed error:', error);
      throw error;
    }
  }

  // Show interest in course
  async showCourseInterest(announcementId, userId, interestData) {
    const { interest_level = 'interested', message = null } = interestData;

    try {
      await this.db.execute(
        `INSERT INTO course_interests (announcement_id, user_id, interest_level, message)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         interest_level = VALUES(interest_level),
         message = VALUES(message)`,
        [announcementId, userId, interest_level, message]
      );

      // Get updated announcement with interest count
      const [result] = await this.db.execute(
        `SELECT 
          a.*,
          (SELECT COUNT(*) FROM course_interests WHERE announcement_id = a.id) as total_interested
         FROM announcements a
         WHERE a.id = ?`,
        [announcementId]
      );

      return result[0];
    } catch (error) {
      console.error('Show course interest error:', error);
      throw error;
    }
  }

  // Get course interests for announcement (for managers)
  async getCourseInterests(announcementId) {
    try {
      const [interests] = await this.db.execute(
        `SELECT 
          ci.*,
          u.first_name,
          u.last_name,
          u.email
         FROM course_interests ci
         JOIN users u ON ci.user_id = u.id
         WHERE ci.announcement_id = ?
         ORDER BY ci.created_at DESC`,
        [announcementId]
      );

      return interests;
    } catch (error) {
      console.error('Get course interests error:', error);
      throw error;
    }
  }

  // Get announcements created by user (for managers)
  async getMyAnnouncements(userId, limit = 20, offset = 0) {
    try {
      const [announcements] = await this.db.execute(
        `SELECT 
          a.*,
          (SELECT COUNT(*) FROM announcement_views WHERE announcement_id = a.id) as view_count,
          (SELECT COUNT(*) FROM course_interests WHERE announcement_id = a.id) as interest_count
         FROM announcements a
         WHERE a.sender_id = ?
         ORDER BY a.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return announcements;
    } catch (error) {
      console.error('Get my announcements error:', error);
      throw error;
    }
  }

  // Delete announcement
  async deleteAnnouncement(announcementId, userId) {
    try {
      const [result] = await this.db.execute(
        `DELETE FROM announcements 
         WHERE id = ? AND sender_id = ?`,
        [announcementId, userId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Delete announcement error:', error);
      throw error;
    }
  }
}

module.exports = Announcement;
