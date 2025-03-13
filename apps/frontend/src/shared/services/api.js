import axios from 'axios';
import { API_URL } from '../../core/config/constants';

/**
 * Create API Service Instance
 * Centrally manage API request configuration, interceptors, and error handling
 */
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Get token from local storage
        const token = localStorage.getItem('auth_token');
        // If token exists, add to request headers
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Return response data directly
        return response.data;
      },
      (error) => {
        // Error handling
        let errorMessage = 'An unknown error occurred';
        
        if (error.response) {
          // Server returned an error status code
          const { status, data } = error.response;
          
          switch (status) {
            case 400:
              errorMessage = data.message || 'Invalid request';
              break;
            case 401:
              errorMessage = 'Unauthorized, please login again';
              // Handle authentication error
              this.handleAuthError();
              break;
            case 403:
              errorMessage = 'Access denied';
              break;
            case 404:
              errorMessage = 'Resource not found';
              break;
            case 500:
              errorMessage = 'Server error';
              break;
            default:
              errorMessage = `Request failed (${status})`;
          }
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = 'Cannot connect to server';
        } else {
          // Error in setting up the request
          errorMessage = error.message;
        }

        // Create standardized error object
        const errorObject = {
          message: errorMessage,
          status: error.response ? error.response.status : null,
          originalError: error,
        };

        return Promise.reject(errorObject);
      }
    );
  }

  /**
   * Handle authentication error (401)
   */
  handleAuthError() {
    // Clear authentication info from local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_profile');
    
    // Can add redirect to login page logic here
    // Or trigger a global event to let other parts of the app know authentication has expired
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  /**
   * GET request
   */
  get(url, params = {}, config = {}) {
    return this.client.get(url, { params, ...config });
  }

  /**
   * POST request
   */
  post(url, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  /**
   * PUT request
   */
  put(url, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  /**
   * PATCH request
   */
  patch(url, data = {}, config = {}) {
    return this.client.patch(url, data, config);
  }

  /**
   * DELETE request
   */
  delete(url, config = {}) {
    return this.client.delete(url, config);
  }
}

// Create API service instance
const apiService = new ApiService();

export default apiService; 