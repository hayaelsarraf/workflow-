import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment
} from '@mui/material';
import { 
  CheckCircle, 
  Error,
  Visibility,
  VisibilityOff 
} from '@mui/icons-material';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [resetComplete, setResetComplete] = useState(false);

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/auth/reset-password/${token}/verify`);
        setTokenValid(response.data.valid);
        setUserInfo(response.data);
      } catch (error) {
        setTokenValid(false);
        setError('Invalid or expired reset link');
      } finally {
        setVerifying(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
      setError('No reset token provided');
    }
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`http://localhost:5000/api/auth/reset-password/${token}`, {
        password: formData.password,
        confirmPassword: formData.confirmPassword
      });

      setMessage(response.data.message);
      setResetComplete(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      setError(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Verifying reset link...
            </Typography>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (!tokenValid) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
          <Box textAlign="center">
            <Error color="error" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Invalid Reset Link
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              This password reset link is invalid or has expired.
            </Typography>
            <Button
              component={Link}
              to="/forgot-password"
              variant="contained"
              sx={{ mt: 2 }}
            >
              Request New Reset Link
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (resetComplete) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
          <Box textAlign="center">
            <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Password Reset Complete
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
              Your password has been successfully reset.
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              You will be redirected to the login page shortly...
            </Typography>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/login"
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Reset Password
        </Typography>
        
        <Typography variant="body1" color="textSecondary" align="center" paragraph>
          Hello {userInfo?.firstName}, enter your new password below.
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="New Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            autoFocus
            disabled={loading}
            helperText="Must be at least 6 characters with uppercase, lowercase, and number"
          />
          
          <TextField
            fullWidth
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !formData.password || !formData.confirmPassword}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResetPassword;
