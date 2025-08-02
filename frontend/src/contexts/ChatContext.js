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

      // Handle new messages
      newSocket.on('new_message', (message) => {
        console.log('📨 New message received:', message);
        
        const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
        
        // Add message to conversation storage
        setMessagesByConversation(prev => ({
          ...prev,
          [otherUserId]: [...(prev[otherUserId] || []), message]
        }));
        
        // Update conversations list
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
                last_sender_id: message.sender_id
              };
              
              return [newConversation, ...prev];
            } else {
              // Update existing conversation
              return prev.map(conv => 
                conv.other_user_id === message.sender_id
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
        }
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
              last_sender_id: message.sender_id
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

  // Fetch conversations
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

  // Open conversation - WhatsApp-like behavior
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

      // Mark messages as read
      await axios.put(`http://localhost:5000/api/chat/mark-read/${userId}`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

    } catch (error) {
      console.error('Failed to open conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message - WhatsApp-like behavior
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
      
      // Add message to conversation storage
      setMessagesByConversation(prev => ({
        ...prev,
        [recipientId]: [...(prev[recipientId] || []), newMessage]
      }));

      // WHATSAPP-LIKE BEHAVIOR: Immediately add conversation to left sidebar
      setConversations(prev => {
        const existingConversation = prev.find(conv => conv.other_user_id === recipientId);
        
        if (!existingConversation) {
          console.log('➕ Adding new conversation to sidebar for sent message to user:', recipientId);
          
          // Find the recipient user data
          const recipientUser = users.find(u => u.id === parseInt(recipientId));
          
          const newConversation = {
            other_user_id: recipientId,
            other_user_first_name: recipientUser?.first_name || 'User',
            other_user_last_name: recipientUser?.last_name || '',
            other_user_email: recipientUser?.email || '',
            other_user_role: recipientUser?.role || 'member',
            last_message: messageText,
            last_message_time: newMessage.created_at,
            last_sender_id: user.id
          };
          
          return [newConversation, ...prev];
        } else {
          // Update existing conversation
          return prev.map(conv => 
            conv.other_user_id === recipientId
              ? {
                  ...conv,
                  last_message: messageText,
                  last_message_time: newMessage.created_at,
                  last_sender_id: user.id
                }
              : conv
          ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
        }
      });

      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  // Send file message - WhatsApp-like behavior
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
      
      // Add message to conversation storage
      setMessagesByConversation(prev => ({
        ...prev,
        [recipientId]: [...(prev[recipientId] || []), newMessage]
      }));

      // WHATSAPP-LIKE BEHAVIOR: Immediately add conversation to left sidebar
      setConversations(prev => {
        const existingConversation = prev.find(conv => conv.other_user_id === recipientId);
        
        if (!existingConversation) {
          console.log('➕ Adding new conversation to sidebar for sent file to user:', recipientId);
          
          // Find the recipient user data
          const recipientUser = users.find(u => u.id === parseInt(recipientId));
          
          const newConversation = {
            other_user_id: recipientId,
            other_user_first_name: recipientUser?.first_name || 'User',
            other_user_last_name: recipientUser?.last_name || '',
            other_user_email: recipientUser?.email || '',
            other_user_role: recipientUser?.role || 'member',
            last_message: messageText || `📎 ${file.name}`,
            last_message_time: newMessage.created_at,
            last_sender_id: user.id
          };
          
          return [newConversation, ...prev];
        } else {
          // Update existing conversation
          return prev.map(conv => 
            conv.other_user_id === recipientId
              ? {
                  ...conv,
                  last_message: messageText || `📎 ${file.name}`,
                  last_message_time: newMessage.created_at,
                  last_sender_id: user.id
                }
              : conv
          ).sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
        }
      });

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
    }
  }, [user, fetchConversations, fetchUsers]);

  const value = {
    socket,
    conversations,
    currentConversation,
    messages: getCurrentMessages(),
    loading,
    users,
    openConversation,
    sendMessage,
    sendFileMessage,
    closeConversation,
    fetchConversations
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};