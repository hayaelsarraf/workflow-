const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

console.log('🔌 Initializing Socket.IO...');
console.log('✅ Socket.IO initialized successfully');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'workflow_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL Connected Successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL Connection Error:', err);
  });

// Make db available to routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Import routes
const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const chatRouter = require('./routes/chat');
const notificationsRouter = require('./routes/notifications');
const announcementsRouter = require('./routes/announcements');

// Use routes
app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/announcements', announcementsRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  socket.on('send_message', async (messageData) => {
    try {
      // Handle message sending logic here
      console.log('📨 Message received:', messageData);
      
      // Emit to recipient
      socket.to(`user_${messageData.recipient_id}`).emit('new_message', messageData);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
