import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Avatar
} from '@mui/material';
import { AccountCircle, AdminPanelSettings, Task } from '@mui/icons-material';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleClose();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Workflow Management
        </Typography>
        
        {user && (
          <>
            {/* Role-based navigation */}
            <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
              <Button color="inherit" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
              
              <Button 
                color="inherit" 
                onClick={() => navigate('/tasks')}
                startIcon={<Task />}
              >
                Tasks
              </Button>
              
              {(user.role === 'admin' || user.role === 'manager') && (
                <Button color="inherit" onClick={() => navigate('/projects')}>
                  Projects
                </Button>
              )}
              
              {user.role === 'admin' && (
                <Button 
                  color="inherit" 
                  onClick={() => navigate('/admin')}
                  startIcon={<AdminPanelSettings />}
                >
                  Admin
                </Button>
              )}
            </Box>

            <NotificationBell />

            {/* User menu */}
            <Box>
              <IconButton
                size="large"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user.first_name.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleProfile}>
                  <AccountCircle sx={{ mr: 2 }} />
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;