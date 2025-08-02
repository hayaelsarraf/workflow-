import React, { useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Typography,
  Chip,
  Box,
  Tooltip,
  Divider,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Group as GroupIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import ChatGroupDialog from './ChatGroupDialog';

const ChatGroupList = () => {
  const { user } = useAuth();
  const { groups, currentGroup, openGroup, closeGroup } = useChat();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const handleGroupClick = (group) => {
    openGroup(group.id);
  };

  const handleMenuClick = (event, group) => {
    event.stopPropagation();
    setSelectedGroup(group);
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedGroup(null);
  };

  const handleCloseGroup = async () => {
    if (selectedGroup) {
      await closeGroup(selectedGroup.id);
      handleMenuClose();
    }
  };

  const isManager = user.role === 'manager' || user.role === 'admin';

  return (
    <>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          Chat Groups
        </Typography>
        {isManager && (
          <Tooltip title="Create New Group">
            <IconButton color="primary" onClick={() => setShowCreateDialog(true)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Divider />

      <List>
        {groups.map((group) => (
          <ListItem
            key={group.id}
            button
            selected={currentGroup?.id === group.id}
            onClick={() => handleGroupClick(group)}
            sx={{
              opacity: group.is_active ? 1 : 0.6,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: group.is_active ? 'primary.main' : 'grey.500' }}>
                <GroupIcon />
              </Avatar>
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Typography noWrap>
                  {group.name}
                  {!group.is_active && (
                    <Chip
                      size="small"
                      label="Closed"
                      color="default"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              }
              secondary={`${group.member_names?.split(',').length || 0} members`}
            />

            {isManager && group.manager_id === user.id && (
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  onClick={(e) => handleMenuClick(e, group)}
                  size="small"
                >
                  <MoreVertIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )}
          </ListItem>
        ))}
      </List>

      {/* Group Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedGroup?.is_active ? (
          <MenuItem onClick={handleCloseGroup}>
            <CloseIcon sx={{ mr: 1 }} fontSize="small" />
            Close Group
          </MenuItem>
        ) : (
          <MenuItem onClick={handleCloseGroup}>
            <GroupIcon sx={{ mr: 1 }} fontSize="small" />
            Reopen Group
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit Members
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete Group
        </MenuItem>
      </Menu>

      {/* Create Group Dialog */}
      <ChatGroupDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onGroupCreated={(group) => {
          setShowCreateDialog(false);
          openGroup(group.id);
        }}
      />
    </>
  );
};

export default ChatGroupList;
