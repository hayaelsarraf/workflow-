import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('join_user_room', user.id);
      });

      // 🔥 ENHANCED: Handle new messages with bold name updates
      newSocket.on('new_message', (message) => {
        console.log('📨 New message received:', message);
        
        const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
        
        // Add message to conversation storage
        setMessagesByConversation(prev => ({
          ...prev,
          [otherUserId]: [...(prev[otherUserId] || []), message]
        }));
        
        // Enhanced conversation management for bold names
        if (message.recipient_id === user.id) {
          console.log('📋 Received new message, updating conversation list...');
          
          setConversations(prev => {
            const existingConversation = prev.find(conv => conv.other_user_id === message.sender_id);
            
            if (!existingConversation) {
              console.log('➕ Adding new conversation to list for user:', message.sender_id);
              const newConversation = {
                other_user_id: message.sender_id,
                other_user_first_name: message.sender_first_name,
                other_user_last_name: message.sender_last_name,
                other_user_email: message.sender_email,
                other_user_role: 'member',
                last_message: message.message_text,
                last_message_time: message.created_at,
                last_sender_id: message.sender_id,
                unread_count: 1 // 🔥 This makes the name bold
              };
              
              return [newConversation, ...prev];
            } else {
              // Update existing conversation with unread count for bold styling
              return prev.map(conv => 
                conv.other_user_id === message.sender_id
                  ? {
                      ...conv,
                      last_message: message.message_text,
                      last_message_time: message.created_at,
                      last_sender_id: message.sender_id,
                      unread_count: conv.unread_count + 1 // 🔥 Increment for bold
                    }
                  : conv
              ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
            }
          });
        }
        
        // Update unread count
        fetchUnreadCount();
      });

      newSocket.on('message_sent', (message) => {
        console.log('📤 Message sent confirmation:', message);
        
        const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
        
        // Add sent message to conversation storage
        setMessagesByConversation(prev => ({
          ...prev,
          [otherUserId]: [...(prev[otherUserId] || []), message]
        }));
        
        // Update conversations for sent messages
        setConversations(prev => {
          const existingConversation = prev.find(conv => conv.other_user_id === otherUserId);
          
          if (!existingConversation) {
            console.log('➕ Adding new conversation for sent message to user:', otherUserId);
            const newConversation = {
              other_user_id: otherUserId,
              other_user_first_name: message.recipient_first_name || 'User',
              other_user_last_name: message.recipient_last_name || '',
              other_user_email: message.recipient_email || '',
              other_user_role: 'member',
              last_message: message.message_text,
              last_message_time: message.created_at,
              last_sender_id: message.sender_id,
              unread_count: 0 // No unread for sent messages
            };
            
            return [newConversation, ...prev];
          } else {
            // Update existing conversation
            return prev.map(conv => 
              conv.other_user_id === otherUserId
                ? {
                    ...conv,
                    last_message: message.message_text,
                    last_message_time: message.created_at,
                    last_sender_id: message.sender_id
                  }
                : conv
            ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
          }
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Fetch conversations with enhanced error handling
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Fetching conversations...');
      const response = await axios.get('http://localhost:5000/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('📋 Conversations fetched:', response.data.conversations.length);
      
      // Sort conversations by last message time
      const sortedConversations = response.data.conversations.sort(
        (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
      );
      
      setConversations(sortedConversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, [user]);

  // Fetch users for new conversations
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get('http://localhost:5000/api/chat/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await axios.get('http://localhost:5000/api/chat/unread-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [user]);

  // Open conversation with enhanced user data handling
  const openConversation = async (userId, userData = null) => {
    try {
      setLoading(true);
      console.log('💬 Opening conversation with user:', userId);

      let conversationData = userData;

      // If no user data provided, try to get it from conversations list
      if (!conversationData) {
        const existingConv = conversations.find(conv => conv.other_user_id === userId);
        if (existingConv) {
          conversationData = existingConv;
        } else {
          // Fetch user data if not available
          try {
            const userResponse = await axios.get(`http://localhost:5000/api/chat/users`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            const userData = userResponse.data.users.find(u => u.id === parseInt(userId));
            if (userData) {
              conversationData = {
                other_user_id: userId,
                other_user_first_name: userData.first_name,
                other_user_last_name: userData.last_name,
                other_user_email: userData.email,
                other_user_role: userData.role
              };
            } else {
              conversationData = {
                other_user_id: userId,
                other_user_first_name: 'Loading...',
                other_user_last_name: '',
                other_user_email: '',
                other_user_role: 'member'
              };
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error);
            conversationData = {
              other_user_id: userId,
              other_user_first_name: 'User',
              other_user_last_name: '',
              other_user_email: '',
              other_user_role: 'member'
            };
          }
        }
      }

      setCurrentConversation(conversationData);

      // Check if we already have messages for this conversation
      if (messagesByConversation[userId] && messagesByConversation[userId].length > 0) {
        console.log('📚 Using cached messages for user:', userId);
      } else {
        console.log('📡 Fetching messages from server for user:', userId);
        const response = await axios.get(`http://localhost:5000/api/chat/conversation/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        setMessagesByConversation(prev => ({
          ...prev,
          [userId]: response.data.messages
        }));
      }

      // 🔥 Mark messages as read and remove bold styling
      await axios.put(`http://localhost:5000/api/chat/mark-read/${userId}`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update conversation to remove unread count (removes bold)
      setConversations(prev => prev.map(conv => 
        conv.other_user_id === parseInt(userId) 
          ? { ...conv, unread_count: 0 }
          : conv
      ));

      // Refresh unread count
      fetchUnreadCount();
    } catch (error) {
      console.error('Failed to open conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async (recipientId, messageText) => {
    try {
      const response = await axios.post('http://localhost:5000/api/chat/send', {
        recipient_id: recipientId,
        message_text: messageText
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const newMessage = response.data.message;
      setMessagesByConversation(prev => ({
        ...prev,
        [recipientId]: [...(prev[recipientId] || []), newMessage]
      }));

      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  // Send file message
  const sendFileMessage = async (recipientId, file, messageText = '') => {
    try {
      const formData = new FormData();
      formData.append('recipient_id', recipientId);
      formData.append('message_text', messageText);
      formData.append('file', file);

      const response = await axios.post('http://localhost:5000/api/chat/send-file', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const newMessage = response.data.message;
      setMessagesByConversation(prev => ({
        ...prev,
        [recipientId]: [...(prev[recipientId] || []), newMessage]
      }));

      return newMessage;
    } catch (error) {
      console.error('Failed to send file message:', error);
      throw error;
    }
  };

  // Close conversation without clearing messages
  const closeConversation = () => {
    console.log('❌ Closing conversation (messages preserved)');
    setCurrentConversation(null);
  };

  // Get current messages for active conversation
  const getCurrentMessages = () => {
    if (!currentConversation) return [];
    return messagesByConversation[currentConversation.other_user_id] || [];
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchUsers();
      fetchUnreadCount();
    }
  }, [user, fetchConversations, fetchUsers, fetchUnreadCount]);

  const value = {
    socket,
    conversations,
    currentConversation,
    messages: getCurrentMessages(),
    unreadCount,
    loading,
    users,
    openConversation,
    sendMessage,
    sendFileMessage,
    closeConversation,
    fetchConversations,
    fetchUnreadCount
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
