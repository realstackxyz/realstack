/**
 * RealStack Security Logger
 * 
 * Provides a unified logging interface with support for multiple output targets
 * including console, file, and remote logging services (ELK)
 */

const winston = require('winston');
const { format, transports, createLogger: winstonCreateLogger } = winston;
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const LOG_DIR = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error(`Unable to create log directory: ${LOG_DIR}`, error);
  }
}

// Create custom log format
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Console output format
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, service, ...meta }) => {
    return `[${timestamp}] [${service || 'system'}] ${level}: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

/**
 * Create a logger instance
 * 
 * @param {Object} options Configuration options
 * @param {string} options.service Service name
 * @param {string} options.level Log level (error, warn, info, http, verbose, debug, silly)
 * @param {boolean} options.console Whether to output to console
 * @param {boolean} options.file Whether to output to file
 * @param {Object} options.elk ELK configuration
 * @returns {Object} Logger instance
 */
function createLogger(options = {}) {
  const {
    service = 'security',
    level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    console = true,
    file = process.env.NODE_ENV === 'production',
    elk = null,
  } = options;

  // Log transports configuration
  const logTransports = [];

  // Add console output
  if (console) {
    logTransports.push(
      new transports.Console({
        level,
        format: consoleFormat
      })
    );
  }

  // Add file output
  if (file) {
    // Regular logs
    logTransports.push(
      new transports.File({
        filename: path.join(LOG_DIR, `${service}.log`),
        level,
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );

    // Error logs stored separately
    logTransports.push(
      new transports.File({
        filename: path.join(LOG_DIR, `${service}-error.log`),
        level: 'error',
        format: customFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
      })
    );
  }

  // Add ELK transport (if configured)
  if (elk && elk.host) {
    try {
      // Requires dependency: npm install winston-elasticsearch
      const { ElasticsearchTransport } = require('winston-elasticsearch');
      
      logTransports.push(
        new ElasticsearchTransport({
          level: elk.level || level,
          index: elk.index || `logs-${service}`,
          clientOpts: {
            node: elk.host,
            auth: elk.auth ? {
              username: elk.auth.username,
              password: elk.auth.password
            } : undefined,
            ssl: elk.ssl ? {
              rejectUnauthorized: elk.ssl.verify !== false
            } : undefined
          }
        })
      );
    } catch (error) {
      console.warn('ELK transport module loading failed, winston-elasticsearch dependency may need to be installed', error);
    }
  }

  // Create logger
  const logger = winstonCreateLogger({
    level,
    defaultMeta: { service },
    transports: logTransports,
    exitOnError: false
  });

  // Add audit log method
  logger.audit = function(message, meta = {}) {
    return this.info(message, { 
      ...meta, 
      audit: true, 
      timestamp: new Date().toISOString() 
    });
  };

  // Add security alert method
  logger.security = function(message, meta = {}) {
    return this.warn(message, { 
      ...meta, 
      security: true, 
      timestamp: new Date().toISOString() 
    });
  };

  return logger;
}

/**
 * Create Express middleware for HTTP request logging
 * 
 * @param {Object} logger Logger instance
 * @param {Object} options Configuration options
 * @returns {Function} Express middleware
 */
function createHttpLogger(logger, options = {}) {
  return function(req, res, next) {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || 
                     req.headers['x-correlation-id'] || 
                     require('crypto').randomBytes(8).toString('hex');
    
    // Add request ID to response header
    res.setHeader('X-Request-ID', requestId);

    // Save original response end method
    const originalEnd = res.end;
    
    // Override response end method
    res.end = function(chunk, encoding) {
      // Restore original method
      res.end = originalEnd;
      
      // Call original method
      res.end(chunk, encoding);
      
      // Calculate response time
      const responseTime = Date.now() - start;
      
      // Log request/response
      const logLevel = res.statusCode >= 500 ? 'error' : 
                      res.statusCode >= 400 ? 'warn' : 'info';
      
      const logData = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        responseTime,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        userId: req.user ? req.user.id : null
      };

      // If verbose logging is enabled, log headers and body
      if (options.verbose) {
        logData.headers = req.headers;
        
        // Only log non-binary content and content smaller than specified size
        const contentType = req.get('content-type') || '';
        const contentLength = parseInt(req.get('content-length') || '0', 10);
        const maxBodySize = options.maxBodySize || 10240; // Default 10KB
        
        if (!req.is('multipart/*') && !req.is('image/*') && !req.is('audio/*') && !req.is('video/*') && 
            contentLength > 0 && contentLength < maxBodySize) {
          logData.body = req.body;
        }
      }

      // Log potential security events
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.security(`Security alert: ${res.statusCode} ${req.method} ${req.originalUrl}`, logData);
      } else {
        logger[logLevel](`HTTP ${req.method} ${req.originalUrl}`, logData);
      }
    };
    
    next();
  };
}

/**
 * Create a wrapper for error logging
 * 
 * @param {Object} logger Logger instance
 * @returns {Object} Object containing error handling functions
 */
function createErrorLogger(logger) {
  return {
    /**
     * Handle and log unhandled Promise rejections
     */
    handlePromiseRejections() {
      process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise exception', {
          reason,
          stack: reason.stack,
          promise
        });
      });
    },

    /**
     * Handle and log uncaught exceptions
     */
    handleUncaughtExceptions() {
      process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', {
          error: error.message,
          stack: error.stack
        });
        
        // Give the process some time to log before exiting
        setTimeout(() => {
          process.exit(1);
        }, 1000);
      });
    },

    /**
     * Create Express error handling middleware
     * 
     * @returns {Function} Express error handling middleware
     */
    errorMiddleware() {
      return function(err, req, res, next) {
        logger.error('Express exception', {
          error: err.message,
          stack: err.stack,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userId: req.user ? req.user.id : null,
          requestId: req.headers['x-request-id'] || res.get('X-Request-ID')
        });
        
        next(err);
      };
    }
  };
}

// Export API
module.exports = {
  createLogger,
  createHttpLogger,
  createErrorLogger
}; 