const jwt = require('jsonwebtoken');

const initializeSocket = (io) => {
  console.log('🔌 Initializing Socket.IO...');
  
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.error('❌ Socket connection attempted without token');
        return next(new Error('Authentication error: No token provided'));
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.id;
      console.log(`✅ Socket authenticated for user: ${decoded.id}`);
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔗 User ${socket.userId} connected via socket`);

    // Join user-specific room
    socket.on('join_user_room', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`🏠 User ${userId} joined their room`);
    });

    // Handle typing indicators (optional)
    socket.on('typing_start', (data) => {
      socket.to(`user_${data.recipient_id}`).emit('user_typing', {
        user_id: socket.userId,
        typing: true
      });
    });

    socket.on('typing_stop', (data) => {
      socket.to(`user_${data.recipient_id}`).emit('user_typing', {
        user_id: socket.userId,
        typing: false
      });
    });

    // Handle online status (optional)
    socket.on('user_online', () => {
      socket.broadcast.emit('user_status_change', {
        user_id: socket.userId,
        online: true
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 User ${socket.userId} disconnected: ${reason}`);
      socket.broadcast.emit('user_status_change', {
        user_id: socket.userId,
        online: false
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for user ${socket.userId}:`, error);
    });
  });

  console.log('✅ Socket.IO initialized successfully');
};

module.exports = initializeSocket;
