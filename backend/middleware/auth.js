const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authentication middleware to verify JWT token and get user data
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔑 JWT decoded payload:', decoded); // Debug line
    
    // ✅ FIX: Use userId instead of id to match your JWT payload
    const userId = decoded.id;
    
    console.log('👤 Looking for user ID:', userId); // Debug line
    
    const [users] = await req.db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      console.log('❌ User not found for ID:', userId);
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = users[0];
    console.log('✅ User authenticated:', req.user.email);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Token is not valid' });
  }
};


/**
 * Authorization middleware to check user roles
 * @param {Array} roles - Array of allowed roles
 */
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Optional middleware to check if user is admin
 */
const requireAdmin = authorize(['admin']);

/**
 * Optional middleware to check if user is admin or manager
 */
const requireManagerOrAdmin = authorize(['admin', 'manager']);

/**
 * Middleware to extract user information without requiring authentication
 * Useful for optional authentication scenarios
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userModel = new User(req.db);
    const user = await userModel.findById(decoded.id);
    
    if (user && user.is_active) {
      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;
      req.userId = user.id;
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth, just set user to null
    req.user = null;
    next();
  }
};

/**
 * Middleware to validate that user owns the resource they're trying to access
 * Checks if req.params.userId matches req.user.id or if user is admin
 */
const validateResourceOwnership = (req, res, next) => {
  const resourceUserId = req.params.userId || req.params.id;
  const currentUserId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!resourceUserId) {
    return res.status(400).json({ 
      error: 'Resource ID not provided',
      code: 'MISSING_RESOURCE_ID'
    });
  }

  if (currentUserId === parseInt(resourceUserId) || isAdmin) {
    return next();
  }

  return res.status(403).json({ 
    error: 'You can only access your own resources',
    code: 'RESOURCE_ACCESS_DENIED'
  });
};

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireManagerOrAdmin,
  optionalAuth,
  validateResourceOwnership
};
