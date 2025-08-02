import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/announcements', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAnnouncements(response.data.announcements);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createAnnouncement = useCallback(async (announcementData) => {
    try {
      const response = await axios.post('http://localhost:5000/api/announcements', announcementData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Add the new announcement to the list
      setAnnouncements(prev => [response.data.announcement, ...prev]);
      return response.data.announcement;
    } catch (error) {
      console.error('Failed to create announcement:', error);
      throw error;
    }
  }, []);

  const updateAnnouncement = useCallback(async (id, announcementData) => {
    try {
      const response = await axios.put(`/api/announcements/${id}`, announcementData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update the announcement in the list
      setAnnouncements(prev => 
        prev.map(announcement => 
          announcement.id === id ? response.data.announcement : announcement
        )
      );
      return response.data.announcement;
    } catch (error) {
      console.error('Failed to update announcement:', error);
      throw error;
    }
  }, []);

  const deleteAnnouncement = useCallback(async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/announcements/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Remove the announcement from the list
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const value = {
    announcements,
    loading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    fetchAnnouncements
  };

  return (
    <AnnouncementContext.Provider value={value}>
      {children}
    </AnnouncementContext.Provider>
  );
};