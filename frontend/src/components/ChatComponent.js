import React, { useState, useRef, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  InputAdornment,
  Tooltip,
  CircularProgress,
  Alert,
  Checkbox,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  FiberManualRecord as DotIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

const ChatComponent = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { 
    conversations, 
    groups,
    currentConversation,
    currentGroup, 
    messages, 
    users,
    openConversation,
    openGroup,
    sendMessage,
    sendGroupMessage, 
    sendFileMessage,
    closeConversation,
    createGroup
  } = useChat();
  
  const [chatView, setChatView] = useState('direct'); // 'direct' or 'groups'
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const [messageText, setMessageText] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    setError(null);
    
    if (!messageText.trim() && !selectedFile) {
      setSending(false);
      return;
    }
    
    if (!currentConversation) {
      setError('Please select a conversation first');
      setSending(false);
      return;
    }

    const recipientId = currentConversation.other_user_id;
    console.log('📨 Sending message to:', recipientId);
    
    setSending(true);

    try {
      if (selectedFile && typeof sendFileMessage === 'function') {
        await sendFileMessage(recipientId, selectedFile, messageText);
        setSelectedFile(null);
      } else {
        await sendMessage(recipientId, messageText.trim());
        console.log('✅ Message sent successfully');
      }
      
      setMessageText('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('❌ Failed to send message:', err);
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendGroupMessage = async () => {
    if (!messageText.trim() && !selectedFile) return;
    if (!currentGroup) return;

    try {
      if (selectedFile) {
        await sendFileMessage(currentGroup.id, selectedFile, messageText, true);
        setSelectedFile(null);
      } else {
        await sendGroupMessage(currentGroup.id, messageText);
      }
      setMessageText('');
    } catch (error) {
      console.error('Failed to send group message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentGroup) {
        handleSendGroupMessage();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const newGroup = await createGroup(newGroupName, '', selectedMembers);
      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedMembers([]);
      setChatView('groups');
      openGroup(newGroup.id);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Chat Dialog */}
      <Dialog 
        open={isOpen} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '600px', display: 'flex', flexDirection: 'column' }
        }}
      >
        <DialogTitle sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <ChatIcon />
              <Typography variant="h6">Chat</Typography>
              <Box>
                <Button
                  variant={chatView === 'groups' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setChatView('groups')}
                >
                  Groups
                </Button>
              </Box>
            </Box>

            {isManager && chatView === 'groups' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateGroup(true)}
              >
                Create Group
              </Button>
            )}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0, flex: 1, display: 'flex' }}>
          <Box sx={{ display: 'flex', width: '100%', height: '100%' }}>
            {/* Conversations/Groups List */}
            <Box sx={{ width: '320px', borderRight: 1, borderColor: 'divider' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {chatView === 'direct' ? 'Direct Messages' : 'Groups'}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => chatView === 'direct' ? setShowUserList(true) : setShowCreateGroup(true)}
                    sx={{ width: '100%' }}
                  >
                    {chatView === 'direct' ? 'New Message' : 'New Group'}
                  </Button>
                </Box>
              </Box>
              <List sx={{ p: 0, overflowY: 'auto', height: 'calc(100% - 100px)' }}>
                {chatView === 'direct' ? (
                  conversations.length === 0 ? (
                    <ListItem>
                      <ListItemText 
                        primary="No conversations yet" 
                        secondary="Start a new chat by clicking the + button"
                      />
                    </ListItem>
                  ) : (
                    conversations.map((conversation) => {
                      const isActive = currentConversation?.other_user_id === conversation.other_user_id;
                      
                      return (
                        <ListItem 
                          key={conversation.other_user_id}
                          button
                          selected={isActive}
                          onClick={() => openConversation(conversation.other_user_id, conversation)}
                          sx={{ 
                            py: 1.5,
                            px: 2,
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: isActive ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                            '&:hover': {
                              backgroundColor: isActive ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                            },
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              sx={{ 
                                bgcolor: 'grey.400',
                                width: 48,
                                height: 48
                              }}
                            >
                              {conversation.other_user_first_name[0]?.toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            sx={{ ml: 1 }}
                            primary={
                              <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography 
                                    variant="subtitle2"
                                    sx={{ 
                                      fontWeight: '500',
                                      color: 'text.primary',
                                      fontSize: '0.95rem',
                                      lineHeight: 1.2
                                    }}
                                  >
                                    {conversation.other_user_first_name} {conversation.other_user_last_name}
                                  </Typography>
                                  <Chip 
                                    label={conversation.other_user_role} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                    color={conversation.other_user_role === 'admin' ? 'error' : 
                                           conversation.other_user_role === 'manager' ? 'warning' : 'default'}
                                  />
                                </Box>
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                                >
                                  {formatTime(conversation.last_message_time)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography 
                                  variant="body2" 
                                  noWrap
                                  sx={{ 
                                    fontWeight: '400',
                                    color: 'text.secondary',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.3
                                  }}
                                >
                                  {conversation.last_sender_id === user.id ? 'You: ' : ''}
                                  {conversation.last_message}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })
                  )
                ) : (
                  !groups || groups.length === 0 ? (
                    <ListItem>
                      <ListItemText 
                        primary="No groups yet" 
                        secondary={isManager ? "Create a new group with the + button" : "Wait for a manager to add you to a group"}
                      />
                    </ListItem>
                  ) : (
                    groups.map((group) => {
                      const isActive = currentGroup?.id === group.id;
                      return (
                        <ListItem 
                          key={group.id}
                          button
                          selected={isActive}
                          onClick={() => openGroup(group.id)}
                          sx={{ 
                            py: 1.5,
                            px: 2,
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: isActive ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                            '&:hover': {
                              backgroundColor: isActive ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                            },
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar 
                              sx={{ 
                                bgcolor: 'primary.main',
                                width: 48,
                                height: 48
                              }}
                            >
                              <ChatIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            sx={{ ml: 1 }}
                            primary={
                              <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Typography 
                                  variant="subtitle2"
                                  sx={{ 
                                    fontWeight: '500',
                                    color: 'text.primary',
                                    fontSize: '0.95rem',
                                    lineHeight: 1.2
                                  }}
                                >
                                  {group.name}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                                >
                                  {formatTime(group.last_message_time)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography 
                                  variant="body2" 
                                  noWrap
                                  sx={{ 
                                    fontWeight: '400',
                                    color: 'text.secondary',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.3
                                  }}
                                >
                                  {group.member_count} members • {group.last_message || 'No messages yet'}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })
                  )
                )}
              </List>
            </Box>

            {/* Chat Messages Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {currentConversation || currentGroup ? (
                <>
                  {/* Chat Header */}
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    bgcolor: 'grey.50'
                  }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: currentGroup ? 'primary.main' : 'grey.400' }}>
                          {currentGroup ? <ChatIcon /> : currentConversation?.other_user_first_name[0]?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {currentGroup ? currentGroup.name : 
                             `${currentConversation.other_user_first_name} ${currentConversation.other_user_last_name}`}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {currentGroup ? 
                              `${currentGroup.member_count} members` : 
                              `${currentConversation.other_user_role} • ${currentConversation.other_user_email}`}
                          </Typography>
                        </Box>
                      </Box>
                      {isManager && currentGroup && (
                        <IconButton>
                          <MoreVertIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  {/* Messages Area */}
                  <Box sx={{ flex: 1, overflowY: 'auto', p: 1, bgcolor: '#f8f9fa' }}>
                    {messages.length === 0 ? (
                      <Box sx={{ textAlign: 'center', mt: 4 }}>
                        <Typography variant="body2" color="textSecondary">
                          No messages yet. Start the conversation!
                        </Typography>
                      </Box>
                    ) : (
                      messages.map((message, index) => {
                        const isMyMessage = message.sender_id === user.id;
                        const showDate = index === 0 || 
                          formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);

                        return (
                          <Box key={message.id}>
                            {showDate && (
                              <Box sx={{ textAlign: 'center', my: 2 }}>
                                <Chip 
                                  label={formatDate(message.created_at)} 
                                  size="small" 
                                  sx={{ bgcolor: 'white', border: '1px solid #e0e0e0' }}
                                />
                              </Box>
                            )}
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isMyMessage ? 'flex-end' : 'flex-start',
                                mb: 2,
                                px: 1
                              }}
                            >
                              {/* Sender info - Only show for others' messages */}
                              {!isMyMessage && (
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  gap: 1,
                                  mb: 0.5,
                                  ml: 1
                                }}>
                                  <Avatar sx={{ 
                                    width: 24, 
                                    height: 24,
                                    fontSize: '0.75rem',
                                    bgcolor: 'grey.400'
                                  }}>
                                    {message.sender_first_name?.[0]?.toUpperCase()}
                                  </Avatar>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.secondary',
                                      fontWeight: 500
                                    }}
                                  >
                                    {message.sender_name || `${message.sender_first_name} ${message.sender_last_name}`}
                                  </Typography>
                                </Box>
                              )}

                              {/* Message bubble with "You" indicator for my messages */}
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: 1,
                                alignSelf: isMyMessage ? 'flex-end' : 'flex-start'
                              }}>
                                {isMyMessage && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'primary.main',
                                      fontWeight: 500,
                                      mr: 1
                                    }}
                                  >
                                    You:
                                  </Typography>
                                )}
                                <Card
                                  sx={{
                                    minWidth: 'fit-content',
                                    maxWidth: '70%',
                                    bgcolor: isMyMessage ? '#dcf8c6' : 'white',
                                    color: 'text.primary',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    borderRadius: isMyMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    '& .MuiCardContent-root': {
                                      p: '12px !important',
                                      '&:last-child': {
                                        pb: '12px !important'
                                      }
                                    }
                                  }}
                                >
                                  <CardContent>
                                    <Typography 
                                      variant="body2" 
                                      sx={{ 
                                        wordBreak: 'break-word',
                                        whiteSpace: 'pre-wrap',
                                        minWidth: 'fit-content'
                                      }}
                                    >
                                      {message.message_text}
                                    </Typography>
                                    {message.message_type === 'file' && message.attachment_name && (
                                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AttachFileIcon fontSize="small" />
                                        <Typography variant="caption">
                                          {message.attachment_name}
                                        </Typography>
                                      </Box>
                                    )}
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        display: 'block', 
                                        textAlign: 'right', 
                                        mt: 0.5,
                                        color: 'text.secondary',
                                        fontSize: '0.7rem'
                                      }}
                                    >
                                      {formatTime(message.created_at)}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </Box>

                  {/* Message Input */}
                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'white' }}>
                    {selectedFile && (
                      <Box sx={{ mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between">
                          <Typography variant="caption">
                            📎 {selectedFile.name}
                          </Typography>
                          <IconButton size="small" onClick={() => setSelectedFile(null)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    )}
                    <Box display="flex" gap={1} alignItems="flex-end">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                      <TextField
                        fullWidth
                        multiline
                        maxRows={3}
                        placeholder={currentGroup ? 
                          "Type your message to group..." : 
                          "Type your message..."}
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '25px',
                            bgcolor: 'grey.50'
                          }
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => fileInputRef.current?.click()}>
                                <AttachFileIcon />
                              </IconButton>
                            </InputAdornment>
                          )
                        }}
                      />
                      <IconButton 
                        onClick={currentGroup ? handleSendGroupMessage : handleSendMessage}
                        disabled={(!messageText.trim() && !selectedFile) || sending}
                        color="primary"
                        sx={{
                          bgcolor: sending ? 'grey.400' : 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: sending ? 'grey.400' : 'primary.dark' },
                          '&:disabled': { bgcolor: 'grey.300' }
                        }}
                      >
                        <SendIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  bgcolor: '#f8f9fa'
                }}>
                  <Box textAlign="center">
                    <ChatIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Welcome to Chat
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {chatView === 'direct' ?
                        "Select a conversation or start a new one" :
                        isManager ? 
                          "Select a group or create a new one" :
                          "Select a group to start chatting"}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onClose={() => setShowCreateGroup(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Chat Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
          
          <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Select Members
          </Typography>
          
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {users.filter(u => u.id !== user.id).map((u) => (
              <ListItem key={u.id} dense>
                <ListItemAvatar>
                  <Avatar>
                    <PersonIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={`${u.first_name} ${u.last_name}`}
                  secondary={u.email}
                />
                <Checkbox
                  edge="end"
                  checked={selectedMembers.includes(u.id)}
                  onChange={() => {
                    setSelectedMembers(prev =>
                      prev.includes(u.id)
                        ? prev.filter(id => id !== u.id)
                        : [...prev, u.id]
                    );
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateGroup(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroupName || selectedMembers.length === 0}
          >
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Conversation Dialog */}
      <Dialog open={showUserList} onClose={() => setShowUserList(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Conversation</DialogTitle>
        <DialogContent>
          <List>
            {users.filter(u => u.id !== user.id).map((userData) => (
              <ListItem 
                key={userData.id} 
                button
                onClick={() => {
                  openConversation(userData.id, {
                    other_user_id: userData.id,
                    other_user_first_name: userData.first_name,
                    other_user_last_name: userData.last_name,
                    other_user_email: userData.email,
                    other_user_role: userData.role
                  });
                  setShowUserList(false);
                }}
                sx={{ 
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    {userData.first_name[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${userData.first_name} ${userData.last_name}`}
                  secondary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="textSecondary">
                        {userData.email}
                      </Typography>
                      <Chip 
                        label={userData.role} 
                        size="small" 
                        variant="outlined"
                        color={userData.role === 'admin' ? 'error' : 
                               userData.role === 'manager' ? 'warning' : 'default'}
                      />
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUserList(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ChatComponent;