import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ChatComponent from './ChatComponent';
import CreateTask from './CreateTask';
import TaskList from './TaskList';
import CreateAnnouncement from './CreateAnnouncement';
import AnnouncementsComponent from './AnnouncementsComponent';
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
  Fab,
} from '@mui/material';
import { 
  Task, 
  Add, 
  List, 
  Chat as ChatIcon,
  Announcement as AnnouncementIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [createAnnouncementOpen, setCreateAnnouncementOpen] = useState(false);

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'member': return 'info';
      default: return 'default';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChatOpen = () => {
    console.log('📱 Chat button clicked');
    setChatOpen(true);
  };

  const canManageAnnouncements = user?.role === 'admin' || user?.role === 'manager';
  const canCreateTasks = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.first_name} {user?.last_name}!
          </Typography>
          <Chip 
            label={user?.role} 
            color={getRoleColor(user?.role)} 
            variant="outlined"
          />
        </Box>
        <Button variant="outlined" onClick={handleLogout}>
          Logout
        </Button>
      </Box>

      {/* Main Content */}
      <Paper sx={{ p: 3, mb: 4 }}>
        {/* Quick Actions Section */}
        <Grid container spacing={3} sx={{ mt: 2, mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Task color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6">Task Management</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {canCreateTasks 
                        ? 'Create and manage your tasks efficiently'
                        : 'View and update your assigned tasks'
                      }
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {canCreateTasks && (
                    <Button 
                      variant="contained" 
                      startIcon={<Add />}
                      onClick={() => navigate('/tasks/create')}
                    >
                      Create Task
                    </Button>
                  )}
                  <Button 
                    variant="outlined" 
                    startIcon={<ViewIcon />}
                    onClick={() => navigate('/tasks')}
                  >
                    View Tasks
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <ChatIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6">Team Chat</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Communicate with your team members
                    </Typography>
                  </Box>
                </Box>
                <Button 
                  variant="contained" 
                  startIcon={<ChatIcon />}
                  sx={{ mt: 2 }}
                  onClick={handleChatOpen}
                >
                  Open Chat
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Announcements Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AnnouncementIcon />
            Announcements
          </Typography>
          <Box>
            {canManageAnnouncements && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCreateAnnouncementOpen(true)}
                >
                  Create Announcement
                </Button>
              </Box>
            )}
            <AnnouncementsComponent />
          </Box>
        </Box>
      </Paper>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="chat"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={handleChatOpen}
      >
        <ChatIcon />
      </Fab>

      {/* Chat Component */}
      <ChatComponent 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)} 
      />

      {/* Create Announcement Dialog */}
      <CreateAnnouncement 
        open={createAnnouncementOpen}
        onClose={() => setCreateAnnouncementOpen(false)}
      />
    </Container>
  );
};

export default Dashboard;