/**
 * RealStack Security Module
 * 
 * This is the main entry point for the RealStack security module.
 * It exports all security components for easy importing.
 */

// Core components
const Authentication = require('./core/auth/authentication');
const EncryptionService = require('./core/crypto/encryption-service');
const TransactionSecurity = require('./core/blockchain/transaction-security');
const WalletSecurity = require('./core/blockchain/wallet-security');

// Middleware
const createRateLimiter = require('./middleware/rate-limiter');
const createCsrfProtection = require('./middleware/csrf-protection');

// Utilities
const { createLogger, createHttpLogger, createErrorLogger } = require('./utils/logger');

// CI/CD
const { SecurityCIChecks } = require('./ci/cd/security-checks');

/**
 * Initialize all security components with the provided configuration
 * 
 * @param {Object} config - Configuration object
 * @returns {Object} Initialized security components
 */
function initializeSecurity(config = {}) {
  const logger = createLogger(config.logger || {});
  
  // Initialize components with logger
  const authentication = new Authentication({
    ...config.authentication,
    logger
  });
  
  const encryption = new EncryptionService({
    ...config.encryption
  });
  
  const transactionSecurity = new TransactionSecurity({
    ...config.transactionSecurity,
    logger
  });
  
  const walletSecurity = new WalletSecurity({
    ...config.walletSecurity,
    logger
  });
  
  // Initialize middleware
  const rateLimiter = createRateLimiter({
    ...config.rateLimiter,
    logger
  });
  
  const csrfProtection = createCsrfProtection({
    ...config.csrfProtection,
    logger
  });
  
  // Initialize CI/CD tools
  const securityCI = new SecurityCIChecks({
    ...config.securityCI
  });
  
  // Return all initialized components
  return {
    authentication,
    encryption,
    transactionSecurity,
    walletSecurity,
    middleware: {
      rateLimiter,
      csrfProtection,
      httpLogger: createHttpLogger({ logger }),
      errorLogger: createErrorLogger({ logger }).expressErrorLogger
    },
    utils: {
      logger,
      createLogger,
      createHttpLogger,
      createErrorLogger
    },
    ci: {
      securityCI
    }
  };
}

module.exports = {
  // Factory function
  initializeSecurity,
  
  // Core components
  Authentication,
  EncryptionService,
  TransactionSecurity,
  WalletSecurity,
  
  // Middleware
  createRateLimiter,
  createCsrfProtection,
  
  // Utilities
  createLogger,
  createHttpLogger,
  createErrorLogger,
  
  // CI/CD
  SecurityCIChecks
}; 