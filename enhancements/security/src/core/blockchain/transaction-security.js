/**
 * RealStack Blockchain Transaction Security Library
 * 
 * Provides security utilities for blockchain transactions including:
 * - Transaction validation
 * - Signature verification
 * - Replay attack prevention
 * - Malicious transaction detection
 * - Transaction rate limiting
 */

const crypto = require('crypto');
const { EncryptionService } = require('../crypto/encryption');
const { createLogger } = require('../../utils/logger');

// Create logger instance
const logger = createLogger({
  service: 'blockchain_security',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// Default nonce cache size (number of addresses to track)
const DEFAULT_NONCE_CACHE_SIZE = 10000;

// Default transaction expiration time (in milliseconds)
const DEFAULT_TX_EXPIRATION_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Blockchain Transaction Security Service
 */
class TransactionSecurityService {
  /**
   * Create a new transaction security service
   * 
   * @param {Object} options Configuration options
   * @param {Object} options.encryptionService Encryption service instance (optional)
   * @param {string} options.network Blockchain network (mainnet, testnet, devnet)
   * @param {number} options.nonceExpirationTime Time in ms after which nonces expire
   * @param {number} options.nonceCacheSize Maximum nonce cache size
   * @param {number} options.maxTransactionAge Maximum transaction age in ms
   * @param {boolean} options.enforceSequentialNonces Enforce sequential nonces
   * @param {Object} options.transactionRateLimits Transaction rate limits by account type
   */
  constructor(options = {}) {
    this.options = {
      network: options.network || process.env.BLOCKCHAIN_NETWORK || 'mainnet',
      nonceExpirationTime: options.nonceExpirationTime || 24 * 60 * 60 * 1000, // 24 hours
      nonceCacheSize: options.nonceCacheSize || DEFAULT_NONCE_CACHE_SIZE,
      maxTransactionAge: options.maxTransactionAge || DEFAULT_TX_EXPIRATION_TIME,
      enforceSequentialNonces: options.enforceSequentialNonces ?? true,
      transactionRateLimits: options.transactionRateLimits || {
        default: { maxTxPerMinute: 10, maxValuePerDay: 1000 },
        premium: { maxTxPerMinute: 30, maxValuePerDay: 10000 },
        enterprise: { maxTxPerMinute: 100, maxValuePerDay: 100000 }
      },
      ...options
    };

    // Initialize encryption service if not provided
    this.encryptionService = options.encryptionService || new EncryptionService();

    // Initialize nonce tracking for replay protection
    this.nonceTracker = new Map();
    this.lastCleanupTime = Date.now();

    // Initialize transaction rate limiting
    this.txRateLimiter = new Map();
    this.txValueTracker = new Map();

    // Known malicious patterns (simple example)
    this.maliciousPatterns = [
      // Example pattern: draining all funds to a new address
      { pattern: 'drain_all', description: 'Transaction transfers all funds to a new address' },
      // Add more patterns as needed
    ];

    logger.info('Transaction security service initialized', { 
      network: this.options.network, 
      nonceCacheSize: this.options.nonceCacheSize
    });
  }

  /**
   * Generate secure nonce for transaction
   * 
   * @param {string} account Account address
   * @param {Object} metadata Optional metadata to include in nonce generation
   * @returns {Object} Nonce object with value, timestamp and expiration
   */
  generateNonce(account, metadata = {}) {
    // Get current timestamp
    const timestamp = Date.now();
    
    // Create entropy from account, timestamp and random bytes
    const entropy = Buffer.concat([
      Buffer.from(account),
      Buffer.from(timestamp.toString()),
      crypto.randomBytes(16)
    ]);
    
    // Generate nonce value using hash
    const nonceValue = this.encryptionService.createHash(entropy);
    
    // Calculate expiration time
    const expiresAt = timestamp + this.options.nonceExpirationTime;
    
    // Create nonce object
    const nonce = {
      value: nonceValue,
      timestamp,
      expiresAt,
      metadata
    };
    
    // Store nonce for verification
    this._storeNonce(account, nonce);
    
    logger.debug('Generated transaction nonce', { account, nonceValue, expiresAt });
    
    return nonce;
  }

  /**
   * Store nonce for later verification
   * 
   * @param {string} account Account address
   * @param {Object} nonce Nonce object
   * @private
   */
  _storeNonce(account, nonce) {
    // Get existing nonces for account or create new array
    if (!this.nonceTracker.has(account)) {
      this.nonceTracker.set(account, []);
    }
    
    const accountNonces = this.nonceTracker.get(account);
    
    // Add new nonce
    accountNonces.push(nonce);
    
    // Perform cleanup if needed
    if (Date.now() - this.lastCleanupTime > 60000) { // Clean up every minute
      this._cleanupExpiredNonces();
    }
  }

  /**
   * Clean up expired nonces
   * 
   * @private
   */
  _cleanupExpiredNonces() {
    const now = Date.now();
    let removedCount = 0;
    
    // Iterate through all accounts
    for (const [account, nonces] of this.nonceTracker.entries()) {
      // Filter out expired nonces
      const validNonces = nonces.filter(nonce => nonce.expiresAt > now);
      removedCount += nonces.length - validNonces.length;
      
      if (validNonces.length === 0) {
        // Remove account if no valid nonces
        this.nonceTracker.delete(account);
      } else {
        // Update with valid nonces only
        this.nonceTracker.set(account, validNonces);
      }
    }
    
    // Check if we need to reduce cache size
    if (this.nonceTracker.size > this.options.nonceCacheSize) {
      this._reduceNonceCacheSize();
    }
    
    this.lastCleanupTime = now;
    logger.debug('Cleaned up expired nonces', { removedCount, remainingAccounts: this.nonceTracker.size });
  }

  /**
   * Reduce nonce cache size by removing oldest entries
   * 
   * @private
   */
  _reduceNonceCacheSize() {
    // Convert map to array for sorting
    const entries = Array.from(this.nonceTracker.entries());
    
    // Sort by oldest nonce timestamp
    entries.sort((a, b) => {
      const oldestA = Math.min(...a[1].map(n => n.timestamp));
      const oldestB = Math.min(...b[1].map(n => n.timestamp));
      return oldestA - oldestB;
    });
    
    // Calculate how many to remove
    const removeCount = Math.ceil(this.nonceTracker.size - (this.options.nonceCacheSize * 0.8));
    
    // Remove oldest entries
    for (let i = 0; i < removeCount; i++) {
      if (i < entries.length) {
        this.nonceTracker.delete(entries[i][0]);
      }
    }
    
    logger.info('Reduced nonce cache size', { removedEntries: removeCount, newSize: this.nonceTracker.size });
  }

  /**
   * Verify transaction nonce
   * 
   * @param {string} account Account address
   * @param {string} nonceValue Nonce value to verify
   * @returns {boolean} Whether nonce is valid
   */
  verifyNonce(account, nonceValue) {
    // Get account nonces
    const accountNonces = this.nonceTracker.get(account);
    
    // If no nonces for account, invalid
    if (!accountNonces) {
      logger.warn('Nonce verification failed: no nonces for account', { account, nonceValue });
      return false;
    }
    
    // Find nonce with matching value
    const nonceIndex = accountNonces.findIndex(n => n.value === nonceValue);
    
    // If nonce not found, invalid
    if (nonceIndex === -1) {
      logger.warn('Nonce verification failed: nonce not found', { account, nonceValue });
      return false;
    }
    
    const nonce = accountNonces[nonceIndex];
    
    // Check if nonce is expired
    if (nonce.expiresAt < Date.now()) {
      logger.warn('Nonce verification failed: nonce expired', { 
        account, 
        nonceValue, 
        expiredAt: new Date(nonce.expiresAt).toISOString() 
      });
      
      // Remove expired nonce
      accountNonces.splice(nonceIndex, 1);
      return false;
    }
    
    // Remove used nonce (prevent replay)
    accountNonces.splice(nonceIndex, 1);
    
    logger.debug('Nonce verified successfully', { account, nonceValue });
    return true;
  }

  /**
   * Check if transaction is within rate limits
   * 
   * @param {string} account Account address
   * @param {string} accountType Account type (default, premium, enterprise)
   * @param {number} txValue Transaction value
   * @returns {Object} Rate limit check result
   */
  checkTransactionRateLimit(account, accountType = 'default', txValue = 0) {
    const now = Date.now();
    const minute = Math.floor(now / 60000); // Current minute
    const day = Math.floor(now / 86400000); // Current day
    
    // Get rate limits for account type
    const limits = this.options.transactionRateLimits[accountType] || 
                   this.options.transactionRateLimits.default;
    
    // Check transaction rate
    const txKey = `${account}:${minute}`;
    const txCount = this.txRateLimiter.get(txKey) || 0;
    
    if (txCount >= limits.maxTxPerMinute) {
      logger.warn('Transaction rate limit exceeded', { 
        account, 
        accountType, 
        txCount, 
        limit: limits.maxTxPerMinute 
      });
      
      return {
        allowed: false,
        reason: 'RATE_LIMIT_EXCEEDED',
        currentCount: txCount,
        limit: limits.maxTxPerMinute,
        resetIn: (minute + 1) * 60000 - now // ms until next minute
      };
    }
    
    // Update transaction count
    this.txRateLimiter.set(txKey, txCount + 1);
    
    // Delete old rate limit entries (older than current minute)
    for (const key of this.txRateLimiter.keys()) {
      const [, keyMinute] = key.split(':');
      if (parseInt(keyMinute) < minute) {
        this.txRateLimiter.delete(key);
      }
    }
    
    // Check daily value limit if transaction has value
    if (txValue > 0 && limits.maxValuePerDay > 0) {
      const valueKey = `${account}:${day}`;
      const dailyValue = this.txValueTracker.get(valueKey) || 0;
      
      if (dailyValue + txValue > limits.maxValuePerDay) {
        logger.warn('Transaction daily value limit exceeded', { 
          account, 
          accountType, 
          currentValue: dailyValue, 
          newTxValue: txValue,
          limit: limits.maxValuePerDay 
        });
        
        return {
          allowed: false,
          reason: 'VALUE_LIMIT_EXCEEDED',
          currentValue: dailyValue,
          newTxValue: txValue,
          limit: limits.maxValuePerDay,
          resetIn: (day + 1) * 86400000 - now // ms until next day
        };
      }
      
      // Update daily value
      this.txValueTracker.set(valueKey, dailyValue + txValue);
      
      // Delete old value tracker entries (older than current day)
      for (const key of this.txValueTracker.keys()) {
        const [, keyDay] = key.split(':');
        if (parseInt(keyDay) < day) {
          this.txValueTracker.delete(key);
        }
      }
    }
    
    // All checks passed
    return {
      allowed: true
    };
  }

  /**
   * Verify transaction signature
   * 
   * @param {Object} transaction Transaction object
   * @param {string} publicKey Signer's public key
   * @param {string} signature Transaction signature
   * @returns {boolean} Whether signature is valid
   */
  verifyTransactionSignature(transaction, publicKey, signature) {
    try {
      // Create transaction data hash
      const txData = this._prepareTransactionForSigning(transaction);
      
      // Verify signature
      const isValid = this.encryptionService.verifyWithRSA(txData, signature, publicKey);
      
      if (!isValid) {
        logger.warn('Transaction signature verification failed', { 
          txId: transaction.id,
          from: transaction.from 
        });
      }
      
      return isValid;
    } catch (error) {
      logger.error('Error verifying transaction signature', { 
        error: error.message, 
        txId: transaction.id 
      });
      return false;
    }
  }

  /**
   * Prepare transaction data for signing
   * 
   * @param {Object} transaction Transaction object
   * @returns {string} Transaction data string for signing
   * @private
   */
  _prepareTransactionForSigning(transaction) {
    // Create a stable representation of transaction data
    const txData = {
      id: transaction.id,
      from: transaction.from,
      to: transaction.to,
      value: transaction.value,
      nonce: transaction.nonce,
      timestamp: transaction.timestamp,
      data: transaction.data
    };
    
    // Sort object keys to ensure consistent order
    return JSON.stringify(txData, Object.keys(txData).sort());
  }

  /**
   * Sign a transaction
   * 
   * @param {Object} transaction Transaction object
   * @param {string} privateKey Signer's private key
   * @returns {Promise<string>} Transaction signature
   */
  async signTransaction(transaction, privateKey) {
    try {
      // Create transaction data hash
      const txData = this._prepareTransactionForSigning(transaction);
      
      // Sign data
      const signature = await this.encryptionService.signWithRSA(txData, privateKey);
      
      logger.debug('Transaction signed', { txId: transaction.id });
      
      return signature;
    } catch (error) {
      logger.error('Error signing transaction', { 
        error: error.message, 
        txId: transaction.id 
      });
      throw new Error(`Transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Analyze transaction for suspicious patterns
   * 
   * @param {Object} transaction Transaction object
   * @param {Object} accountInfo Account information
   * @returns {Object} Threat analysis result
   */
  analyzeTransaction(transaction, accountInfo = {}) {
    const results = {
      isSuspicious: false,
      riskScore: 0,
      reasons: []
    };
    
    // Check transaction age
    const txAge = Date.now() - transaction.timestamp;
    if (txAge > this.options.maxTransactionAge) {
      results.isSuspicious = true;
      results.riskScore += 30;
      results.reasons.push({
        type: 'TX_TOO_OLD',
        description: 'Transaction is too old',
        details: { age: txAge, maxAge: this.options.maxTransactionAge }
      });
    }
    
    // Check for sequential nonce if enabled
    if (this.options.enforceSequentialNonces && 
        accountInfo.lastNonce !== undefined &&
        transaction.nonce !== accountInfo.lastNonce + 1) {
      results.isSuspicious = true;
      results.riskScore += 50;
      results.reasons.push({
        type: 'NONCE_NOT_SEQUENTIAL',
        description: 'Transaction nonce is not sequential',
        details: { 
          expectedNonce: accountInfo.lastNonce + 1, 
          actualNonce: transaction.nonce 
        }
      });
    }
    
    // Check for unusual transaction values
    if (accountInfo.averageTxValue && transaction.value > accountInfo.averageTxValue * 5) {
      results.isSuspicious = true;
      results.riskScore += 20;
      results.reasons.push({
        type: 'UNUSUAL_VALUE',
        description: 'Transaction value is unusually high',
        details: { 
          value: transaction.value, 
          averageValue: accountInfo.averageTxValue 
        }
      });
    }
    
    // Check for known malicious patterns
    for (const pattern of this.maliciousPatterns) {
      if (this._matchesMaliciousPattern(transaction, pattern, accountInfo)) {
        results.isSuspicious = true;
        results.riskScore += 70;
        results.reasons.push({
          type: 'MALICIOUS_PATTERN',
          description: `Matched malicious pattern: ${pattern.description}`,
          details: { patternId: pattern.pattern }
        });
      }
    }
    
    // Set final risk level
    if (results.riskScore >= 70) {
      results.riskLevel = 'high';
    } else if (results.riskScore >= 30) {
      results.riskLevel = 'medium';
    } else if (results.riskScore > 0) {
      results.riskLevel = 'low';
    } else {
      results.riskLevel = 'safe';
    }
    
    if (results.isSuspicious) {
      logger.warn('Suspicious transaction detected', { 
        txId: transaction.id,
        from: transaction.from,
        riskScore: results.riskScore,
        riskLevel: results.riskLevel
      });
    }
    
    return results;
  }

  /**
   * Check if transaction matches a malicious pattern
   * 
   * @param {Object} transaction Transaction object
   * @param {Object} pattern Malicious pattern definition
   * @param {Object} accountInfo Account information
   * @returns {boolean} Whether transaction matches pattern
   * @private
   */
  _matchesMaliciousPattern(transaction, pattern, accountInfo) {
    // This is a simplified implementation - in production, you would have
    // more sophisticated pattern matching logic
    
    switch (pattern.pattern) {
      case 'drain_all':
        // Check if transaction is transferring all or almost all funds
        return accountInfo.balance && 
               transaction.value >= accountInfo.balance * 0.95;
      
      // Add more pattern matching logic as needed
      
      default:
        return false;
    }
  }

  /**
   * Validate transaction object format and required fields
   * 
   * @param {Object} transaction Transaction object
   * @returns {Object} Validation result
   */
  validateTransactionFormat(transaction) {
    const requiredFields = ['id', 'from', 'to', 'value', 'nonce', 'timestamp'];
    const errors = [];
    
    // Check required fields
    for (const field of requiredFields) {
      if (transaction[field] === undefined) {
        errors.push({
          field,
          message: `Missing required field: ${field}`
        });
      }
    }
    
    // Validate field types and formats
    if (typeof transaction.id !== 'string' || transaction.id.length < 10) {
      errors.push({
        field: 'id',
        message: 'Invalid transaction ID format'
      });
    }
    
    if (typeof transaction.from !== 'string' || !this._isValidAddress(transaction.from)) {
      errors.push({
        field: 'from',
        message: 'Invalid sender address format'
      });
    }
    
    if (typeof transaction.to !== 'string' || !this._isValidAddress(transaction.to)) {
      errors.push({
        field: 'to',
        message: 'Invalid recipient address format'
      });
    }
    
    if (typeof transaction.value !== 'number' || transaction.value < 0) {
      errors.push({
        field: 'value',
        message: 'Invalid transaction value'
      });
    }
    
    if (typeof transaction.nonce !== 'number' || transaction.nonce < 0) {
      errors.push({
        field: 'nonce',
        message: 'Invalid nonce format'
      });
    }
    
    if (typeof transaction.timestamp !== 'number' || 
        transaction.timestamp <= 0 || 
        transaction.timestamp > Date.now() + 5 * 60 * 1000) { // Allow 5 minutes of clock skew
      errors.push({
        field: 'timestamp',
        message: 'Invalid timestamp'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate blockchain address format
   * 
   * @param {string} address Blockchain address
   * @returns {boolean} Whether address format is valid
   * @private
   */
  _isValidAddress(address) {
    // This is a simplified implementation - in production, you would have
    // blockchain-specific address validation
    
    // Simple regex for a generic blockchain address
    // In real implementation, this would be specific to your blockchain (Solana, Ethereum, etc.)
    const addressRegex = /^(0x)?[0-9a-fA-F]{40,64}$/;
    return addressRegex.test(address);
  }
}

module.exports = {
  TransactionSecurityService
}; 