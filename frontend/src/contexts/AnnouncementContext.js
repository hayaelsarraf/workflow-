import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const AnnouncementContext = createContext();

export const useAnnouncements = () => {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within an AnnouncementProvider');
  }
  return context;
};

export const AnnouncementProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [myAnnouncements, setMyAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('📢 Announcements socket connected');
      });

      // Handle new announcements
      newSocket.on('new_announcement', (announcement) => {
        console.log('📢 New announcement received:', announcement);
        
        // Check if this announcement is for current user's role
        const shouldReceive = 
          announcement.for_role === 'all' ||
          (announcement.for_role === 'members' && user.role === 'member') ||
          (announcement.for_role === 'managers' && ['manager', 'admin'].includes(user.role));

        if (shouldReceive) {
          setAnnouncements(prev => [announcement, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      });

      // Handle course interest updates
      newSocket.on('course_interest_updated', (data) => {
        console.log('🎓 Course interest updated:', data);
        
        // Update announcements list with new interest count
        setAnnouncements(prev => prev.map(ann => 
          ann.id === data.announcement_id 
            ? { ...ann, total_interested: data.total_interested }
            : ann
        ));

        // Update my announcements if this is my announcement
        setMyAnnouncements(prev => prev.map(ann => 
          ann.id === data.announcement_id 
            ? { ...ann, interest_count: data.total_interested }
            : ann
        ));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/announcements', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setAnnouncements(response.data.announcements);
      
      // Count unread announcements
      const unread = response.data.announcements.filter(ann => !ann.is_viewed).length;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch my announcements (for managers)
  const fetchMyAnnouncements = useCallback(async () => {
    if (!user || !['manager', 'admin'].includes(user.role)) return;

    try {
      const response = await axios.get('http://localhost:5000/api/announcements/my-announcements', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setMyAnnouncements(response.data.announcements);
    } catch (error) {
      console.error('Failed to fetch my announcements:', error);
    }
  }, [user]);

  // Create announcement
  const createAnnouncement = async (announcementData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/announcements', announcementData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Add to my announcements
      setMyAnnouncements(prev => [response.data.announcement, ...prev]);
      
      return response.data.announcement;
    } catch (error) {
      console.error('Failed to create announcement:', error);
      throw error;
    }
  };

  // Mark as viewed
  const markAsViewed = async (announcementId) => {
    try {
      await axios.put(`http://localhost:5000/api/announcements/${announcementId}/view`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update local state
      setAnnouncements(prev => prev.map(ann => 
        ann.id === announcementId 
          ? { ...ann, is_viewed: true }
          : ann
      ));

      // Decrease unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as viewed:', error);
    }
  };

  // Show interest in course
  const showCourseInterest = async (announcementId, interestData) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/announcements/${announcementId}/interest`, interestData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update local announcement
      setAnnouncements(prev => prev.map(ann => 
        ann.id === announcementId 
          ? { 
              ...ann, 
              interest_level: interestData.interest_level,
              interest_message: interestData.message,
              total_interested: response.data.total_interested
            }
          : ann
      ));

      return response.data;
    } catch (error) {
      console.error('Failed to show course interest:', error);
      throw error;
    }
  };

  // Get course interests
  const getCourseInterests = async (announcementId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/announcements/${announcementId}/interests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      return response.data.interests;
    } catch (error) {
      console.error('Failed to get course interests:', error);
      throw error;
    }
  };

  // Delete announcement
  const deleteAnnouncement = async (announcementId) => {
    try {
      await axios.delete(`http://localhost:5000/api/announcements/${announcementId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Remove from local state
      setMyAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
      setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      throw error;
    }
  };

  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      if (['manager', 'admin'].includes(user.role)) {
        fetchMyAnnouncements();
      }
    }
  }, [user, fetchAnnouncements, fetchMyAnnouncements]);

  const value = {
    announcements,
    myAnnouncements,
    loading,
    unreadCount,
    createAnnouncement,
    markAsViewed,
    showCourseInterest,
    getCourseInterests,
    deleteAnnouncement,
    fetchAnnouncements,
    fetchMyAnnouncements
  };

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
};
