import axios from 'axios';
import { getToken, clearTokens } from '../features/auth/utils/authStorage';

// Create an instance of axios with a custom configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request error
    console.error('API request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // If the response is 401 and we're not attempting to refresh token
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        
        // Try to refresh token
        return refreshTokenAndRetry(originalRequest);
      }
      
      // If refresh token failed, logout user
      clearTokens();
      window.location.href = '/auth/login';
    }
    
    // Handle specific error status codes
    const errorMessage = 
      error.response?.data?.message || 
      error.message || 
      'An unknown error occurred';
    
    // Log error for debugging
    console.error('API response error:', errorMessage, error);
    
    return Promise.reject(error);
  }
);

/**
 * Attempts to refresh the access token and retry the original request
 * 
 * @param {Object} originalRequest - The original axios request config
 * @returns {Promise} - Promise with the retry response or rejection
 */
const refreshTokenAndRetry = async (originalRequest) => {
  try {
    // Implementation of token refresh logic
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    // Make refresh token request
    const response = await axios.post(
      `${originalRequest.baseURL}/auth/refresh-token`,
      { refreshToken }
    );
    
    // Update tokens in storage
    const { accessToken, newRefreshToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    
    // Update authorization header and retry
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return api(originalRequest);
  } catch (error) {
    // Clear tokens on refresh failure
    clearTokens();
    return Promise.reject(error);
  }
};

/**
 * Wrapper for HTTP GET requests
 * 
 * @param {string} url - API endpoint path
 * @param {Object} params - URL parameters
 * @param {Object} options - Additional axios options
 * @returns {Promise} - Promise with the response data
 */
export const get = async (url, params = {}, options = {}) => {
  try {
    const response = await api.get(url, { 
      params,
      ...options
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Wrapper for HTTP POST requests
 * 
 * @param {string} url - API endpoint path
 * @param {Object} data - Request body data
 * @param {Object} options - Additional axios options
 * @returns {Promise} - Promise with the response data
 */
export const post = async (url, data = {}, options = {}) => {
  try {
    const response = await api.post(url, data, options);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Wrapper for HTTP PUT requests
 * 
 * @param {string} url - API endpoint path
 * @param {Object} data - Request body data
 * @param {Object} options - Additional axios options
 * @returns {Promise} - Promise with the response data
 */
export const put = async (url, data = {}, options = {}) => {
  try {
    const response = await api.put(url, data, options);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Wrapper for HTTP PATCH requests
 * 
 * @param {string} url - API endpoint path
 * @param {Object} data - Request body data
 * @param {Object} options - Additional axios options
 * @returns {Promise} - Promise with the response data
 */
export const patch = async (url, data = {}, options = {}) => {
  try {
    const response = await api.patch(url, data, options);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Wrapper for HTTP DELETE requests
 * 
 * @param {string} url - API endpoint path
 * @param {Object} options - Additional axios options
 * @returns {Promise} - Promise with the response data
 */
export const del = async (url, options = {}) => {
  try {
    const response = await api.delete(url, options);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Centralized error handling for API errors
 * 
 * @param {Error} error - Axios error object
 */
const handleApiError = (error) => {
  // Extract error details
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;
  
  // Handle specific error statuses
  switch (status) {
    case 400:
      console.error('Bad Request:', message);
      break;
    case 401:
      console.error('Unauthorized:', message);
      // Handle unauthorized in interceptors
      break;
    case 403:
      console.error('Forbidden:', message);
      break;
    case 404:
      console.error('Not Found:', message);
      break;
    case 422:
      console.error('Validation Error:', message);
      break;
    case 500:
      console.error('Server Error:', message);
      break;
    default:
      console.error('API Error:', message);
  }
};

// Default export for direct API instance usage
export default api; 