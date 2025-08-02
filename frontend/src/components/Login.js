import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  Assignment as TaskIcon,
  Notifications as NotificationIcon 
} from '@mui/icons-material';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Notification state
  const [showNotifications, setShowNotifications] = useState(false);
  const [newAssignments, setNewAssignments] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // ✅ FIXED: Fetch notifications with proper token handling
  const checkForNotifications = async () => {
    try {
      setLoadingNotifications(true);
      console.log('🔍 Checking for new task assignments...');
      
      // ✅ Get token from localStorage (where auth context stores it)
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No token found, skipping notification check');
        navigate('/dashboard');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/notifications/unread', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Filter for task assignment notifications only
      const assignments = response.data.notifications.filter(
        notification => notification.type === 'task_assigned'
      );
      
      console.log(`📋 Found ${assignments.length} new task assignments`);
      setNewAssignments(assignments);
      
      // Only show dialog if notifications actually exist
      if (assignments.length > 0) {
        setShowNotifications(true);
      } else {
        console.log('✅ No new assignments - navigating to dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      // Navigate to dashboard even if notification fetch fails
      navigate('/dashboard');
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark individual task as viewed
  const handleMarkTaskViewed = async (notification) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/notifications/task/${notification.task_id}/viewed`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove from list after viewing
      setNewAssignments(prev => prev.filter(n => n.id !== notification.id));
      console.log('✅ Task marked as viewed:', notification.task_title);
    } catch (error) {
      console.error('❌ Failed to mark task as viewed:', error);
      setError('Failed to mark task as viewed');
    }
  };

  // ✅ FIXED: Proper login flow with corrected async handling
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login...');
      await login(email, password);
      console.log('Login successful, checking notifications...');
      await checkForNotifications();
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Failed to log in. Please check your credentials and try again.');
      setLoading(false);
    }
  };

  // User manually closes notification dialog
  const handleCloseNotifications = () => {
    console.log('👤 User manually closed notifications dialog');
    setShowNotifications(false);
    navigate('/dashboard');
  };

  // View all tasks and mark as viewed
  const handleViewAllTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log(`📋 Marking ${newAssignments.length} tasks as viewed...`);
      
      // Mark all remaining assignments as viewed
      for (const notification of newAssignments) {
        await axios.put(`http://localhost:5000/api/notifications/task/${notification.task_id}/viewed`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      setNewAssignments([]);
      setShowNotifications(false);
      navigate('/tasks');
    } catch (error) {
      console.error('❌ Failed to mark all tasks as viewed:', error);
      // Still navigate even if there's an error
      setShowNotifications(false);
      navigate('/tasks');
    }
  };

  // Skip notifications and go to dashboard
  const handleSkipNotifications = () => {
    console.log('⏭️ User skipped notifications');
    setShowNotifications(false);
    navigate('/dashboard');
  };

  // Format time for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Login
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {/* Show loading state when checking notifications */}
          {loadingNotifications && (
            <Alert severity="info" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Checking for new task assignments...
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || loadingNotifications}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            
            {/* Forgot Password Link */}
            <Box textAlign="center" sx={{ mb: 2 }}>
              <Link 
                to="/forgot-password" 
                style={{ textDecoration: 'none', color: '#1976d2' }}
              >
                Forgot your password?
              </Link>
            </Box>
            
            {/* Registration Link */}
            <Box textAlign="center">
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/register" style={{ textDecoration: 'none', color: '#1976d2' }}>
                  Register here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Enhanced Notification Dialog */}
      <Dialog 
        open={showNotifications}
        onClose={false} // Prevent accidental close
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '400px' }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <NotificationIcon color="primary" />
            <Typography variant="h5">
              📋 New Task Assignments ({newAssignments.length})
            </Typography>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            You have new tasks assigned while you were away
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ px: 3 }}>
          {newAssignments.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="success.main" gutterBottom>
                🎉 All assignments reviewed!
              </Typography>
              <Typography variant="body2" color="textSecondary">
                You can now continue to your dashboard or view all tasks.
              </Typography>
            </Box>
          ) : (
            <List sx={{ width: '100%' }}>
              {newAssignments.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 2,
                    mb: 2,
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    p: 2
                  }}
                >
                  <Box display="flex" alignItems="flex-start" width="100%">
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 2, mt: 0.5 }}>
                      <TaskIcon color="primary" />
                    </ListItemIcon>
                    
                    <ListItemText
                      sx={{ flex: 1 }}
                      primary={
                        <Typography variant="h6" fontWeight="bold">
                          {notification.task_title}
                        </Typography>
                      }
                      secondary={
                        <Box mt={1}>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            {notification.message}
                          </Typography>
                          
                          <Typography variant="body2" color="textSecondary">
                            <strong>Assigned by:</strong> {notification.sender_first_name} {notification.sender_last_name}
                          </Typography>
                          
                          <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                            <Chip
                              size="small"
                              label={notification.task_priority?.toUpperCase() || 'MEDIUM'}
                              color={
                                notification.task_priority === 'high' ? 'error' :
                                notification.task_priority === 'medium' ? 'warning' : 'info'
                              }
                            />
                            <Chip
                              size="small"
                              label={formatTime(notification.created_at)}
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      }
                    />
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleMarkTaskViewed(notification)}
                      sx={{ ml: 2, flexShrink: 0 }}
                    >
                      Mark as Viewed
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        
        {/* Enhanced user-controlled action buttons */}
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button 
            onClick={handleSkipNotifications}
            color="inherit"
            variant="text"
          >
            Skip for Now
          </Button>
          
          <Button 
            onClick={handleCloseNotifications}
            variant="outlined"
            color="primary"
          >
            Continue to Dashboard
          </Button>
          
          {newAssignments.length > 0 ? (
            <Button 
              onClick={handleViewAllTasks}
              variant="contained"
              startIcon={<TaskIcon />}
              color="primary"
            >
              View All Tasks ({newAssignments.length})
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/tasks')}
              variant="contained"
              startIcon={<TaskIcon />}
              color="primary"
            >
              Go to Tasks
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Login;
