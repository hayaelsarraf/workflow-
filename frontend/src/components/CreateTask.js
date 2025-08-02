import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Chip,
  Divider,
  Tooltip,
  FormControlLabel,
  Checkbox // ✅ Add Checkbox import
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon, // ✅ Add notification icon
  NotificationsOff as NotificationsOffIcon // ✅ Add notification off icon
} from '@mui/icons-material';
import axios from 'axios';

const CreateTask = () => {
  const navigate = useNavigate();
  const { fetchNotifications } = useNotifications();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    assignee_id: '',
    notify_on_view: true // ✅ Add notification preference
  });
  
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Notification state
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [notificationSent, setNotificationSent] = useState(false);

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/tasks/users/list', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUsers(response.data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users for assignment');
      }
    };

    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value // ✅ Handle checkbox
    });

    // Track selected assignee for notification preview
    if (name === 'assignee_id') {
      const assignee = users.find(user => user.id === parseInt(value));
      setSelectedAssignee(assignee || null);
    }
  };

  // Your existing file handling methods (handleFileChange, handleFileRemove, formatFileSize, validateForm)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
                           'application/pdf', 'application/msword', 
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'text/plain', 'text/csv', 
                           'application/vnd.ms-excel', 
                           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                           'application/vnd.ms-powerpoint',
                           'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                           'application/zip', 'application/x-rar-compressed'];

      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Allowed types: images, documents, spreadsheets, presentations, archives');
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    const fileInput = document.getElementById('attachment-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Task title is required');
      return false;
    }
    if (formData.title.length > 255) {
      setError('Task title must be less than 255 characters');
      return false;
    }
    if (formData.description.length > 5000) {
      setError('Description must be less than 5000 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    setUploadProgress(0);
    setNotificationSent(false);

    try {
      const formDataToSend = new FormData();
      
      // Append form fields
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('notify_on_view', formData.notify_on_view); // ✅ Add notification preference
      
      if (formData.assignee_id) {
        formDataToSend.append('assignee_id', formData.assignee_id.toString());
      }
      
      if (formData.due_date) {
        const dateValue = new Date(formData.due_date).toISOString();
        formDataToSend.append('due_date', dateValue);
      }

      if (selectedFile) {
        formDataToSend.append('attachment', selectedFile);
        console.log('📎 Attaching file:', selectedFile.name, formatFileSize(selectedFile.size));
      }

      console.log('📤 FormData contents:');
      for (let [key, value] of formDataToSend.entries()) {
        console.log(`- ${key}:`, value);
      }

      const response = await axios.post('http://localhost:5000/api/tasks', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        timeout: 30000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      console.log('✅ Task creation successful:', response.data);

      let successMessage = 'Task created successfully!';
      if (selectedAssignee) {
        successMessage += ` ${selectedAssignee.first_name} ${selectedAssignee.last_name} has been notified.`;
        if (formData.notify_on_view) {
          successMessage += ` You will be notified when they view it.`;
        } else {
          successMessage += ` No view notification will be sent.`;
        }
        setNotificationSent(true);
      }
      if (selectedFile) {
        successMessage += ` File "${selectedFile.name}" uploaded successfully.`;
      }
      
      setMessage(successMessage);

      try {
        await fetchNotifications();
        console.log('✅ Notifications refreshed');
      } catch (notificationError) {
        console.warn('⚠️ Failed to refresh notifications:', notificationError);
      }
      
      setTimeout(() => {
        navigate('/tasks', { 
          state: { 
            successMessage: `Task "${formData.title}" created successfully!`,
            taskCreated: true 
          }
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ Task creation error:', error);
      
      if (error.code === 'ECONNABORTED') {
        setError('Upload timeout - please try again with a smaller file or check your connection');
      } else if (error.response?.status === 500) {
        setError(`Server Error: ${error.response.data?.message || 'Internal server error - please try again'}`);
      } else if (error.response?.status === 400) {
        const errorMsg = error.response.data?.error || 'Validation error';
        const details = error.response.data?.details;
        if (details && Array.isArray(details)) {
          const validationErrors = details.map(err => err.msg || err.message).join(', ');
          setError(`${errorMsg}: ${validationErrors}`);
        } else {
          setError(`Validation Error: ${errorMsg}`);
        }
      } else if (error.response?.status === 401) {
        setError('Authentication Error: Please log in again');
        localStorage.removeItem('token');
        navigate('/login');
      } else if (error.response?.status === 403) {
        setError('Permission Error: You do not have permission to create tasks');
      } else {
        setError(`Upload Failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <TaskIcon color="primary" fontSize="large" />
          <Typography variant="h4" gutterBottom>
            Create New Task
          </Typography>
        </Box>

        {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Notification Preview */}
        {selectedAssignee && !loading && (
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
            icon={formData.notify_on_view ? <NotificationsIcon /> : <NotificationsOffIcon />}
          >
            <Typography variant="body2">
              <strong>📧 Assignment Notification:</strong> {selectedAssignee.first_name} {selectedAssignee.last_name} 
              ({selectedAssignee.email}) will be notified about this task assignment.
              {formData.notify_on_view ? (
                <><br /><strong>👁️ View Notification:</strong> You will be notified when they view this task.</>
              ) : (
                <><br /><strong>🔕 View Notification:</strong> You will NOT be notified when they view this task.</>
              )}
            </Typography>
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Task Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter task title..."
                helperText={`${formData.title.length}/255 characters`}
                error={formData.title.length > 255}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="Enter task description..."
                helperText={`${formData.description.length}/5000 characters`}
                error={formData.description.length > 5000}
              />
            </Grid>

            {/* Your existing file attachment section */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Attachment (Optional)
              </Typography>
              
              {!selectedFile ? (
                <Box>
                  <input
                    accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                    id="attachment-input"
                    type="file"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="attachment-input">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFileIcon />}
                      sx={{ mb: 1 }}
                    >
                      Choose File
                    </Button>
                  </label>
                  <Typography variant="caption" display="block" color="textSecondary">
                    Supported formats: Images, PDF, Word, Excel, PowerPoint, Text, Archives (Max: 10MB)
                  </Typography>
                </Box>
              ) : (
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {selectedFile.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatFileSize(selectedFile.size)}
                        </Typography>
                      </Box>
                      <Tooltip title="Remove file">
                        <IconButton 
                          color="error" 
                          onClick={handleFileRemove}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {loading && uploadProgress > 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Uploading... {uploadProgress}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ mb: 2 }}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Due Date"
                name="due_date"
                type="datetime-local"
                value={formData.due_date}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="When should this task be completed?"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Priority"
                >
                  <MenuItem value="low">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="LOW" color="info" size="small" />
                      Low Priority
                    </Box>
                  </MenuItem>
                  <MenuItem value="medium">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="MEDIUM" color="warning" size="small" />
                      Medium Priority
                    </Box>
                  </MenuItem>
                  <MenuItem value="high">
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label="HIGH" color="error" size="small" />
                      High Priority
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Assign To</InputLabel>
                <Select
                  name="assignee_id"
                  value={formData.assignee_id}
                  onChange={handleChange}
                  label="Assign To"
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon fontSize="small" />
                        {user.first_name} {user.last_name} 
                        <Chip 
                          label={user.role.toUpperCase()} 
                          size="small" 
                          variant="outlined"
                          color={user.role === 'admin' ? 'error' : user.role === 'manager' ? 'warning' : 'default'}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {selectedAssignee && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    📧 {selectedAssignee.first_name} will receive a notification about this assignment
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* ✅ NEW: Notification Preference Checkbox */}
            {formData.assignee_id && (
              <Grid item xs={12}>
                <Card variant="outlined" sx={{ p: 2, backgroundColor: 'rgba(25, 118, 210, 0.02)' }}>
                  <Typography variant="h6" gutterBottom>
                    Notification Settings
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="notify_on_view"
                        checked={formData.notify_on_view}
                        onChange={handleChange}
                        color="primary"
                      />
                    }
                    label={
                      <Box display="flex" alignItems="center" gap={1}>
                        {formData.notify_on_view ? <NotificationsIcon color="primary" /> : <NotificationsOffIcon />}
                        <Typography variant="body2">
                          Notify me when the assignee views this task
                        </Typography>
                      </Box>
                    }
                  />
                  <Typography variant="caption" color="textSecondary" display="block" sx={{ ml: 4 }}>
                    {formData.notify_on_view ? 
                      "You'll receive a notification when the assigned member opens this task" :
                      "You won't be notified when the assigned member views this task"
                    }
                  </Typography>
                </Card>
              </Grid>
            )}

            {/* Task Summary Preview */}
            {formData.title && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Task Summary
                </Typography>
                <Card variant="outlined" sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {formData.title}
                  </Typography>
                  {formData.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                      {formData.description.substring(0, 150)}
                      {formData.description.length > 150 && '...'}
                    </Typography>
                  )}
                  <Box display="flex" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
                    <Chip 
                      label={formData.priority.toUpperCase()} 
                      color={
                        formData.priority === 'high' ? 'error' :
                        formData.priority === 'medium' ? 'warning' : 'info'
                      }
                      size="small"
                    />
                    {selectedAssignee && (
                      <Chip 
                        label={`Assigned to ${selectedAssignee.first_name}`}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {selectedFile && (
                      <Chip 
                        label={`File: ${selectedFile.name}`}
                        color="secondary"
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {formData.due_date && (
                      <Chip 
                        label={`Due: ${new Date(formData.due_date).toLocaleDateString()}`}
                        color="default"
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {/* ✅ NEW: View notification preference chip */}
                    {formData.assignee_id && (
                      <Chip 
                        label={formData.notify_on_view ? "View notifications: ON" : "View notifications: OFF"}
                        color={formData.notify_on_view ? "success" : "default"}
                        size="small"
                        variant="outlined"
                        icon={formData.notify_on_view ? <NotificationsIcon /> : <NotificationsOffIcon />}
                      />
                    )}
                  </Box>
                </Card>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/tasks')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !formData.title.trim()}
                  startIcon={loading ? null : <TaskIcon />}
                >
                  {loading ? 'Creating...' : 'Create Task'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateTask;
