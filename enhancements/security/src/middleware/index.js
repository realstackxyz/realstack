/**
 * RealStack Security Middleware
 * 
 * A comprehensive set of security middleware for Node.js/Express applications.
 * These middleware components provide protection against common web vulnerabilities,
 * implement rate limiting, CSRF protection, and other security measures.
 */

'use strict';

// Export all middleware components
module.exports = {
  // HTTP Security Headers
  securityHeaders: require('./security-headers'),
  
  // Rate Limiting
  rateLimiter: require('./rate-limiter'),
  
  // CSRF Protection
  csrfProtection: require('./csrf-protection'),
  
  // Content Validation
  contentValidation: require('./content-validation'),
  
  // Authentication Security
  authSecurity: require('./auth-security'),
  
  // Blockchain Transaction Security
  blockchainSecurity: require('./blockchain-security'),
  
  // Request Sanitization
  requestSanitization: require('./request-sanitization'),
  
  // API Key Management
  apiKeyManagement: require('./api-key-management'),
  
  // Security Logging
  securityLogging: require('./security-logging'),
  
  // Data Encryption
  dataEncryption: require('./data-encryption'),
  
  // SQL Injection Protection
  sqlInjectionProtection: require('./sql-injection-protection'),
  
  // XSS Protection
  xssProtection: require('./xss-protection'),
  
  // Security Utility functions
  utils: require('./utils')
}; 