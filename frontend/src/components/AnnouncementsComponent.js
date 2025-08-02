import React from 'react';
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
  Button
} from '@mui/material';
import {
  Announcement as AnnouncementIcon,
  Person as PersonIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAnnouncements } from '../contexts/AnnouncementContext';
import { useAuth } from '../contexts/AuthContext';

const AnnouncementsComponent = () => {
  const { announcements, loading, deleteAnnouncement } = useAnnouncements();
  const { user } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!announcements || announcements.length === 0) {
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
        {announcements.map((announcement) => (
          <Card key={announcement.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AnnouncementIcon color="primary" />
                  <Typography variant="h6">
                    {announcement.title}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={announcement.announcement_type} 
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
                {announcement.content}
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
                    {announcement.sender_first_name} {announcement.sender_last_name}
                  </Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  {formatDate(announcement.created_at)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
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
    </Box>
  );
};

export default AnnouncementsComponent;