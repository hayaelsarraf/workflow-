const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();
const http = require('http'); 
const socketIo = require('socket.io'); 
const initializeSocket = require('./socket/socketHandler');
const announcementRoutes = require('./routes/announcements');


const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const server = http.createServer(app); 

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

initializeSocket(io);
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));



// Database connection with better error handling
const createDbConnection = async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'hayaelsarraf',
      password: '1234',
      database: 'hayaelsarraf',
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000
    });
    
    console.log('✅ MySQL Connected Successfully!');
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize database connection and add to request object
let dbConnection;
createDbConnection().then(db => {
  dbConnection = db;
});

app.use((req, res, next) => {
  req.db = dbConnection;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes); 
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/announcements', announcementRoutes);



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Connected'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
