import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Box
} from '@mui/material';
import { Assignment as TaskIcon } from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';

const LoginNotifications = ({ open, onClose }) => {
  const { fetchUnreadNotifications, markTaskAsViewed } = useNotifications();
  const [unreadNotifications, setUnreadNotifications] = useState([]);

  useEffect(() => {
    if (open) {
      loadUnreadNotifications();
    }
  }, [open]);

  const loadUnreadNotifications = async () => {
    const notifications = await fetchUnreadNotifications();
    setUnreadNotifications(notifications.filter(n => n.type === 'task_assigned'));
  };

  const handleViewTask = async (notification) => {
    try {
      await markTaskAsViewed(notification.task_id);
      // Remove from list after viewing
      setUnreadNotifications(prev => 
        prev.filter(n => n.id !== notification.id)
      );
    } catch (error) {
      console.error('Failed to mark task as viewed:', error);
    }
  };

  if (unreadNotifications.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">
          📋 New Task Assignments ({unreadNotifications.length})
        </Typography>
        <Typography variant="body2" color="textSecondary">
          You have new tasks assigned to you while you were away
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <List>
          {unreadNotifications.map((notification) => (
            <ListItem
              key={notification.id}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                mb: 1,
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }}
            >
              <ListItemIcon>
                <TaskIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={notification.task_title}
                secondary={
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Assigned by: {notification.sender_first_name} {notification.sender_last_name}
                    </Typography>
                    <Box display="flex" gap={1} mt={1}>
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
                        label={new Date(notification.created_at).toLocaleDateString()}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                }
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleViewTask(notification)}
              >
                Mark as Viewed
              </Button>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LoginNotifications;
