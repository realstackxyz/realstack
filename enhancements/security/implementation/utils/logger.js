/**
 * RealStack Security Logging Utility
 * 
 * A unified logging interface that supports multiple output targets
 * including console, file and remote logging services (ELK).
 */

const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json, simple } = format;
const fs = require('fs');
const path = require('path');

// Check and create log directory if it doesn't exist
const LOG_DIR = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom log format for general logging
const customFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let metaString = '';
  if (Object.keys(metadata).length > 0) {
    metaString = ` | ${JSON.stringify(metadata)}`;
  }
  return `[${timestamp}] [${service || 'app'}] [${level.toUpperCase()}]: ${message}${metaString}`;
});

// Custom format for console output
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  customFormat
);

/**
 * Create a logger instance
 * 
 * @param {Object} options - Logger configuration options
 * @param {string} options.service - Service name identifier
 * @param {string} options.level - Minimum log level (default: 'info')
 * @param {boolean} options.console - Whether to log to console (default: true)
 * @param {boolean} options.file - Whether to log to file (default: true)
 * @param {Object} options.elk - ELK Stack configuration (optional)
 * @returns {Object} Winston logger instance
 */
function createSecurityLogger(options = {}) {
  const {
    service = 'security',
    level = process.env.LOG_LEVEL || 'info',
    console = true,
    file = true,
    elk = null
  } = options;
  
  // Transport array
  const transportArray = [];
  
  // Add console transport if enabled
  if (console) {
    transportArray.push(new transports.Console({
      level,
      format: consoleFormat
    }));
  }
  
  // Add file transport if enabled
  if (file) {
    transportArray.push(new transports.File({
      filename: path.join(LOG_DIR, `${service}.log`),
      level,
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }));
    
    // Also log errors to a separate file
    transportArray.push(new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }));
  }
  
  // Add ELK transport if configured
  if (elk && elk.host) {
    try {
      // This is just a placeholder - in a real implementation,
      // you would use a specific Winston transport for your ELK setup
      // For example: winston-elasticsearch
      
      // Example: 
      // const { ElasticsearchTransport } = require('winston-elasticsearch');
      // transportArray.push(new ElasticsearchTransport({
      //   level: 'info',
      //   clientOpts: {
      //     node: elk.host,
      //     auth: elk.auth ? {
      //       username: elk.auth.username,
      //       password: elk.auth.password
      //     } : undefined
      //   },
      //   indexPrefix: elk.indexPrefix || 'realstack'
      // }));
    } catch (error) {
      console.error('Failed to initialize ELK transport:', error.message);
    }
  }
  
  // Create logger instance
  const logger = createLogger({
    level,
    defaultMeta: { service },
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      json()
    ),
    transports: transportArray,
    exitOnError: false
  });
  
  // Add audit logging method
  logger.audit = function(message, metadata = {}) {
    this.info(`[AUDIT] ${message}`, { 
      ...metadata, 
      audit: true, 
      timestamp: new Date().toISOString() 
    });
  };
  
  // Add security alert method
  logger.securityAlert = function(message, metadata = {}) {
    this.warn(`[SECURITY_ALERT] ${message}`, { 
      ...metadata, 
      securityAlert: true, 
      timestamp: new Date().toISOString()
    });
  };
  
  return logger;
}

/**
 * Create HTTP request logger middleware
 * 
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function for logging HTTP requests
 */
function createHttpLogger(options = {}) {
  const logger = options.logger || createSecurityLogger({ 
    service: 'http',
    ...options
  });
  
  // Express middleware function
  return function httpLogger(req, res, next) {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || 
                     req.headers['x-correlation-id'] || 
                     `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Add requestId to the request object
    req.requestId = requestId;
    
    // Process request
    res.on('finish', () => {
      const responseTime = Date.now() - start;
      const method = req.method;
      const url = req.originalUrl || req.url;
      const status = res.statusCode;
      
      // Log at appropriate level based on status code
      let logFn = logger.info.bind(logger);
      if (status >= 500) {
        logFn = logger.error.bind(logger);
      } else if (status >= 400) {
        logFn = logger.warn.bind(logger);
      }
      
      // Log the request
      logFn(`${method} ${url} ${status}`, {
        requestId,
        method,
        url,
        status,
        responseTime,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user ? req.user.id : 'anonymous'
      });
      
      // Log security events
      if (status === 401 || status === 403) {
        logger.securityAlert(`Authentication/Authorization failure`, {
          requestId,
          method,
          url,
          status,
          ip: req.ip || req.connection.remoteAddress,
          userId: req.user ? req.user.id : 'anonymous'
        });
      }
    });
    
    next();
  };
}

/**
 * Create error logger
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} Error logging utilities
 */
function createErrorLogger(options = {}) {
  const logger = options.logger || createSecurityLogger({ 
    service: 'errors',
    ...options
  });
  
  // Unhandled promise rejection handler
  function handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled promise rejection', {
      reason: reason.stack || reason.toString(),
      timestamp: new Date().toISOString()
    });
  }
  
  // Uncaught exception handler
  function handleUncaughtException(error) {
    logger.error('Uncaught exception', {
      error: error.stack || error.toString(),
      timestamp: new Date().toISOString()
    });
    
    if (options.exitOnUncaughtException !== false) {
      process.exit(1);
    }
  }
  
  // Express error middleware
  function expressErrorLogger(err, req, res, next) {
    logger.error(`Express error: ${err.message}`, {
      error: err.stack,
      requestId: req.requestId,
      url: req.originalUrl || req.url,
      method: req.method,
      userId: req.user ? req.user.id : 'anonymous',
      timestamp: new Date().toISOString()
    });
    
    next(err);
  }
  
  // Set up global handlers
  if (options.handleRejections !== false) {
    process.on('unhandledRejection', handleUnhandledRejection);
  }
  
  if (options.handleExceptions !== false) {
    process.on('uncaughtException', handleUncaughtException);
  }
  
  return {
    expressErrorLogger,
    handleUnhandledRejection,
    handleUncaughtException,
    logger
  };
}

module.exports = {
  createLogger: createSecurityLogger,
  createHttpLogger,
  createErrorLogger
}; 