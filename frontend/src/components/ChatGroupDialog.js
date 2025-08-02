import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
  Typography,
  Box,
  Chip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const ChatGroupDialog = ({ open, onClose, onGroupCreated }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableUsers();
  }, []);

  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter out current user and inactive users
      const filteredUsers = response.data.users.filter(u => 
        u.id !== user.id && u.is_active
      );
      
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setError('Failed to load available users');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/chat-groups',
        {
          name,
          description,
          members: selectedUsers
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      onGroupCreated(response.data.group);
      handleClose();
    } catch (error) {
      console.error('Failed to create group:', error);
      setError(error.response?.data?.error || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedUsers([]);
    setError('');
    onClose();
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Only show dialog if user is a manager
  if (user.role !== 'manager' && user.role !== 'admin') {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <GroupIcon sx={{ mr: 1 }} />
          Create New Chat Group
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Group Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            margin="normal"
          />

          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            margin="normal"
          />

          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Select Group Members
          </Typography>

          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {availableUsers.map((u) => (
              <ListItem key={u.id} dense>
                <Checkbox
                  edge="start"
                  checked={selectedUsers.includes(u.id)}
                  onChange={() => handleUserToggle(u.id)}
                />
                <ListItemText
                  primary={`${u.first_name} ${u.last_name}`}
                  secondary={u.email}
                />
                <Chip
                  label={u.role}
                  size="small"
                  color={u.role === 'manager' ? 'primary' : 'default'}
                  sx={{ ml: 1 }}
                />
              </ListItem>
            ))}
          </List>

          {selectedUsers.length > 0 && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {selectedUsers.length} members selected
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} startIcon={<CloseIcon />}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!name || selectedUsers.length === 0 || loading}
            startIcon={<AddIcon />}
          >
            Create Group
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChatGroupDialog;
