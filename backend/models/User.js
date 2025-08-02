const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

class User {
  constructor(db) {
    this.db = db;
  }

  async create(userData) {
    const { first_name, last_name, email, password, role = 'member' } = userData;
    
    try {
      // Hash password with salt rounds of 12 for better security
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Insert new user into database
      const [result] = await this.db.execute(
        `INSERT INTO users (first_name, last_name, email, password, role, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [first_name, last_name, email, hashedPassword, role]
      );
      
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM users WHERE email = ? AND is_active = true', 
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async findById(id) {
    try {
      const [rows] = await this.db.execute(
        'SELECT * FROM users WHERE id = ? AND is_active = true', 
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async validatePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
