/**
 * Security Headers Middleware
 * 
 * Sets recommended security headers for Express.js applications
 * to prevent common web vulnerabilities.
 */

'use strict';

/**
 * Configure default security headers
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
function securityHeaders(options = {}) {
  const defaultOptions = {
    // Content Security Policy
    contentSecurityPolicy: {
      enabled: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
        childSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        upgradeInsecureRequests: true,
        blockAllMixedContent: true
      }
    },
    
    // X-XSS-Protection header
    xssProtection: {
      enabled: true,
      mode: "block"
    },
    
    // X-Content-Type-Options header
    contentTypeOptions: true,
    
    // X-Frame-Options header
    frameOptions: {
      enabled: true,
      action: "SAMEORIGIN" // DENY, SAMEORIGIN, ALLOW-FROM
    },
    
    // Strict-Transport-Security header (HSTS)
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true
    },
    
    // Referrer-Policy header
    referrerPolicy: {
      enabled: true,
      policy: "strict-origin-when-cross-origin"
    },
    
    // Permissions-Policy header (formerly Feature-Policy)
    permissionsPolicy: {
      enabled: true,
      features: {
        geolocation: ["'self'"],
        microphone: ["'none'"],
        camera: ["'none'"],
        payment: ["'self'"],
        usb: ["'none'"],
        fullscreen: ["'self'"],
        accelerometer: ["'none'"],
        gyroscope: ["'none'"],
        magnetometer: ["'none'"],
        midi: ["'none'"]
      }
    },
    
    // Cache-Control headers
    cacheControl: {
      enabled: true,
      noStore: false,
      noCache: false,
      maxAge: 0,
      private: false
    },
    
    // Remove X-Powered-By header
    removePoweredBy: true
  };
  
  // Merge provided options with defaults
  const mergedOptions = mergeOptions(defaultOptions, options);
  
  // Return the Express middleware function
  return function(req, res, next) {
    // Set Content-Security-Policy header
    if (mergedOptions.contentSecurityPolicy.enabled) {
      const cspDirectives = formatCSP(mergedOptions.contentSecurityPolicy.directives);
      res.setHeader('Content-Security-Policy', cspDirectives);
    }
    
    // Set X-XSS-Protection header
    if (mergedOptions.xssProtection.enabled) {
      const xssValue = `1; mode=${mergedOptions.xssProtection.mode}`;
      res.setHeader('X-XSS-Protection', xssValue);
    }
    
    // Set X-Content-Type-Options header
    if (mergedOptions.contentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    
    // Set X-Frame-Options header
    if (mergedOptions.frameOptions.enabled) {
      res.setHeader('X-Frame-Options', mergedOptions.frameOptions.action);
    }
    
    // Set Strict-Transport-Security header (HSTS)
    if (mergedOptions.hsts.enabled) {
      let hstsValue = `max-age=${mergedOptions.hsts.maxAge}`;
      if (mergedOptions.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains';
      }
      if (mergedOptions.hsts.preload) {
        hstsValue += '; preload';
      }
      res.setHeader('Strict-Transport-Security', hstsValue);
    }
    
    // Set Referrer-Policy header
    if (mergedOptions.referrerPolicy.enabled) {
      res.setHeader('Referrer-Policy', mergedOptions.referrerPolicy.policy);
    }
    
    // Set Permissions-Policy header
    if (mergedOptions.permissionsPolicy.enabled) {
      const permissionsPolicy = formatPermissionsPolicy(mergedOptions.permissionsPolicy.features);
      res.setHeader('Permissions-Policy', permissionsPolicy);
    }
    
    // Set Cache-Control headers
    if (mergedOptions.cacheControl.enabled) {
      const cacheControl = [];
      
      if (mergedOptions.cacheControl.noStore) {
        cacheControl.push('no-store');
      }
      if (mergedOptions.cacheControl.noCache) {
        cacheControl.push('no-cache');
      }
      if (mergedOptions.cacheControl.maxAge > 0) {
        cacheControl.push(`max-age=${mergedOptions.cacheControl.maxAge}`);
      }
      if (mergedOptions.cacheControl.private) {
        cacheControl.push('private');
      }
      
      if (cacheControl.length > 0) {
        res.setHeader('Cache-Control', cacheControl.join(', '));
      }
    }
    
    // Remove X-Powered-By header
    if (mergedOptions.removePoweredBy) {
      res.removeHeader('X-Powered-By');
    }
    
    next();
  };
}

/**
 * Format Content-Security-Policy directives
 * @param {Object} directives - CSP directives
 * @returns {String} Formatted CSP header value
 */
function formatCSP(directives) {
  const formattedDirectives = [];
  
  for (const [key, value] of Object.entries(directives)) {
    // Handle boolean flags
    if (key === 'upgradeInsecureRequests' && value === true) {
      formattedDirectives.push('upgrade-insecure-requests');
      continue;
    }
    if (key === 'blockAllMixedContent' && value === true) {
      formattedDirectives.push('block-all-mixed-content');
      continue;
    }
    
    // Skip if value is not an array
    if (!Array.isArray(value)) {
      continue;
    }
    
    // Convert camelCase to kebab-case
    const directiveName = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    
    // Join values with spaces
    const directiveValue = value.join(' ');
    
    // Add to formatted directives
    if (directiveValue) {
      formattedDirectives.push(`${directiveName} ${directiveValue}`);
    }
  }
  
  return formattedDirectives.join('; ');
}

/**
 * Format Permissions-Policy header value
 * @param {Object} features - Permission policy features
 * @returns {String} Formatted Permissions-Policy header value
 */
function formatPermissionsPolicy(features) {
  const formattedFeatures = [];
  
  for (const [feature, allowed] of Object.entries(features)) {
    const allowedStr = Array.isArray(allowed) ? allowed.join(' ') : allowed;
    formattedFeatures.push(`${feature}=(${allowedStr})`);
  }
  
  return formattedFeatures.join(', ');
}

/**
 * Deep merge objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function mergeOptions(target, source) {
  const merged = Object.assign({}, target);
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(merged, { [key]: source[key] });
        } else {
          merged[key] = mergeOptions(target[key], source[key]);
        }
      } else {
        Object.assign(merged, { [key]: source[key] });
      }
    });
  }
  
  return merged;
}

/**
 * Check if value is an object
 * @param {*} item - Value to check
 * @returns {Boolean} True if value is an object
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

module.exports = securityHeaders; 