/**
 * Error handler utility for the backend
 */
const logger = require('./logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  /**
   * Create a new API error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Error} originalError - Original error if applicable
   */
  constructor(message, statusCode, originalError = null) {
    super(message);
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a new API error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Error} originalError - Original error if applicable
 * @returns {ApiError} The API error
 */
const createError = (message, statusCode, originalError = null) => {
  const errorObj = new ApiError(message, statusCode, originalError);
  
  // Log the error with the original stack trace if available
  if (originalError) {
    logger.error(`${statusCode} - ${message}`, {
      originalError: {
        message: originalError.message,
        stack: originalError.stack,
        name: originalError.name
      }
    });
  } else {
    logger.error(`${statusCode} - ${message}`);
  }
  
  return errorObj;
};

/**
 * Error handler middleware for Express
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorMiddleware = (err, req, res, next) => {
  // Default status code and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';
  
  // Check for specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = formatValidationError(err);
  } else if (err.name === 'MongoError' && err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate key error';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // Log the error
  logger.error(`${statusCode} - ${req.method} ${req.originalUrl} - ${message}`, {
    error: err.name,
    stack: err.stack,
    requestId: req.id,
    userId: req.user ? req.user.id : 'unauthenticated'
  });
  
  // Send response
  res.status(statusCode).json({
    success: false,
    status: 'error',
    message,
    errorCode: err.errorCode || null,
    // Include stack trace in development mode
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err.originalError ? {
        message: err.originalError.message,
        name: err.originalError.name
      } : null
    })
  });
};

/**
 * Format validation error messages from Mongoose or Joi
 * @param {Error} err - The validation error
 * @returns {string} Formatted error message
 */
const formatValidationError = (err) => {
  // Mongoose validation error
  if (err.errors) {
    const errorMessages = Object.values(err.errors).map(error => error.message);
    return errorMessages.join(', ');
  }
  
  // Joi validation error
  if (err.details) {
    const errorMessages = err.details.map(detail => detail.message);
    return errorMessages.join(', ');
  }
  
  return err.message;
};

/**
 * Async error handler wrapper to avoid try/catch blocks
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle Solana specific errors
 * @param {Error} err - The Solana error
 * @returns {ApiError} The API error
 */
const handleSolanaError = (err) => {
  // Default error
  let statusCode = 500;
  let message = 'Solana transaction error';
  
  // Extract the error message from Solana errors
  if (err.logs && Array.isArray(err.logs)) {
    // Look for error messages in logs
    const errorLog = err.logs.find(log => log.includes('Error:') || log.includes('Program log:'));
    if (errorLog) {
      message = errorLog;
    }
  }
  
  // Extract error from custom program errors (often in err.message)
  if (err.message) {
    if (err.message.includes('insufficient funds')) {
      statusCode = 400;
      message = 'Insufficient funds for transaction';
    } else if (err.message.includes('invalid address')) {
      statusCode = 400;
      message = 'Invalid Solana address';
    } else if (err.message.includes('Transaction was not confirmed')) {
      statusCode = 408;
      message = 'Transaction timeout: not confirmed within the allocated time';
    }
  }
  
  logger.error(`Solana Error: ${message}`, {
    originalError: err,
    code: err.code,
    logs: err.logs
  });
  
  return new ApiError(message, statusCode, err);
};

module.exports = {
  createError,
  ApiError,
  errorMiddleware,
  asyncHandler,
  handleSolanaError
}; 