import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be u      // The message list is already updated with the confirmed message from socketatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [messagesByGroup, setMessagesByGroup] = useState({});
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

      // Handle new direct messages
      newSocket.on('new_message', (message) => {
        console.log('📨 New direct message received:', message);
        
        const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
        
        setMessagesByConversation(prev => ({
          ...prev,
          [otherUserId]: [...(prev[otherUserId] || []), message]
        }));

        // Update conversations list if needed
        setConversations(prev => {
          const existingConversation = prev.find(conv => conv.other_user_id === message.sender_id);
          
          if (!existingConversation) {
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
          }

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
        });
      });

      // Handle new group messages
      newSocket.on('new_group_message', (message) => {
        console.log('👥 New group message received:', message);
        
        setMessagesByGroup(prev => ({
          ...prev,
          [message.group_id]: [...(prev[message.group_id] || []), message]
        }));

        // Update groups list
        setGroups(prev => 
          prev.map(group => 
            group.id === message.group_id
              ? {
                  ...group,
                  last_message: message.message_text,
                  last_message_time: message.created_at,
                  last_sender_id: message.sender_id,
                  last_sender_name: `${message.sender_first_name} ${message.sender_last_name}`
                }
              : group
          ).sort((a, b) => new Date(b.last_message_time || b.created_at) - new Date(a.last_message_time || a.created_at))
        );
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Fetching groups...');
      const response = await axios.get('http://localhost:5000/api/chat-groups', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('👥 Groups fetched:', response.data.groups.length);
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
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
      
      setConversations(response.data.conversations);
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

  // Create a new group
  const createGroup = async (name, description = '', members = []) => {
    try {
      console.log('👥 Creating new group:', name);
      const response = await axios.post('http://localhost:5000/api/chat-groups', {
        name,
        description,
        members
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('✅ Group created successfully:', response.data);
      await fetchGroups(); // Refresh groups list
      return response.data.group;
    } catch (error) {
      console.error('Failed to create group:', error);
      throw error;
    }
  };

  // Open a group chat
  const openGroup = async (groupId) => {
    try {
      setLoading(true);
      console.log('👥 Opening group:', groupId);

      const group = groups.find(g => g.id === groupId);
      if (group) {
        setCurrentGroup(group);
        setCurrentConversation(null); // Close any open direct conversation

        // Join the group's socket room
        socket?.emit('join_group', groupId);

        // Get group messages if not already loaded
        if (!messagesByGroup[groupId]) {
          console.log('📡 Fetching group messages...');
          const response = await axios.get(`http://localhost:5000/api/chat-groups/${groupId}/messages`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          setMessagesByGroup(prev => ({
            ...prev,
            [groupId]: response.data.messages
          }));
        }
      }
    } catch (error) {
      console.error('Failed to open group:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send message to a group
  const sendGroupMessage = async (groupId, messageText) => {
    try {
      console.log('📨 Sending group message to:', groupId);
      const response = await axios.post(`http://localhost:5000/api/chat-groups/${groupId}/send`, {
        message_text: messageText,
        message_type: 'text'
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const newMessage = response.data.message;

      // Update messages in state
      setMessagesByGroup(prev => ({
        ...prev,
        [groupId]: [...(prev[groupId] || []), newMessage]
      }));

      // Emit message through socket
      socket?.emit('send_group_message', {
        ...newMessage,
        group_id: groupId,
        sender_first_name: user.first_name,
        sender_last_name: user.last_name,
        sender_email: user.email,
        sender_role: user.role
      });

      // Update group in the list
      setGroups(prev => 
        prev.map(group => 
          group.id === groupId
            ? {
                ...group,
                last_message: messageText,
                last_message_time: new Date().toISOString(),
                last_sender_id: user.id,
                last_sender_name: `${user.first_name} ${user.last_name}`
              }
            : group
        ).sort((a, b) => new Date(b.last_message_time || b.created_at) - new Date(a.last_message_time || a.created_at))
      );

      return newMessage;
    } catch (error) {
      console.error('Failed to send group message:', error);
      throw error;
    }
  };

  // Get current messages (either direct or group)
  const getCurrentMessages = () => {
    if (currentConversation) {
      return messagesByConversation[currentConversation.other_user_id] || [];
    }
    if (currentGroup) {
      return messagesByGroup[currentGroup.id] || [];
    }
    return [];
  };

  // Send a direct message
  const sendMessage = async (recipientId, messageText, messageType = 'text', attachment = null) => {
    try {
      console.log('📨 Sending direct message to:', recipientId);
      
      if (!user) throw new Error('User not authenticated');
      if (!recipientId) throw new Error('No recipient specified');
      if (!messageText.trim()) throw new Error('Message cannot be empty');

      // Create temporary message for immediate display
      const tempMessage = {
        id: Date.now(), // Temporary ID
        sender_id: user.id,
        recipient_id: recipientId,
        message_text: messageText.trim(),
        message_type: messageType,
        attachment_path: null,
        attachment_name: attachment?.name,
        sender_first_name: user.first_name,
        sender_last_name: user.last_name,
        created_at: new Date().toISOString(),
        is_read: false
      };

      // Update messages in state with temporary message
      setMessagesByConversation(prev => ({
        ...prev,
        [recipientId]: [...(prev[recipientId] || []), tempMessage]
      }));

      // Update conversation in the list with temporary message
      setConversations(prev => {
        const existingConv = prev.find(c => c.other_user_id === recipientId);
        const updatedConv = {
          ...existingConv,
          last_message: messageText,
          last_message_time: tempMessage.created_at,
          last_sender_id: user.id
        };

        if (!existingConv) {
          // If this is a new conversation, add it to the list
          const recipient = users.find(u => u.id === recipientId);
          if (recipient) {
            updatedConv.other_user_id = recipientId;
            updatedConv.other_user_first_name = recipient.first_name;
            updatedConv.other_user_last_name = recipient.last_name;
            updatedConv.other_user_email = recipient.email;
            updatedConv.other_user_role = recipient.role;
            return [updatedConv, ...prev];
          }
          return prev;
        }

        return prev
          .map(conv => conv.other_user_id === recipientId ? updatedConv : conv)
          .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
      });

      // Send message through socket and wait for confirmation
      return new Promise((resolve, reject) => {
        socket.emit('send_message', {
          recipient_id: recipientId,
          message_text: messageText.trim(),
          message_type: messageType,
          attachment_path: null, // TODO: Handle file attachments
          attachment_name: attachment?.name
        });

        // Listen for confirmation
        const messageTimeout = setTimeout(() => {
          reject(new Error('Message sending timeout'));
        }, 5000);

        socket.once('message_sent', ({ success, message }) => {
          clearTimeout(messageTimeout);
          if (success) {
            // Update the temporary message with the real one
            setMessagesByConversation(prev => ({
              ...prev,
              [recipientId]: prev[recipientId].map(msg => 
                msg.id === tempMessage.id ? message : msg
              )
            }));

            // Update conversation list with confirmed message
            setConversations(prev => 
              prev.map(conv => {
                if (conv.other_user_id === recipientId) {
                  return {
                    ...conv,
                    last_message: message.message_text,
                    last_message_time: message.created_at,
                    last_sender_id: message.sender_id
                  };
                }
                return conv;
              })
            );
            
            resolve(message);
          }
        });

        socket.once('message_error', ({ error }) => {
          clearTimeout(messageTimeout);
          reject(new Error(error));
        });
      });
    } catch (error) {
      console.error('Failed to send direct message:', error);
      throw error;
    }
  };

  // Open a direct conversation
  const openConversation = async (userId) => {
    try {
      setLoading(true);
      console.log('👤 Opening conversation with user:', userId);

      const conversation = conversations.find(c => c.other_user_id === userId);
      if (conversation) {
        setCurrentConversation(conversation);
        setCurrentGroup(null); // Close any open group chat
      } else {
        // Get user details and create new conversation
        const user = users.find(u => u.id === userId);
        if (user) {
          const newConversation = {
            other_user_id: user.id,
            other_user_first_name: user.first_name,
            other_user_last_name: user.last_name,
            other_user_email: user.email,
            other_user_role: user.role
          };
          setCurrentConversation(newConversation);
          setCurrentGroup(null);
        }
      }

      // Get conversation messages if not already loaded
      if (!messagesByConversation[userId]) {
        console.log('📡 Fetching conversation messages...');
        const response = await axios.get(`http://localhost:5000/api/chat/messages/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        setMessagesByConversation(prev => ({
          ...prev,
          [userId]: response.data.messages
        }));
      }
    } catch (error) {
      console.error('Failed to open conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchUsers();
      fetchGroups();
    }
  }, [user, fetchConversations, fetchUsers, fetchGroups]);

  const value = {
    socket,
    conversations,
    groups,
    currentConversation,
    currentGroup,
    messages: getCurrentMessages(),
    loading,
    users,
    openConversation,
    openGroup,
    sendMessage,
    sendGroupMessage,
    createGroup,
    fetchGroups
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
