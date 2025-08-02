import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Announcement as AnnouncementIcon,
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useAnnouncements } from '../contexts/AnnouncementContext';

const CreateAnnouncement = ({ open, onClose }) => {
  const { createAnnouncement } = useAnnouncements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'general',
    course_name: '',
    course_description: '',
    course_start_date: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Clean up form data - remove empty course fields if not course_enrollment type
      const cleanData = { ...formData };
      if (formData.announcement_type !== 'course_enrollment') {
        cleanData.course_name = '';
        cleanData.course_description = '';
        cleanData.course_start_date = '';
      }

      await createAnnouncement(cleanData);
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        announcement_type: 'general',
        course_name: '',
        course_description: '',
        course_start_date: ''
      });
      
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const getAnnouncementTypeColor = (type) => {
    switch (type) {
      case 'urgent': return 'error';
      case 'course_enrollment': return 'info';
      default: return 'default';
    }
  };

  if (!open) return null;

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3,
        border: '1px solid #e0e0e0',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnnouncementIcon color="primary" />
          <Typography variant="h6">Create Announcement</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Announcement Type</InputLabel>
            <Select
              name="announcement_type"
              value={formData.announcement_type}
              onChange={handleChange}
              label="Announcement Type"
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="course_enrollment">Course Enrollment</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </Select>
          </FormControl>
          
          <Chip 
            label={`Type: ${formData.announcement_type}`} 
            color={getAnnouncementTypeColor(formData.announcement_type)}
            size="small"
          />
        </Box>

        <TextField
          fullWidth
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          required
          multiline
          rows={4}
          sx={{ mb: 2 }}
        />

        {formData.announcement_type === 'course_enrollment' && (
          <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Course Information
            </Typography>
            
            <TextField
              fullWidth
              label="Course Name"
              name="course_name"
              value={formData.course_name}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Course Description"
              name="course_description"
              value={formData.course_description}
              onChange={handleChange}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Course Start Date"
              name="course_start_date"
              type="date"
              value={formData.course_start_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            endIcon={<SendIcon />}
          >
            {loading ? 'Creating...' : 'Post Announcement'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default CreateAnnouncement;