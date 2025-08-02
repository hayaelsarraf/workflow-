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

// Socket authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.userId = decoded.id;
    socket.user = decoded;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    next(new Error('Authentication failed'));
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
const chatGroupsRouter = require('./routes/chatGroups');
const notificationsRouter = require('./routes/notifications');
const announcementsRouter = require('./routes/announcements');
const courseInterestsRouter = require('./routes/courseInterests');

// Use routes
app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/chat', chatRouter);
app.use('/api/chat-groups', chatGroupsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/course-interests', courseInterestsRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id, 'User ID:', socket.userId);

  // Automatically join user's personal room using authenticated user ID
  if (socket.userId) {
    socket.join(`user_${socket.userId}`);
    console.log(`👤 User ${socket.userId} joined their room`);
    
    // Notify other users that this user is online
    socket.broadcast.emit('user_status', {
      user_id: socket.userId,
      status: 'online'
    });
  }

  // Join chat group room
  socket.on('join_group', (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`👥 User joined group ${groupId}`);
  });

  // Leave chat group room
  socket.on('leave_group', (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`👥 User left group ${groupId}`);
  });

  // Handle direct messages
  socket.on('send_message', async (messageData) => {
    try {
      console.log('📨 Direct message received:', messageData);
      
      // Validate message data
      if (!messageData.recipient_id || !messageData.message_text) {
        throw new Error('Missing required message data');
      }

      if (!socket.userId) {
        throw new Error('User not authenticated');
      }

      // Create and save the message using Chat model
      const chatModel = new Chat(pool);
      const savedMessage = await chatModel.sendMessage({
        sender_id: socket.userId,
        recipient_id: messageData.recipient_id,
        message_text: messageData.message_text,
        message_type: messageData.message_type || 'text',
        attachment_path: messageData.attachment_path,
        attachment_name: messageData.attachment_name
      });

      const finalMessage = {
        ...savedMessage,
        sender_first_name: socket.user.first_name,
        sender_last_name: socket.user.last_name
      };

      // Send to recipient's room
      io.to(`user_${messageData.recipient_id}`).emit('new_message', finalMessage);
      
      // Send confirmation back to sender with the saved message
      socket.emit('message_sent', {
        success: true,
        message: finalMessage
      });

      console.log(`✅ Message sent from ${socket.userId} to user_${messageData.recipient_id}`);
    } catch (error) {
      console.error('Error handling direct message:', error);
      socket.emit('message_error', { 
        error: error.message,
        originalMessage: messageData 
      });
    }
  });

  // Handle group messages
  socket.on('send_group_message', async (messageData) => {
    try {
      console.log('� Group message received:', messageData);
      // Emit to all users in the group except sender
      socket.to(`group_${messageData.group_id}`).emit('new_group_message', messageData);
    } catch (error) {
      console.error('Error handling group message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id, 'User ID:', socket.userId);
    
    if (socket.userId) {
      // Notify other users that this user is offline
      socket.broadcast.emit('user_status', {
        user_id: socket.userId,
        status: 'offline'
      });
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
