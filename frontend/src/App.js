import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import TaskList from './components/TaskList';
import CreateTask from './components/CreateTask';
import ProtectedRoute from './components/ProtectedRoute';
import { Box } from '@mui/material';
import { NotificationProvider } from './contexts/NotificationContext';
import { ChatProvider } from './contexts/ChatContext';





const AppContent = () => {
  const { user } = useAuth();

  return (
    <Box>
      {user && <Header />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <TaskList />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/tasks/create" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <CreateTask />
            </ProtectedRoute>
          } 
        />
        
        {/* DEFAULT ROUTE - Always redirect to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Box>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider> {/* ✅ Add this wrapper */}
       <ChatProvider>
        <Router>
           <AppContent />
        </Router>
        </ChatProvider> 
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
