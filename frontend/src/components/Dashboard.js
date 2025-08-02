import React, { useState } from 'react';
import { Badge } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import ChatComponent from './ChatComponent';
import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  Chip,
  Grid,
  Card,
  CardContent,
  Fab 
} from '@mui/material';
import { Task, Add, List, Chat as ChatIcon } from '@mui/icons-material';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useChat();
  const [chatOpen, setChatOpen] = useState(false);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'member': return 'info';
      default: return 'default';
    }
  };

  // ✅ Debug function to test chat opening
  const handleChatOpen = () => {
    console.log('📱 Chat button clicked');
    console.log('Current chatOpen state:', chatOpen);
    setChatOpen(true);
    console.log('Chat should now be open');
  };

  console.log('🔍 Dashboard render state:', {
    chatOpen,
    unreadCount,
    userExists: !!user
  });

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            Welcome, {user?.first_name} {user?.last_name}!
          </Typography>
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        </Box>
        
        <Box mb={3}>
          <Chip 
            label={`Role: ${user?.role.toUpperCase()}`} 
            color={getRoleColor(user?.role)}
            variant="filled"
          />
        </Box>
        
        <Typography variant="body1" color="textSecondary" mb={3}>
          Email: {user?.email}
        </Typography>

        {/* Quick Actions Section */}
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Task sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Task Management
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  View and manage your tasks
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<List />}
                    onClick={() => navigate('/tasks')}
                  >
                    View Tasks
                  </Button>
                  {(user?.role === 'admin' || user?.role === 'manager') && (
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={() => navigate('/tasks/create')}
                    >
                      Create Task
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* ✅ ADD: Chat Info Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <ChatIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Team Chat
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Communicate with your team members
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<ChatIcon />}
                    onClick={handleChatOpen}
                  >
                    Open Chat
                  </Button>
                  {unreadCount > 0 && (
                    <Chip 
                      label={`${unreadCount} unread`} 
                      color="error" 
                      size="small" 
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Role-based content */}
        {user?.role === 'admin' && (
          <Box mt={3}>
            <Typography variant="h6" color="error">
              Admin Dashboard - Full Access
            </Typography>
            <ul>
              <li>Manage all users</li>
              <li>System configuration</li>
              <li>View all projects and tasks</li>
              <li>Analytics and reports</li>
            </ul>
          </Box>
        )}
        
        {user?.role === 'manager' && (
          <Box mt={3}>
            <Typography variant="h6" color="warning.main">
              Manager Dashboard - Project Management
            </Typography>
            <ul>
              <li>Create and manage tasks</li>
              <li>Assign tasks to team members</li>
              <li>View team analytics</li>
              <li>Manage team workflows</li>
            </ul>
          </Box>
        )}
        
        {user?.role === 'member' && (
          <Box mt={3}>
            <Typography variant="h6" color="info.main">
              Member Dashboard - Task Management
            </Typography>
            <ul>
              <li>View assigned tasks</li>
              <li>Update task status</li>
              <li>Collaborate with team</li>
              <li>Track personal progress</li>
            </ul>
          </Box>
        )}
      </Paper>

      {/* ✅ Floating Action Button */}
      <Fab
        color="primary"
        aria-label="chat"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={handleChatOpen}
      >
        <Badge badgeContent={unreadCount} color="error">
          <ChatIcon />
        </Badge>
      </Fab>

      {/* ✅ Chat Component with debugging */}
      {console.log('🎭 Rendering ChatComponent with isOpen:', chatOpen)}
      <ChatComponent 
        isOpen={chatOpen} 
        onClose={() => {
          console.log('❌ Chat closing');
          setChatOpen(false);
        }} 
      />
    </Container>
  );
};

export default Dashboard;
