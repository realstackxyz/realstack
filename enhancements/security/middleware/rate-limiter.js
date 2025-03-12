/**
 * RealStack Rate Limiting Middleware
 * 
 * Provides configurable request rate limiting functionality to prevent brute force attacks, DOS attacks, and API abuse.
 * Supports multiple storage backends (memory, Redis) and flexible limiting strategies.
 */

'use strict';

const { RateLimiterMemory, RateLimiterRedis } = require('rate-limiter-flexible');
const { createLogger } = require('../utils/logger');

const logger = createLogger({ service: 'rate_limiter' });

/**
 * Create rate limiting middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
module.exports = function createRateLimiter(options = {}) {
  const config = {
    // Store type: 'memory' or 'redis'
    storeType: options.storeType || 'memory',
    
    // Redis configuration (when storeType is 'redis')
    redis: options.redis || {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '',
      db: process.env.REDIS_DB || 0,
      keyPrefix: 'ratelimit:'
    },
    
    // Rate limiting strategies
    limiters: {
      // Default limit (applies to all requests)
      default: {
        points: 100,        // Maximum number of requests allowed in the time window
        duration: 60,       // Time window in seconds
        blockDuration: 600, // Block duration in seconds when limit is exceeded
      },
      
      // IP-based limits
      ip: {
        points: 1000,
        duration: 3600,
        blockDuration: 7200,
      },
      
      // User-based limits (authenticated users)
      user: {
        points: 5000,
        duration: 3600,
        blockDuration: 0,  // 0 means no blocking
      },
      
      // Endpoint specific limits
      endpoints: {
        // Login endpoint has stricter limits to prevent brute force
        'POST /api/auth/login': {
          points: 5,
          duration: 60,
          blockDuration: 600,
        },
        
        // Registration has moderate limits to prevent abuse
        'POST /api/auth/register': {
          points: 3,
          duration: 3600,
          blockDuration: 86400,
        },
        
        // Verification endpoints
        'POST /api/auth/verify': {
          points: 10,
          duration: 3600,
          blockDuration: 7200,
        },
        
        // Password reset
        'POST /api/auth/reset-password': {
          points: 5,
          duration: 3600,
          blockDuration: 7200,
        },
      },
      
      // custom limits by user role
      roles: {
        admin: {
          points: 10000,
          duration: 3600,
          blockDuration: 0,
        },
        premium: {
          points: 7500,
          duration: 3600,
          blockDuration: 0,
        },
      },
      
      // Override with user provided limiters
      ...options.limiters
    },
    
    // Response when rate limit is exceeded
    errorResponse: options.errorResponse || {
      status: 429,
      message: 'Too Many Requests',
      data: null
    },
    
    // Headers to return with rate limit information
    headers: options.headers !== false,
    
    // Skip rate limiting for certain requests (function)
    skip: options.skip || (() => false),
    
    // Key generator function
    keyGenerator: options.keyGenerator || ((req) => {
      // Default: Use IP + Route or just IP
      return req.user ? 
        `${req.ip}:${req.method}:${req.route?.path || req.path}:${req.user.id}` : 
        `${req.ip}:${req.method}:${req.route?.path || req.path}`;
    }),
  };
  
  // Initialize store based on configuration
  let store;
  if (config.storeType === 'redis') {
    try {
      const Redis = require('ioredis');
      const client = new Redis(config.redis);
      
      store = {
        async increment(key, points = 1) {
          const pipeline = client.pipeline();
          const now = Date.now();
          const expiry = Math.floor(now / 1000) + config.limiters.default.duration;
          
          pipeline.zadd(key, now, now);
          pipeline.zremrangebyscore(key, 0, now - (config.limiters.default.duration * 1000));
          pipeline.zcard(key);
          pipeline.expire(key, config.limiters.default.duration);
          
          const results = await pipeline.exec();
          return parseInt(results[2][1], 10);
        },
        
        async get(key) {
          const now = Date.now();
          const count = await client.zcount(key, now - (config.limiters.default.duration * 1000), now);
          return count;
        },
        
        async reset(key) {
          await client.del(key);
          return true;
        },
        
        async block(key, duration) {
          const blockKey = `blocked:${key}`;
          await client.set(blockKey, 1, 'EX', duration);
          return true;
        },
        
        async isBlocked(key) {
          const blockKey = `blocked:${key}`;
          const blocked = await client.get(blockKey);
          return !!blocked;
        }
      };
    } catch (error) {
      logger.error('Failed to initialize Redis store for rate limiting', { error: error.message });
      throw new Error(`Redis rate limiting store initialization failed: ${error.message}`);
    }
  } else {
    // Memory store
    const memory = {
      requests: new Map(),
      blocked: new Map(),
    };
    
    store = {
      async increment(key, points = 1) {
        const now = Date.now();
        const windowMs = config.limiters.default.duration * 1000;
        
        let record = memory.requests.get(key) || { count: 0, timestamps: [] };
        
        // Filter out timestamps outside the current window
        record.timestamps = record.timestamps.filter(time => now - time < windowMs);
        
        // Add the new request timestamp
        record.timestamps.push(now);
        record.count = record.timestamps.length;
        
        memory.requests.set(key, record);
        
        return record.count;
      },
      
      async get(key) {
        const now = Date.now();
        const windowMs = config.limiters.default.duration * 1000;
        
        const record = memory.requests.get(key);
        if (!record) return 0;
        
        // Filter out timestamps outside the current window
        record.timestamps = record.timestamps.filter(time => now - time < windowMs);
        record.count = record.timestamps.length;
        
        memory.requests.set(key, record);
        
        return record.count;
      },
      
      async reset(key) {
        memory.requests.delete(key);
        return true;
      },
      
      async block(key, duration) {
        memory.blocked.set(key, Date.now() + (duration * 1000));
        return true;
      },
      
      async isBlocked(key) {
        const expiry = memory.blocked.get(key);
        if (!expiry) return false;
        
        if (Date.now() > expiry) {
          memory.blocked.delete(key);
          return false;
        }
        
        return true;
      }
    };
  }
  
  // Cleanup function for memory store
  if (config.storeType === 'memory') {
    // Run every minute to clean up expired items
    setInterval(() => {
      const now = Date.now();
      
      // Clean up request records
      for (const [key, record] of store.requests.entries()) {
        const windowMs = config.limiters.default.duration * 1000;
        record.timestamps = record.timestamps.filter(time => now - time < windowMs);
        
        if (record.timestamps.length === 0) {
          store.requests.delete(key);
        } else {
          record.count = record.timestamps.length;
          store.requests.set(key, record);
        }
      }
      
      // Clean up blocked keys
      for (const [key, expiry] of store.blocked.entries()) {
        if (now > expiry) {
          store.blocked.delete(key);
        }
      }
    }, 60000);
  }
  
  // Return the middleware function
  return async function rateLimiter(req, res, next) {
    try {
      // Skip rate limiting if the condition is met
      if (config.skip(req)) {
        return next();
      }
      
      // Generate the rate limiting key
      const key = config.keyGenerator(req);
      
      // Check if already blocked
      const isBlocked = await store.isBlocked(key);
      if (isBlocked) {
        logger.warn('Request blocked due to rate limiting', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userId: req.user?.id
        });
        
        if (config.headers) {
          res.setHeader('Retry-After', Math.floor(config.limiters.default.blockDuration));
          res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + config.limiters.default.blockDuration));
        }
        
        return res.status(config.errorResponse.status).json(config.errorResponse);
      }
      
      // Determine which limit to apply
      let limiter = config.limiters.default;
      
      // Check endpoint specific limits
      const endpointKey = `${req.method} ${req.path}`;
      if (config.limiters.endpoints && config.limiters.endpoints[endpointKey]) {
        limiter = config.limiters.endpoints[endpointKey];
      }
      
      // Check user role limits if user is authenticated
      if (req.user && req.user.role && config.limiters.roles && config.limiters.roles[req.user.role]) {
        limiter = config.limiters.roles[req.user.role];
      }
      
      // Increment the counter
      const current = await store.increment(key);
      
      // Add rate limit headers if enabled
      if (config.headers) {
        res.setHeader('X-RateLimit-Limit', limiter.points);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limiter.points - current));
        res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + limiter.duration));
      }
      
      // Check if the limit has been reached
      if (current > limiter.points) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userId: req.user?.id,
          current,
          limit: limiter.points
        });
        
        // Block the requester if configured
        if (limiter.blockDuration > 0) {
          await store.block(key, limiter.blockDuration);
          
          if (config.headers) {
            res.setHeader('Retry-After', Math.floor(limiter.blockDuration));
            res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + limiter.blockDuration));
          }
        }
        
        return res.status(config.errorResponse.status).json(config.errorResponse);
      }
      
      // Continue to the next middleware
      next();
    } catch (error) {
      logger.error('Rate limiting error', { error: error.message });
      next(error);
    }
  };
}; 