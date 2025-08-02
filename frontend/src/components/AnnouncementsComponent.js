import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Badge,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Announcement as AnnouncementIcon,
  Course as CourseIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  ThumbUp as InterestIcon,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAnnouncements } from '../contexts/AnnouncementContext';
import { useAuth } from '../contexts/AuthContext';

const AnnouncementsComponent = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    announcements,
    myAnnouncements,
    loading,
    unreadCount,
    createAnnouncement,
    markAsViewed,
    showCourseInterest,
    getCourseInterests,
    deleteAnnouncement
  } = useAnnouncements();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [showInterestsDialog, setShowInterestsDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [courseInterests, setCourseInterests] = useState([]);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'general',
    course_name: '',
    course_description: '',
    course_start_date: '',
    target_audience: 'all'
  });

  const [interestData, setInterestData] = useState({
    interest_level: 'interested',
    message: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      announcement_type: 'general',
      course_name: '',
      course_description: '',
      course_start_date: '',
      target_audience: 'all'
    });
  };

  const handleCreateAnnouncement = async () => {
    try {
      await createAnnouncement(formData);
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const handleMarkAsViewed = async (announcementId) => {
    await markAsViewed(announcementId);
  };

  const handleShowInterest = async () => {
    try {
      await showCourseInterest(selectedAnnouncement.id, interestData);
      setShowInterestDialog(false);
      setInterestData({ interest_level: 'interested', message: '' });
    } catch (error) {
      console.error('Failed to show interest:', error);
    }
  };

  const handleViewInterests = async (announcement) => {
    try {
      const interests = await getCourseInterests(announcement.id);
      setCourseInterests(interests);
      setSelectedAnnouncement(announcement);
      setShowInterestsDialog(true);
    } catch (error) {
      console.error('Failed to fetch course interests:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getAnnouncementIcon = (type) => {
    switch (type) {
      case 'course_enrollment':
        return <CourseIcon />;
      default:
        return <AnnouncementIcon />;
    }
  };

  const getAnnouncementColor = (type) => {
    switch (type) {
      case 'course_enrollment':
        return 'success';
      case 'urgent':
        return 'error';
      default:
        return 'info';
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={unreadCount} color="error">
              <AnnouncementIcon color="primary" />
            </Badge>
            <Typography variant="h6">Announcements</Typography>
          </Box>
          <Box>
            {['manager', 'admin'].includes(user.role) && (
              <>
                <Button
                  onClick={() => setActiveTab('all')}
                  variant={activeTab === 'all' ? 'contained' : 'outlined'}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  All Announcements
                </Button>
                <Button
                  onClick={() => setActiveTab('my')}
                  variant={activeTab === 'my' ? 'contained' : 'outlined'}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  My Announcements
                </Button>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setShowCreateDialog(true)}
                  variant="contained"
                  size="small"
                  sx={{ mr: 1 }}
                >
                  Create
                </Button>
              </>
            )}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
        <Grid container spacing={2}>
          {(activeTab === 'all' ? announcements : myAnnouncements).map((announcement) => (
            <Grid item xs={12} key={announcement.id}>
              <Card
                sx={{
                  border: announcement.is_viewed === false ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  bgcolor: announcement.is_viewed === false ? 'rgba(25, 118, 210, 0.02)' : 'white'
                }}
              >
                <CardContent>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {getAnnouncementIcon(announcement.announcement_type)}
                      <Typography variant="h6" fontWeight="bold">
                        {announcement.title}
                      </Typography>
                      {announcement.is_viewed === false && (
                        <Chip label="NEW" size="small" color="primary" />
                      )}
                    </Box>
                    <Box display="flex" gap={1}>
                      <Chip 
                        label={announcement.announcement_type.replace('_', ' ')} 
                        size="small" 
                        color={getAnnouncementColor(announcement.announcement_type)}
                      />
                      {activeTab === 'my' && (
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => deleteAnnouncement(announcement.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <Typography variant="body1" paragraph>
                    {announcement.content}
                  </Typography>

                  {announcement.announcement_type === 'course_enrollment' && announcement.course_name && (
                    <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        📚 Course Details:
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Course:</strong> {announcement.course_name}
                      </Typography>
                      {announcement.course_description && (
                        <Typography variant="body2" gutterBottom>
                          <strong>Description:</strong> {announcement.course_description}
                        </Typography>
                      )}
                      {announcement.course_start_date && (
                        <Typography variant="body2" gutterBottom>
                          <strong>Start Date:</strong> {formatDate(announcement.course_start_date)}
                        </Typography>
                      )}
                    </Box>
                  )}

                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="caption" color="textSecondary">
                      By {announcement.sender_first_name} {announcement.sender_last_name} • {formatDate(announcement.created_at)}
                    </Typography>
                    
                    {announcement.announcement_type === 'course_enrollment' && announcement.total_interested > 0 && (
                      <Chip 
                        icon={<PeopleIcon />}
                        label={`${announcement.total_interested} interested`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </CardContent>

                <CardActions>
                  {!announcement.is_viewed && activeTab === 'all' && (
                    <Button
                      startIcon={<ViewIcon />}
                      onClick={() => handleMarkAsViewed(announcement.id)}
                      size="small"
                    >
                      Mark as Read
                    </Button>
                  )}

                  {announcement.announcement_type === 'course_enrollment' && activeTab === 'all' && (
                    <>
                      {!announcement.interest_level ? (
                        <Button
                          startIcon={<InterestIcon />}
                          onClick={() => {
                            setSelectedAnnouncement(announcement);
                            setShowInterestDialog(true);
                          }}
                          size="small"
                          color="success"
                        >
                          Show Interest
                        </Button>
                      ) : (
                        <Chip
                          icon={<InterestIcon />}
                          label={`You're ${announcement.interest_level}`}
                          size="small"
                          color="success"
                        />
                      )}
                    </>
                  )}

                  {activeTab === 'my' && announcement.announcement_type === 'course_enrollment' && announcement.interest_count > 0 && (
                    <Button
                      startIcon={<PeopleIcon />}
                      onClick={() => handleViewInterests(announcement)}
                      size="small"
                    >
                      View Interests ({announcement.interest_count})
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {(activeTab === 'all' ? announcements : myAnnouncements).length === 0 && (
          <Box textAlign="center" py={4}>
            <AnnouncementIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No announcements yet
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {activeTab === 'all' ? 'Check back later for updates' : 'Create your first announcement'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Create Announcement Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Announcement</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.announcement_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, announcement_type: e.target.value }))}
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="course_enrollment">Course Enrollment</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Target Audience</InputLabel>
                <Select
                  value={formData.target_audience}
                  onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                >
                  <MenuItem value="all">All Users</MenuItem>
                  <MenuItem value="members">Members Only</MenuItem>
                  <MenuItem value="managers">Managers Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {formData.announcement_type === 'course_enrollment' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Course Name"
                    value={formData.course_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, course_name: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Course Description"
                    value={formData.course_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, course_description: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Course Start Date"
                    InputLabelProps={{ shrink: true }}
                    value={formData.course_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, course_start_date: e.target.value }))}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateAnnouncement} variant="contained">
            Create Announcement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Show Interest Dialog */}
      <Dialog open={showInterestDialog} onClose={() => setShowInterestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Show Interest in Course</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Interest Level</InputLabel>
                <Select
                  value={interestData.interest_level}
                  onChange={(e) => setInterestData(prev => ({ ...prev, interest_level: e.target.value }))}
                >
                  <MenuItem value="interested">Interested</MenuItem>
                  <MenuItem value="very_interested">Very Interested</MenuItem>
                  <MenuItem value="maybe">Maybe</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Additional Message (Optional)"
                value={interestData.message}
                onChange={(e) => setInterestData(prev => ({ ...prev, message: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInterestDialog(false)}>Cancel</Button>
          <Button onClick={handleShowInterest} variant="contained" color="success">
            Show Interest
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Course Interests Dialog */}
      <Dialog open={showInterestsDialog} onClose={() => setShowInterestsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Course Interests - {selectedAnnouncement?.course_name}</DialogTitle>
        <DialogContent>
          <List>
            {courseInterests.map((interest) => (
              <ListItem key={interest.id}>
                <ListItemAvatar>
                  <Avatar>{interest.first_name[0]}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${interest.first_name} ${interest.last_name}`}
                  secondary={
                    <Box>
                      <Chip 
                        label={interest.interest_level.replace('_', ' ')} 
                        size="small" 
                        color="success" 
                        sx={{ mr: 1 }}
                      />
                      {interest.message && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          "{interest.message}"
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary">
                        Responded on {formatDate(interest.created_at)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
          {courseInterests.length === 0 && (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>
              No interests yet
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInterestsDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default AnnouncementsComponent;
