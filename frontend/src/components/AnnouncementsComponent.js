import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge
} from '@mui/material';
import {
  Announcement as AnnouncementIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Group as GroupIcon,
  ThumbUp as ThumbUpIcon
} from '@mui/icons-material';
import { useAnnouncements } from '../contexts/AnnouncementContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const AnnouncementsComponent = () => {
  const { announcements, loading, deleteAnnouncement } = useAnnouncements();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Course interest states
  const [interestDialogOpen, setInterestDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [userInterest, setUserInterest] = useState({});
  const [interestCount, setInterestCount] = useState({});
  const [interestsList, setInterestsList] = useState({});
  const [submittingInterest, setSubmittingInterest] = useState(false);

  const getAnnouncementTypeColor = (type) => {
    switch (type) {
      case 'urgent': return 'error';
      case 'course_enrollment': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteClick = (announcement) => {
    setAnnouncementToDelete(announcement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return;
    
    try {
      setDeleting(true);
      await deleteAnnouncement(announcementToDelete.id);
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAnnouncementToDelete(null);
  };

  const canDeleteAnnouncement = (announcement) => {
    return user?.role === 'admin' || 
           (user?.role === 'manager' && announcement.sender_id === user?.id);
  };

  // ✅ SIMPLIFIED: Only check announcement type
  const isCourseEnrollment = (announcement) => {
    return announcement?.announcement_type === 'course_enrollment';
  };

  const fetchInterestCount = async (announcementId) => {
    if (!announcementId) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/course-interests/count/${announcementId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInterestCount(prev => ({
        ...prev,
        [announcementId]: response.data.count
      }));
    } catch (error) {
      console.error('Failed to fetch interest count:', error);
    }
  };

  const fetchUserInterest = async (announcementId) => {
    if (!announcementId) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/course-interests/user/${announcementId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUserInterest(prev => ({
        ...prev,
        [announcementId]: response.data.interest
      }));
    } catch (error) {
      console.error('Failed to fetch user interest:', error);
    }
  };

  const fetchInterestsList = async (announcementId) => {
    if (!announcementId) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/course-interests/announcement/${announcementId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setInterestsList(prev => ({
        ...prev,
        [announcementId]: response.data.interests
      }));
    } catch (error) {
      console.error('Failed to fetch interests list:', error);
    }
  };

  // ✅ SIMPLIFIED: Direct interest toggle for members
  const handleInterestToggle = async (announcement) => {
    if (!announcement?.id || user?.role !== 'member') return;
    
    try {
      setSubmittingInterest(true);
      
      if (userInterest[announcement.id]) {
        // Remove interest
        await axios.delete(`http://localhost:5000/api/course-interests/${announcement.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        setUserInterest(prev => ({
          ...prev,
          [announcement.id]: null
        }));
      } else {
        // Add interest
        await axios.post('http://localhost:5000/api/course-interests', {
          announcement_id: announcement.id,
          interest_level: 'interested',
          message: null
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        
        setUserInterest(prev => ({
          ...prev,
          [announcement.id]: { interest_level: 'interested' }
        }));
      }
      
      // Refresh interest count
      await fetchInterestCount(announcement.id);
    } catch (error) {
      console.error('Failed to toggle interest:', error);
    } finally {
      setSubmittingInterest(false);
    }
  };

  // ✅ MANAGER VIEW: Show interests list for managers/admins
  const handleViewInterests = async (announcement) => {
    if (!announcement?.id || (user?.role !== 'admin' && user?.role !== 'manager')) return;
    
    setSelectedAnnouncement(announcement);
    setInterestDialogOpen(true);
    await fetchInterestsList(announcement.id);
  };

  // Fetch interest counts for course enrollment announcements
  useEffect(() => {
    if (announcements && Array.isArray(announcements)) {
      announcements.forEach(announcement => {
        if (announcement?.id && isCourseEnrollment(announcement)) {
          fetchInterestCount(announcement.id);
          if (user?.role === 'member') {
            fetchUserInterest(announcement.id);
          }
        }
      });
    }
  }, [announcements, user?.role]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!announcements || !Array.isArray(announcements) || announcements.length === 0) {
    return (
      <Alert severity="info">
        No announcements available at the moment.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Recent Announcements
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {announcements.map((announcement) => {
          if (!announcement?.id) return null; // Skip invalid announcements
          
          return (
            <Card key={announcement.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AnnouncementIcon color="primary" />
                    <Typography variant="h6">
                      {announcement.title || 'Untitled Announcement'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={announcement.announcement_type || 'general'} 
                      color={getAnnouncementTypeColor(announcement.announcement_type)}
                      size="small"
                    />
                    {canDeleteAnnouncement(announcement) && (
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(announcement)}
                        title="Delete announcement"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Typography variant="body1" sx={{ mb: 2 }}>
                  {announcement.content || 'No content'}
                </Typography>

                {announcement.announcement_type === 'course_enrollment' && announcement.course_name && (
                  <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Course Details:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Course:</strong> {announcement.course_name}
                    </Typography>
                    {announcement.course_description && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Description:</strong> {announcement.course_description}
                      </Typography>
                    )}
                    {announcement.course_start_date && (
                      <Typography variant="body2">
                        <strong>Start Date:</strong> {formatDate(announcement.course_start_date)}
                      </Typography>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      <PersonIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="body2" color="textSecondary">
                      {announcement.sender_first_name || 'Unknown'} {announcement.sender_last_name || ''}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isCourseEnrollment(announcement) && (
                      <>
                        {/* ✅ MEMBERS ONLY: Simple interest toggle button */}
                        {user?.role === 'member' && (
                          <Button
                            size="small"
                            variant={userInterest[announcement.id] ? "contained" : "outlined"}
                            startIcon={<ThumbUpIcon />}
                            onClick={() => handleInterestToggle(announcement)}
                            disabled={submittingInterest}
                          >
                            <Badge badgeContent={interestCount[announcement.id] || 0} color="primary">
                              {userInterest[announcement.id] ? 'Interested' : 'Show Interest'}
                            </Badge>
                          </Button>
                        )}
                        
                        {/* ✅ MANAGERS/ADMINS: View interests button */}
                        {(user?.role === 'admin' || user?.role === 'manager') && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GroupIcon />}
                            onClick={() => handleViewInterests(announcement)}
                          >
                            <Badge badgeContent={interestCount[announcement.id] || 0} color="primary">
                              View Interests
                            </Badge>
                          </Button>
                        )}
                      </>
                    )}
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(announcement.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Announcement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the announcement "{announcementToDelete?.title}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ MANAGER VIEW: Course Interests List Dialog */}
      <Dialog open={interestDialogOpen} onClose={() => setInterestDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon color="primary" />
            <Typography variant="h6">
              Course Interests - {selectedAnnouncement?.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAnnouncement && interestsList[selectedAnnouncement.id] && (
            <Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedAnnouncement.content || 'No content'}
              </Typography>

              <Typography variant="h6" gutterBottom>
                Interested Members ({interestsList[selectedAnnouncement.id].length})
              </Typography>
              
              {interestsList[selectedAnnouncement.id].length === 0 ? (
                <Alert severity="info">
                  No members have expressed interest yet.
                </Alert>
              ) : (
                <List>
                  {interestsList[selectedAnnouncement.id].map((interest) => (
                    <ListItem key={interest.id} divider>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${interest.first_name || 'Unknown'} ${interest.last_name || ''} (${interest.role || 'member'})`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              <strong>Interest Level:</strong> {interest.interest_level}
                            </Typography>
                            {interest.message && (
                              <Typography variant="body2">
                                <strong>Message:</strong> {interest.message}
                              </Typography>
                            )}
                            <Typography variant="caption" color="textSecondary">
                              {formatDate(interest.created_at)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterestDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnouncementsComponent;