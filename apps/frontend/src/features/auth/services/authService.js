import { post, get } from '../../../api/api';
import { setTokens, clearTokens, getToken } from '../utils/authStorage';

/**
 * Authentication Service
 * Provides methods for user authentication and authorization
 */

/**
 * Login user with email and password
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Promise with user data and tokens
 */
export const login = async (email, password) => {
  try {
    const response = await post('/auth/login', { email, password });
    
    // Store tokens in local storage
    if (response.accessToken) {
      setTokens(response.accessToken, response.refreshToken);
    }
    
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Register a new user
 * 
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.firstName - User first name
 * @param {string} userData.lastName - User last name
 * @returns {Promise<Object>} - Promise with user data
 */
export const register = async (userData) => {
  try {
    const response = await post('/auth/register', userData);
    
    // Automatically log in the user if tokens are provided
    if (response.accessToken) {
      setTokens(response.accessToken, response.refreshToken);
    }
    
    return response;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

/**
 * Logout current user
 * 
 * @returns {Promise<void>} - Promise indicating logout success
 */
export const logout = async () => {
  try {
    // Try to invalidate the token server-side
    const token = getToken();
    if (token) {
      await post('/auth/logout', { token });
    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Continue with logout process even if server request fails
  } finally {
    // Always clear tokens from local storage
    clearTokens();
  }
};

/**
 * Get current user data
 * 
 * @returns {Promise<Object>} - Promise with current user data
 */
export const getCurrentUser = async () => {
  try {
    return await get('/auth/me');
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * 
 * @param {string} email - User email
 * @returns {Promise<Object>} - Promise with reset email result
 */
export const forgotPassword = async (email) => {
  try {
    return await post('/auth/forgot-password', { email });
  } catch (error) {
    console.error('Failed to send reset email:', error);
    throw error;
  }
};

/**
 * Reset password with token
 * 
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Promise with reset result
 */
export const resetPassword = async (token, newPassword) => {
  try {
    return await post('/auth/reset-password', { token, newPassword });
  } catch (error) {
    console.error('Failed to reset password:', error);
    throw error;
  }
};

/**
 * Verify email with token
 * 
 * @param {string} token - Verification token
 * @returns {Promise<Object>} - Promise with verification result
 */
export const verifyEmail = async (token) => {
  try {
    return await post('/auth/verify-email', { token });
  } catch (error) {
    console.error('Failed to verify email:', error);
    throw error;
  }
};

/**
 * Update user profile
 * 
 * @param {Object} userData - User profile data
 * @returns {Promise<Object>} - Promise with updated user data
 */
export const updateProfile = async (userData) => {
  try {
    return await post('/auth/update-profile', userData);
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};

/**
 * Check if user is authenticated (has valid token)
 * 
 * @returns {boolean} - True if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
}; 