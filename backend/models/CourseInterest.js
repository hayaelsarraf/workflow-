class CourseInterest {
    constructor(db) {
      this.db = db;
    }
  
    // Add interest to a course announcement
    async addInterest(interestData) {
      try {
        const {
          announcement_id,
          user_id,
          interest_level = 'interested',
          message = null
        } = interestData;
  
        // Check if user already expressed interest
        const [existing] = await this.db.execute(
          'SELECT id FROM course_interests WHERE announcement_id = ? AND user_id = ?',
          [announcement_id, user_id]
        );
  
        if (existing.length > 0) {
          // Update existing interest
          const [result] = await this.db.execute(
            `UPDATE course_interests 
             SET interest_level = ?, message = ?, created_at = CURRENT_TIMESTAMP
             WHERE announcement_id = ? AND user_id = ?`,
            [interest_level, message, announcement_id, user_id]
          );
          return result.affectedRows > 0;
        } else {
          // Add new interest
          const [result] = await this.db.execute(
            `INSERT INTO course_interests (announcement_id, user_id, interest_level, message)
             VALUES (?, ?, ?, ?)`,
            [announcement_id, user_id, interest_level, message]
          );
          return result.insertId;
        }
      } catch (error) {
        console.error('Add course interest error:', error);
        throw error;
      }
    }
  
    // Get interests for a specific announcement
    async getInterestsByAnnouncement(announcementId) {
      try {
        const [interests] = await this.db.execute(
          `SELECT 
            ci.*,
            u.first_name,
            u.last_name,
            u.email,
            u.role
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
  
    // Get interest count for an announcement
    async getInterestCount(announcementId) {
      try {
        const [result] = await this.db.execute(
          'SELECT COUNT(*) as count FROM course_interests WHERE announcement_id = ?',
          [announcementId]
        );
        return result[0].count;
      } catch (error) {
        console.error('Get interest count error:', error);
        throw error;
      }
    }
  
    // Check if user has expressed interest
    async getUserInterest(announcementId, userId) {
      try {
        const [interests] = await this.db.execute(
          'SELECT * FROM course_interests WHERE announcement_id = ? AND user_id = ?',
          [announcementId, userId]
        );
        return interests[0] || null;
      } catch (error) {
        console.error('Get user interest error:', error);
        throw error;
      }
    }
  
    // Remove interest
    async removeInterest(announcementId, userId) {
      try {
        const [result] = await this.db.execute(
          'DELETE FROM course_interests WHERE announcement_id = ? AND user_id = ?',
          [announcementId, userId]
        );
        return result.affectedRows > 0;
      } catch (error) {
        console.error('Remove interest error:', error);
        throw error;
      }
    }
  }
  
  module.exports = CourseInterest;