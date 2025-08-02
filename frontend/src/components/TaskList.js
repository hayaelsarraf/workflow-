import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Paper,
  Button,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Update as UpdateIcon,
  CheckCircle as CompleteIcon,
  AttachFile as AttachFileIcon,
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon // ✅ Added PDF icon
} from '@mui/icons-material';
import axios from 'axios';

const TaskList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Status update dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [dialogTask, setDialogTask] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/tasks');
      setTasks(response.data.tasks);
    } catch (error) {
      setError('Failed to fetch tasks');
      console.error('Fetch tasks error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Handle file download
  const handleDownloadAttachment = async (task) => {
    if (!task.attachment_path || !task.attachment_name) {
      setError('No attachment available for download');
      return;
    }

    try {
      console.log('📥 Downloading attachment:', task.attachment_name);
      
      // Extract filename from path
      const filename = task.attachment_path.split('/').pop() || task.attachment_name;
      
      const response = await axios.get(`http://localhost:5000/api/tasks/attachments/${filename}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        responseType: 'blob', // Important for file downloads
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', task.attachment_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Download successful:', task.attachment_name);
    } catch (error) {
      console.error('❌ Download error:', error);
      setError(`Failed to download ${task.attachment_name}: ${error.response?.data?.error || error.message}`);
    }
  };

  // ✅ NEW: Format file size for display
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ✅ NEW: Get file icon based on type
  const getFileIcon = (filename) => {
    if (!filename) return <AttachFileIcon />;
    
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'doc':
      case 'docx':
        return <AttachFileIcon color="primary" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <AttachFileIcon color="success" />;
      case 'xls':
      case 'xlsx':
        return <AttachFileIcon color="warning" />;
      default:
        return <AttachFileIcon />;
    }
  };

  const handleMenuOpen = (event, task) => {
    setAnchorEl(event.currentTarget);
    setSelectedTask(task);
    console.log('📋 Menu opened for task:', task.id, task.title);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    console.log('📋 Menu closed');
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) {
      console.error('❌ No selected task for deletion');
      return;
    }
    
    try {
      await axios.delete(`http://localhost:5000/api/tasks/${selectedTask.id}`);
      await fetchTasks();
      setSuccess('Task deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to delete task');
      console.error('Delete task error:', error);
    } finally {
      setSelectedTask(null);
      handleMenuClose();
    }
  };

  const handleEditStatus = () => {
    console.log('🔧 Edit status clicked. Selected task:', selectedTask);
    
    if (!selectedTask) {
      console.error('❌ No selected task when opening status dialog');
      setError('No task selected for editing');
      return;
    }
    
    setDialogTask(selectedTask);
    setNewStatus(selectedTask.status || 'todo');
    setProgressNotes('');
    setStatusDialogOpen(true);
    
    console.log('✅ Status dialog opened for task:', selectedTask.id, selectedTask.title);
    
    handleMenuClose();
    setSelectedTask(null);
  };

  const handleStatusSubmit = async () => {
    console.log('🚀 ===== FRONTEND UPDATE REQUEST =====');
    console.log('📊 Current dialog state:', {
      dialogTaskId: dialogTask?.id,
      dialogTaskTitle: dialogTask?.title,
      newStatus,
      progressNotesLength: progressNotes.length,
      updatingStatus
    });

    if (!dialogTask) {
      console.error('❌ No dialog task available');
      setError('No task available for update. Please try again.');
      return;
    }

    if (!newStatus) {
      console.error('❌ No status selected');
      setError('Please select a status');
      return;
    }

    setUpdatingStatus(true);
    
    try {
      let updateData = {
        status: newStatus
      };

      if (progressNotes.trim()) {
        const timestamp = new Date().toLocaleString();
        const noteText = `--- Progress Update (${timestamp}) ---\n${progressNotes.trim()}`;
        updateData.description = dialogTask.description 
          ? `${dialogTask.description}\n\n${noteText}`
          : noteText;
      }

      console.log('📤 Sending update request:', {
        url: `http://localhost:5000/api/tasks/${dialogTask.id}`,
        method: 'PUT',
        data: updateData,
        headers: {
          'Authorization': localStorage.getItem('token') ? 'Bearer [TOKEN_PRESENT]' : 'NO_TOKEN',
          'Content-Type': 'application/json'
        }
      });

      const response = await axios.put(`http://localhost:5000/api/tasks/${dialogTask.id}`, updateData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('✅ ===== FRONTEND UPDATE SUCCESS =====');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);

      await fetchTasks();
      setStatusDialogOpen(false);
      setSuccess(`Task "${dialogTask.title}" status updated to ${newStatus.replace('_', ' ').toUpperCase()}!`);
      setTimeout(() => setSuccess(''), 3000);
      
      setDialogTask(null);
      setNewStatus('');
      setProgressNotes('');
      
    } catch (error) {
      console.log('❌ ===== FRONTEND UPDATE ERROR =====');
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      setError(`Failed to update task status: ${error.response?.data?.error || error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleQuickStatusChange = (task, newStatusValue) => {
    console.log('⚡ Quick status change for task:', task.id, 'to:', newStatusValue);
    setDialogTask(task);
    setNewStatus(newStatusValue);
    setProgressNotes('');
    setStatusDialogOpen(true);
  };

  const handleQuickComplete = async (task) => {
    try {
      console.log('✅ Quick completing task:', task.id);
      
      await axios.put(`http://localhost:5000/api/tasks/${task.id}`, {
        status: 'done'
      });
      
      await fetchTasks();
      setSuccess(`Task "${task.title}" marked as complete!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('❌ Quick complete error:', error);
      setError('Failed to update task status');
    }
  };

  const handleDialogClose = () => {
    console.log('❌ Dialog closing');
    setStatusDialogOpen(false);
    setDialogTask(null);
    setNewStatus('');
    setProgressNotes('');
    setUpdatingStatus(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'success';
      case 'in_progress': return 'primary';
      case 'todo': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const canCreateTasks = user?.role === 'admin' || user?.role === 'manager';
  
  const canEditTask = (task) => {
    if (!task) return false;
    return user?.role === 'admin' || task.created_by === user?.id || task.assignee_id === user?.id;
  };
  
  const canDeleteTask = (task) => {
    if (!task) return false;
    return user?.role === 'admin' || task.created_by === user?.id;
  };

  const isAssignedToTask = (task) => {
    return task && task.assignee_id === user?.id;
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>Loading tasks...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            My Tasks ({tasks.length})
          </Typography>
          {canCreateTasks && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/tasks/create')}
            >
              Create Task
            </Button>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Title</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Priority</strong></TableCell>
                <TableCell><strong>Assignee</strong></TableCell>
                <TableCell><strong>Due Date</strong></TableCell>
                <TableCell><strong>Created By</strong></TableCell>
                <TableCell><strong>Attachment</strong></TableCell> {/* ✅ NEW: Attachment column */}
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}> {/* ✅ Updated colSpan to 8 */}
                    <Typography variant="body1" color="textSecondary">
                      No tasks found. {canCreateTasks && 'Create your first task to get started!'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {task.title}
                          {isAssignedToTask(task) && (
                            <Chip
                              label="Mine"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                        {task.description && (
                          <Typography variant="body2" color="textSecondary">
                            {task.description.substring(0, 100)}
                            {task.description.length > 100 && '...'}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={canEditTask(task) ? "Click to change status" : "Task status"}>
                        <Chip
                          label={task.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(task.status)}
                          size="small"
                          clickable={canEditTask(task)}
                          onClick={canEditTask(task) ? () => handleQuickStatusChange(task, task.status) : undefined}
                          sx={{
                            cursor: canEditTask(task) ? 'pointer' : 'default',
                            '&:hover': canEditTask(task) ? {
                              transform: 'scale(1.05)',
                              boxShadow: 2
                            } : {}
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.priority.toUpperCase()}
                        color={getPriorityColor(task.priority)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {task.assignee_first_name ? (
                        `${task.assignee_first_name} ${task.assignee_last_name}`
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(task.due_date)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {task.creator_first_name} {task.creator_last_name}
                    </TableCell>
                    
                    {/* ✅ NEW: Attachment Column */}
                    <TableCell>
                      {task.attachment_name ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            {getFileIcon(task.attachment_name)}
                            <Box>
                              <Typography variant="caption" display="block">
                                {task.attachment_name.length > 20 
                                  ? `${task.attachment_name.substring(0, 20)}...`
                                  : task.attachment_name
                                }
                              </Typography>
                              <Typography variant="caption" color="textSecondary" display="block">
                                {formatFileSize(task.attachment_size)}
                              </Typography>
                            </Box>
                          </Box>
                          <Tooltip title={`Download ${task.attachment_name}`}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleDownloadAttachment(task)}
                              sx={{ ml: 0.5 }}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No attachment
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        {isAssignedToTask(task) && task.status === 'in_progress' && (
                          <Tooltip title="Mark complete">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleQuickComplete(task)}
                            >
                              <CompleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        
                        {canEditTask(task) && (
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, task)}
                            size="small"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEditStatus}>
            <UpdateIcon sx={{ mr: 1 }} />
            Update Status
          </MenuItem>
          {canDeleteTask(selectedTask) && (
            <MenuItem
              onClick={handleDeleteTask}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          )}
        </Menu>

        {/* Status Update Dialog */}
        <Dialog 
          open={statusDialogOpen} 
          onClose={handleDialogClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Update Task Status
            <Typography variant="body2" color="textSecondary">
              {dialogTask?.title || 'Loading...'}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newStatus}
                  onChange={(e) => {
                    console.log('📝 Status changed to:', e.target.value);
                    setNewStatus(e.target.value);
                  }}
                  label="Status"
                >
                  <MenuItem value="todo">To Do</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Progress Notes (Optional)"
                multiline
                rows={3}
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Add progress updates, blockers, or completion notes..."
                helperText="These notes will be added to the task description with timestamp"
              />

              {/* Debug Info */}
              <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem' }}>
                <Typography variant="caption" display="block">
                  Debug Info:
                </Typography>
                <Typography variant="caption" display="block">
                  • Dialog Task ID: {dialogTask?.id || 'None'}
                </Typography>
                <Typography variant="caption" display="block">
                  • New Status: {newStatus || 'None'}
                </Typography>
                <Typography variant="caption" display="block">
                  • Updating: {updatingStatus ? 'Yes' : 'No'}
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleDialogClose}
              disabled={updatingStatus}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStatusSubmit}
              variant="contained"
              disabled={updatingStatus}
            >
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default TaskList;
