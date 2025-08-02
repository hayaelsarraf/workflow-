import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Divider,
  Grid,
  Paper
} from '@mui/material';
import {
  Announcement as AnnouncementIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAnnouncements } from '../contexts/AnnouncementContext';
import { useAuth } from '../contexts/AuthContext';

const AnnouncementsComponent = () => {
  const { user } = useAuth();
  const { announcements, loading, deleteAnnouncement } = useAnnouncements();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);

  const handleViewAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement);
  };

  const handleDeleteClick = (announcement) => {
    setAnnouncementToDelete(announcement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteAnnouncement(announcementToDelete.id);
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  const getAnnouncementTypeColor = (type) => {
    switch (type) {
      case 'urgent': return 'error';
      case 'course_enrollment': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canManageAnnouncements = user?.role === 'admin' || user?.role === 'manager';

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Loading announcements...</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <AnnouncementIcon color="primary" />
        <Typography variant="h6">Announcements</Typography>
      </Box>

      {announcements.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <AnnouncementIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>
              No Announcements
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {canManageAnnouncements 
                ? 'Create your first announcement to keep your team informed.'
                : 'No announcements have been posted yet.'
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {announcements.map((announcement) => (
            <Grid item xs={12} md={6} key={announcement.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: announcement.announcement_type === 'urgent' ? '2px solid #f44336' : '1px solid #e0e0e0',
                  '&:hover': {
                    boxShadow: 2,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {announcement.title}
                      </Typography>
                      <Chip 
                        label={announcement.announcement_type} 
                        color={getAnnouncementTypeColor(announcement.announcement_type)}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    
                    {canManageAnnouncements && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewAnnouncement(announcement)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(announcement)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  <Typography 
                    variant="body2" 
                    color="textSecondary" 
                    sx={{ 
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {announcement.content}
                  </Typography>

                  {announcement.announcement_type === 'course_enrollment' && announcement.course_name && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Course: {announcement.course_name}
                      </Typography>
                      {announcement.course_start_date && (
                        <Typography variant="body2">
                          Start Date: {formatDate(announcement.course_start_date)}
                        </Typography>
                      )}
                    </Alert>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(announcement.created_at)}
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={() => handleViewAnnouncement(announcement)}
                      startIcon={<VisibilityIcon />}
                    >
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* View Announcement Dialog */}
      <Dialog 
        open={!!selectedAnnouncement} 
        onClose={() => setSelectedAnnouncement(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedAnnouncement && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedAnnouncement.title}</Typography>
                <IconButton onClick={() => setSelectedAnnouncement(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Chip 
                label={selectedAnnouncement.announcement_type} 
                color={getAnnouncementTypeColor(selectedAnnouncement.announcement_type)}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedAnnouncement.content}
              </Typography>

              {selectedAnnouncement.announcement_type === 'course_enrollment' && selectedAnnouncement.course_name && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Course: {selectedAnnouncement.course_name}
                  </Typography>
                  {selectedAnnouncement.course_description && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {selectedAnnouncement.course_description}
                    </Typography>
                  )}
                  {selectedAnnouncement.course_start_date && (
                    <Typography variant="body2">
                      Start Date: {formatDate(selectedAnnouncement.course_start_date)}
                    </Typography>
                  )}
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" color="textSecondary">
                Posted on {formatDate(selectedAnnouncement.created_at)}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAnnouncement(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Announcement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{announcementToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default AnnouncementsComponent;