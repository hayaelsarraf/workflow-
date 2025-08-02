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
  Tabs,
  Tab
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
  const [activeTab, setActiveTab] = useState(0);

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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
        <Typography variant="h5" gutterBottom>
          Dashboard Overview
        </Typography>

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

        {/* Tabs for Announcements and Role-based content */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AnnouncementIcon />
                  Announcements
                </Box>
              } 
            />
            <Tab label="Dashboard Info" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
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
        )}

        {activeTab === 1 && (
          <Box>
            {/* Role-based content */}
            {user?.role === 'admin' && (
              <Box>
                <Typography variant="h6" color="error">
                  Admin Dashboard - Full Access
                </Typography>
                <ul>
                  <li>Manage all users</li>
                  <li>System configuration</li>
                  <li>Create and manage all tasks</li>
                  <li>View all projects and tasks</li>
                  <li>Analytics and reports</li>
                  <li>Create and manage announcements</li>
                </ul>
              </Box>
            )}
            
            {user?.role === 'manager' && (
              <Box>
                <Typography variant="h6" color="warning.main">
                  Manager Dashboard - Project Management
                </Typography>
                <ul>
                  <li>Create and assign tasks to team members</li>
                  <li>Manage and monitor task progress</li>
                  <li>View team analytics</li>
                  <li>Manage team workflows</li>
                  <li>Create and manage announcements</li>
                  <li>Review task status updates</li>
                </ul>
              </Box>
            )}
            
            {user?.role === 'member' && (
              <Box>
                <Typography variant="h6" color="info.main">
                  Member Dashboard - Task Management
                </Typography>
                <ul>
                  <li>View assigned tasks</li>
                  <li>Update task status and progress</li>
                  <li>Mark tasks as completed</li>
                  <li>Collaborate with team members</li>
                  <li>Track personal progress</li>
                  <li>View announcements</li>
                </ul>
              </Box>
            )}
          </Box>
        )}
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