import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  Button,
  Alert,
  Chip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Assignment as TaskIcon,
  Visibility as ViewIcon,
  Update as UpdateIcon
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationBell = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    markTaskAsViewed,
    fetchNotifications 
  } = useNotifications();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewedTasks, setViewedTasks] = useState(new Set());

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const handleMarkTaskViewed = async (notification) => {
    try {
      await markTaskAsViewed(notification.task_id);
      setViewedTasks(prev => new Set([...prev, notification.task_id]));
      
      // Mark the notification as read too
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
    } catch (error) {
      console.error('Failed to mark task as viewed:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return <TaskIcon color="primary" fontSize="small" />;
      case 'task_viewed':
        return <ViewIcon color="success" fontSize="small" />;
      case 'task_updated':
        return <UpdateIcon color="warning" fontSize="small" />;
      default:
        return <TaskIcon fontSize="small" />;
    }
  };

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
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ ml: 2 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Notifications ({unreadCount})
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </Box>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {notifications.slice(0, 10).map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: notification.is_read ? 'transparent' : 'rgba(25, 118, 210, 0.04)'
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1} width="100%">
                  {getNotificationIcon(notification.type)}
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={notification.is_read ? 'normal' : 'bold'}>
                      {notification.message}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                      <Typography variant="caption" color="textSecondary">
                        From: {notification.sender_first_name} {notification.sender_last_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {formatTime(notification.created_at)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                      <Chip
                        label={notification.task_priority?.toUpperCase() || 'MEDIUM'}
                        size="small"
                        color={
                          notification.task_priority === 'high' ? 'error' :
                          notification.task_priority === 'medium' ? 'warning' : 'info'
                        }
                      />
                      {notification.type === 'task_assigned' && !viewedTasks.has(notification.task_id) && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ViewIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkTaskViewed(notification);
                          }}
                        >
                          Mark Viewed
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Box>
        )}

        {notifications.length > 10 && (
          <Box sx={{ p: 1, textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
            <Button size="small" onClick={fetchNotifications}>
              Load more
            </Button>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;