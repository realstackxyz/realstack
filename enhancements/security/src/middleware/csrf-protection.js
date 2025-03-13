/**
 * RealStack CSRF Protection Middleware
 * 
 * Provides CSRF (Cross-Site Request Forgery) protection for web applications.
 * Implements token-based CSRF protection with both cookie and header verification.
 */

'use strict';

const crypto = require('crypto');
const { createLogger } = require('../utils/logger');
const Tokens = require('csrf');

const logger = createLogger({ service: 'csrf_protection' });

/**
 * Create CSRF protection middleware
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} CSRF middleware functions
 */
module.exports = function createCsrfProtection(options = {}) {
  const config = {
    // Cookie name for the CSRF token
    cookieName: options.cookieName || 'XSRF-TOKEN',
    
    // HTTP header name for the CSRF token
    headerName: options.headerName || 'X-XSRF-TOKEN',
    
    // Cookie options
    cookie: {
      httpOnly: false, // Client JavaScript needs to read the token
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
      ...options.cookie
    },
    
    // Routes to exclude from CSRF protection
    excludeRoutes: options.excludeRoutes || [],
    
    // Custom error handling
    errorHandler: options.errorHandler || ((err, req, res, next) => {
      res.status(403).json({
        error: 'CSRF token validation failed',
        message: 'Invalid or missing CSRF token'
      });
    }),
    
    // Token generation method
    generateToken: options.generateToken || ((req) => {
      return crypto.randomBytes(32).toString('hex');
    }),
    
    // Token validation method - default compares token from cookie with token from header
    validateToken: options.validateToken || ((req, cookieToken) => {
      const headerToken = req.headers[config.headerName.toLowerCase()];
      return headerToken && cookieToken && headerToken === cookieToken;
    })
  };
  
  // 创建CSRF令牌管理器
  const tokens = new Tokens();
  
  /**
   * Generate and set CSRF token
   */
  function generateToken(req, res, next) {
    // Skip if token already exists
    if (req.csrfToken) {
      return next();
    }
    
    // Generate new token
    const token = config.generateToken(req);
    
    // Store token in request for potential further use
    req.csrfToken = token;
    
    // Set cookie with the token
    res.cookie(config.cookieName, token, config.cookie);
    
    // Continue to next middleware
    next();
  }
  
  /**
   * Validate CSRF token on protected requests
   */
  function validateToken(req, res, next) {
    // Skip validation for excluded routes
    if (isExcludedRoute(req.path, config.excludeRoutes)) {
      return next();
    }
    
    // Skip validation for non-modifying methods
    if (isReadOnlyMethod(req.method)) {
      return next();
    }
    
    // Get token from cookie
    const cookieToken = req.cookies[config.cookieName];
    
    // Validate token
    if (!cookieToken || !config.validateToken(req, cookieToken)) {
      logger.warn('CSRF validation failed', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id || 'anonymous'
      });
      
      return config.errorHandler(new Error('CSRF token validation failed'), req, res, next);
    }
    
    // Valid token, continue
    next();
  }
  
  /**
   * Check if request path should be excluded from CSRF protection
   * 
   * @param {string} path - Request path
   * @param {Array} excludedRoutes - Array of route patterns to exclude
   * @returns {boolean} Whether the path should be excluded
   * @private
   */
  function isExcludedRoute(path, excludedRoutes) {
    return excludedRoutes.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(path);
      }
      return path === pattern || path.startsWith(`${pattern}/`);
    });
  }
  
  /**
   * Check if HTTP method is read-only (doesn't modify state)
   * 
   * @param {string} method - HTTP method
   * @returns {boolean} Whether the method is read-only
   * @private
   */
  function isReadOnlyMethod(method) {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }
  
  // Return middleware functions
  return {
    generateToken,
    validateToken,
    
    // Express middleware that both generates and validates tokens
    middleware: function(req, res, next) {
      // Skip for excluded routes
      if (isExcludedRoute(req.path, config.excludeRoutes)) {
        return next();
      }
      
      // For read-only methods, only generate token
      if (isReadOnlyMethod(req.method)) {
        return generateToken(req, res, next);
      }
      
      // For state-modifying methods, validate token first then generate new one
      const cookieToken = req.cookies[config.cookieName];
      
      if (!cookieToken || !config.validateToken(req, cookieToken)) {
        logger.warn('CSRF validation failed', {
          path: req.path,
          method: req.method,
          ip: req.ip,
          userId: req.user?.id || 'anonymous'
        });
        
        return config.errorHandler(new Error('CSRF token validation failed'), req, res, next);
      }
      
      // Valid token, generate new one and continue
      const token = config.generateToken(req);
      req.csrfToken = token;
      res.cookie(config.cookieName, token, config.cookie);
      
      next();
    }
  };
}; 