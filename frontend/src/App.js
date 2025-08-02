import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { AnnouncementProvider } from './contexts/AnnouncementContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import CreateTask from './components/CreateTask';
import Profile from './components/Profile';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ChatProvider>
          <AnnouncementProvider>
            <NotificationProvider>
              <Router>
                <div className="App">
                  <Header />
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <Dashboard />
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
                        <ProtectedRoute>
                          <CreateTask />
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
                    <Route path="/" element={<Login />} />
                  </Routes>
                </div>
              </Router>
            </NotificationProvider>
          </AnnouncementProvider>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;