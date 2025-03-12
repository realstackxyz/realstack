/**
 * RealStack Security Middleware
 * 
 * A comprehensive security middleware for Express.js applications 
 * that implements various security features including:
 * - API request validation
 * - Rate limiting
 * - CSRF protection
 * - Request sanitization
 * - Security headers
 * - JWT validation
 */

const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const helmet = require('helmet');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Creates the security middleware chain with configurable options
 */
function createSecurityMiddleware(options = {}) {
  const config = {
    rateLimiting: true,
    csrfProtection: true,
    securityHeaders: true,
    requestSanitization: true,
    jwtValidation: true,
    parameterPollutionPrevention: true,
    ...options
  };

  const middlewares = [];

  // Security Headers using Helmet
  if (config.securityHeaders) {
    middlewares.push(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", config.scriptSources || []].flat(),
          styleSrc: ["'self'", "'unsafe-inline'", config.styleSources || []].flat(),
          imgSrc: ["'self'", 'data:', config.imageSources || []].flat(),
          connectSrc: ["'self'", config.apiSources || []].flat(),
          fontSrc: ["'self'", config.fontSources || []].flat(),
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'", config.frameSources || []].flat(),
        },
      },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'same-origin' },
    }));
  }

  // Rate limiting
  if (config.rateLimiting) {
    const apiLimiter = rateLimit({
      windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes by default
      max: config.rateLimit?.maxRequests || 100, // 100 requests per windowMs by default
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 429,
        message: 'Too many requests from this IP, please try again later.'
      },
      skipSuccessfulRequests: false,
      // Custom rate limiter function, if provided
      keyGenerator: config.rateLimit?.keyGenerator || ((req) => {
        // Default key is IP, but can be extended to include user ID if authenticated
        return req.user ? `${req.ip}-${req.user.id}` : req.ip;
      }),
      skip: config.rateLimit?.skip || (() => false),
    });

    middlewares.push(apiLimiter);

    // Additional strict limiter for auth endpoints
    if (config.authRateLimiting) {
      const authLimiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour window
        max: 5, // 5 attempts per hour
        standardHeaders: true,
        message: {
          status: 429,
          message: 'Too many authentication attempts, please try again later.'
        },
        skipSuccessfulRequests: true, // Don't count successful logins
      });

      // Apply auth limiter to specific routes
      middlewares.push((req, res, next) => {
        if (req.path.match(/\/api\/v[0-9]+\/(auth|login|register)/i)) {
          return authLimiter(req, res, next);
        }
        return next();
      });
    }
  }

  // CSRF Protection - only apply to routes that change state
  if (config.csrfProtection) {
    const csrfProtection = csrf({
      cookie: {
        secure: config.secureCookies !== false,
        sameSite: 'strict',
        httpOnly: true
      }
    });

    // Apply CSRF protection to non-GET, non-API routes
    middlewares.push((req, res, next) => {
      // Skip CSRF for API routes (typically JWT protected)
      if (req.path.startsWith('/api/')) {
        return next();
      }
      // Skip CSRF for GET, HEAD, OPTIONS requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      // Apply CSRF for routes that change state
      return csrfProtection(req, res, next);
    });

    // Add CSRF token generator middleware
    middlewares.push((req, res, next) => {
      if (!req.path.startsWith('/api/')) {
        res.locals.csrfToken = req.csrfToken;
      }
      next();
    });
  }

  // Request sanitization
  if (config.requestSanitization) {
    // Prevent MongoDB injection attacks
    middlewares.push(mongoSanitize());
    
    // Prevent XSS attacks
    middlewares.push(xss());
    
    // Prevent HTTP Parameter Pollution
    if (config.parameterPollutionPrevention) {
      middlewares.push(hpp({
        whitelist: config.hppWhitelist || []
      }));
    }
  }

  // JWT Token validation middleware
  if (config.jwtValidation) {
    middlewares.push((req, res, next) => {
      // Skip JWT validation for public routes
      if (
        !req.path.startsWith('/api/') || 
        req.path.match(/\/api\/v[0-9]+\/(auth|login|register|public)/i)
      ) {
        return next();
      }

      try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            status: 'error',
            message: 'No authorization token provided.'
          });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
          return res.status(401).json({
            status: 'error',
            message: 'Invalid token format.'
          });
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret || process.env.JWT_SECRET);
        
        // Check token expiration
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          return res.status(401).json({
            status: 'error',
            message: 'Token has expired.'
          });
        }

        // Check if token is in blacklist (for logout or revocation)
        if (typeof config.tokenBlacklistCheck === 'function') {
          const isBlacklisted = config.tokenBlacklistCheck(token);
          if (isBlacklisted) {
            return res.status(401).json({
              status: 'error',
              message: 'Token has been revoked.'
            });
          }
        }

        // Add user to request object
        req.user = decoded;
        return next();
      } catch (error) {
        return res.status(401).json({
          status: 'error', 
          message: 'Invalid token.'
        });
      }
    });
  }

  // Add request logging for security events
  middlewares.push((req, res, next) => {
    // Log potentially suspicious activities
    const originalEnd = res.end;
    res.end = function (chunk, encoding) {
      // Log 401, 403 and 429 responses for security monitoring
      if ([401, 403, 429].includes(res.statusCode)) {
        const securityEvent = {
          timestamp: new Date().toISOString(),
          level: 'warning',
          service: 'security_middleware',
          message: `Security event: ${res.statusCode} response for ${req.method} ${req.originalUrl}`,
          data: {
            statusCode: res.statusCode,
            method: req.method,
            path: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            userId: req.user ? req.user.id : null,
          }
        };

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.warn('[SECURITY]', securityEvent);
        }

        // If we have a logger configured, use it
        if (config.logger && typeof config.logger.warn === 'function') {
          config.logger.warn(securityEvent);
        }
      }

      originalEnd.call(res, chunk, encoding);
    };
    
    next();
  });

  // Combine all middlewares into a single function
  return (req, res, next) => {
    // Execute each middleware in sequence
    const executeMiddlewareChain = (index) => {
      if (index >= middlewares.length) {
        return next();
      }
      
      middlewares[index](req, res, (err) => {
        if (err) {
          return next(err);
        }
        executeMiddlewareChain(index + 1);
      });
    };

    executeMiddlewareChain(0);
  };
}

/**
 * Validation middleware factory for API requests
 */
function createValidationMiddleware(validationRules) {
  return [
    // Apply validation rules
    validationRules,
    
    // Handle validation errors
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      next();
    }
  ];
}

/**
 * Common validation rules that can be reused across endpoints
 */
const commonValidations = {
  id: check('id').isMongoId().withMessage('Invalid ID format'),
  email: check('email').isEmail().withMessage('Invalid email format'),
  password: check('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character'),
  walletAddress: check('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Invalid Ethereum wallet address'),
  transactionHash: check('transactionHash')
    .matches(/^0x[a-fA-F0-9]{64}$/).withMessage('Invalid transaction hash'),
  amount: check('amount')
    .isNumeric().withMessage('Amount must be a number')
    .custom(value => value > 0).withMessage('Amount must be greater than 0'),
  page: check('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: check('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
};

/**
 * Creates security middleware for blockchain transaction endpoints
 */
function createBlockchainSecurityMiddleware(options = {}) {
  return [
    // Validate blockchain transaction parameters
    (req, res, next) => {
      if (req.body.walletAddress && !req.body.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid wallet address format'
        });
      }

      if (req.body.transactionHash && !req.body.transactionHash.match(/^0x[a-fA-F0-9]{64}$/)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid transaction hash format'
        });
      }

      if (req.body.contractAddress && !req.body.contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid contract address format'
        });
      }

      if (req.body.signature && !req.body.signature.match(/^0x[a-fA-F0-9]{130}$/)) {
        return res.status(400).json({ 
          status: 'error',
          message: 'Invalid signature format'
        });
      }

      next();
    },

    // Add blockchain transaction rate limiting
    rateLimit({
      windowMs: options.windowMs || 60 * 1000, // 1 minute by default
      max: options.maxTransactions || 5, // 5 transactions per minute by default
      message: {
        status: 'error',
        message: 'Too many blockchain transactions, please try again later'
      },
      keyGenerator: (req) => {
        // Rate limit by user ID and wallet address combination if available
        const userId = req.user ? req.user.id : 'anonymous';
        const walletAddress = req.body.walletAddress || req.query.walletAddress || 'unknown';
        return `${userId}:${walletAddress}`;
      }
    }),

    // Add blockchain transaction logging
    (req, res, next) => {
      const originalEnd = res.end;
      
      res.end = function (chunk, encoding) {
        // Only log blockchain transactions
        if (req.path.match(/\/(transaction|contract|wallet|block)/i)) {
          const logEvent = {
            timestamp: new Date().toISOString(),
            level: 'info',
            service: 'blockchain_middleware',
            message: `Blockchain transaction: ${req.method} ${req.originalUrl}`,
            data: {
              method: req.method,
              path: req.originalUrl,
              userId: req.user ? req.user.id : null,
              walletAddress: req.body.walletAddress || req.query.walletAddress,
              transactionType: req.body.type || 'unknown',
              status: res.statusCode < 400 ? 'success' : 'failed'
            }
          };

          // Log to console in development
          if (process.env.NODE_ENV === 'development') {
            console.info('[BLOCKCHAIN]', logEvent);
          }

          // If we have a logger configured, use it
          if (options.logger && typeof options.logger.info === 'function') {
            options.logger.info(logEvent);
          }
        }

        originalEnd.call(res, chunk, encoding);
      };
      
      next();
    }
  ];
}

/**
 * Configuration for securing admin API routes
 */
function createAdminSecurityMiddleware() {
  return [
    // Verify that user has admin role
    (req, res, next) => {
      if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
        return res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions. Admin access required.'
        });
      }
      next();
    },

    // Add extra rate limiting for admin operations
    rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 60, // 60 admin operations per hour
      message: {
        status: 'error',
        message: 'Too many admin operations, please try again later.'
      }
    }),

    // Log all admin operations
    (req, res, next) => {
      const adminEvent = {
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'admin_middleware',
        message: `Admin operation: ${req.method} ${req.originalUrl}`,
        data: {
          method: req.method,
          path: req.originalUrl,
          adminId: req.user.id,
          ip: req.ip,
          userAgent: req.get('user-agent')
        }
      };

      // Log admin operations to console in development
      if (process.env.NODE_ENV === 'development') {
        console.info('[ADMIN]', adminEvent);
      }

      // Send to the configured logger if available
      if (req.app.locals.logger && typeof req.app.locals.logger.info === 'function') {
        req.app.locals.logger.info(adminEvent);
      }

      next();
    }
  ];
}

module.exports = {
  createSecurityMiddleware,
  createValidationMiddleware,
  createBlockchainSecurityMiddleware,
  createAdminSecurityMiddleware,
  commonValidations
}; 