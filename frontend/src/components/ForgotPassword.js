import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Box,
  CircularProgress
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: email
      });

      setMessage(response.data.message);
      setSubmitted(true);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, mt: 8 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Check Your Email
          </Typography>
          
          <Alert severity="success" sx={{ mb: 3 }}>
            {message}
          </Alert>
          
          <Box textAlign="center">
            <Typography variant="body1" color="textSecondary" paragraph>
              We've sent a password reset link to your email address. 
              Please check your inbox and follow the instructions to reset your password.
            </Typography>
            
            <Typography variant="body2" color="textSecondary" paragraph>
              The link will expire in 1 hour for security reasons.
            </Typography>
            
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              sx={{ mt: 2 }}
              startIcon={<ArrowBack />}
            >
              Back to Login
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
          Forgot Password
        </Typography>
        
        <Typography variant="body1" color="textSecondary" align="center" paragraph>
          Enter your email address and we'll send you a link to reset your password.
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoFocus
            disabled={loading}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading || !email}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Sending Email...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>
          
          <Box textAlign="center">
            <Button
              component={Link}
              to="/login"
              variant="text"
              startIcon={<ArrowBack />}
            >
              Back to Login
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
