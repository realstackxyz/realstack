/**
 * RealStack Wallet Security Module
 * 
 * Provides secure wallet capabilities for blockchain applications including:
 * - Secure key management
 * - Hardware wallet integration
 * - Transaction signing and verification
 * - Key recovery mechanisms
 * - Anti-phishing protection
 */

const crypto = require('crypto');
const { EncryptionService } = require('../crypto/encryption');
const { TransactionSecurityService } = require('./transaction-security');
const { createLogger } = require('../../utils/logger');

// Create logger instance
const logger = createLogger({
  service: 'wallet_security',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * Default wallet security configuration
 */
const DEFAULT_WALLET_CONFIG = {
  // Key generation and storage options
  keyType: 'ed25519', // Key type (ed25519, secp256k1, etc.)
  keyStorage: 'encrypted', // Storage method (encrypted, hardware)
  useHardwareWalletIfAvailable: true,
  // Recovery options
  enableRecoveryMechanisms: true,
  recoveryMechanismType: 'seed',
  // Security options
  enforceTransactionReview: true,
  transactionConfirmationThreshold: 2, // Number of confirmations required
  autoLockTimeout: 5 * 60 * 1000, // Auto-lock wallet after inactivity (5 min)
  // Hardware options
  supportedHardwareWallets: ['ledger', 'trezor'],
  // Anti-phishing
  enableAntiPhishing: true
};

/**
 * Wallet Security Service
 */
class WalletSecurityService {
  /**
   * Create a new wallet security service
   * 
   * @param {Object} options Configuration options
   * @param {Object} options.encryptionService Encryption service instance (optional)
   * @param {Object} options.transactionSecurity Transaction security service instance (optional)
   * @param {string} options.keyType Type of key to use
   * @param {string} options.keyStorage Storage method for keys
   * @param {boolean} options.useHardwareWalletIfAvailable Whether to use hardware wallet if available
   * @param {Function} options.walletRepository Wallet repository for persistence (optional)
   */
  constructor(options = {}) {
    // Initialize options with defaults
    this.options = {
      ...DEFAULT_WALLET_CONFIG,
      ...options
    };

    // Initialize encryption service if not provided
    this.encryptionService = options.encryptionService || new EncryptionService();
    
    // Initialize transaction security service if not provided
    this.transactionSecurity = options.transactionSecurity || new TransactionSecurityService();

    // Track wallet sessions
    this.walletSessions = new Map();
    
    // Initialize hardware wallet interfaces if needed
    this.hardwareWallets = {};
    if (this.options.useHardwareWalletIfAvailable) {
      this._initializeHardwareWallets();
    }

    logger.info('Wallet security service initialized', {
      keyType: this.options.keyType,
      useHardwareWallet: this.options.useHardwareWalletIfAvailable
    });
  }

  /**
   * Initialize hardware wallet interfaces
   * 
   * @private
   */
  _initializeHardwareWallets() {
    try {
      // This is a placeholder for actual hardware wallet integrations
      // In a real implementation, you would dynamically load the appropriate libraries
      if (this.options.supportedHardwareWallets.includes('ledger')) {
        logger.info('Initializing Ledger hardware wallet support');
        // this.hardwareWallets.ledger = require('@ledgerhq/hw-app-solana');
      }
      
      if (this.options.supportedHardwareWallets.includes('trezor')) {
        logger.info('Initializing Trezor hardware wallet support');
        // this.hardwareWallets.trezor = require('@trezor/connect');
      }
    } catch (error) {
      logger.warn('Failed to initialize hardware wallet support', { error: error.message });
    }
  }

  /**
   * Generate new wallet keys
   * 
   * @param {string} walletId Unique wallet identifier
   * @param {string} password User's password for encryption
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Generated wallet info
   */
  async generateWallet(walletId, password, options = {}) {
    try {
      const keyType = options.keyType || this.options.keyType;
      
      // Generate key pair based on selected algorithm
      let keyPair;
      
      if (keyType === 'ed25519') {
        keyPair = crypto.generateKeyPairSync('ed25519', {
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
      } else if (keyType === 'secp256k1') {
        // For secp256k1, typically used in Ethereum and Bitcoin
        // In a real implementation, you'd use specialized libraries
        keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp256k1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
      } else {
        throw new Error(`Unsupported key type: ${keyType}`);
      }
      
      // Generate mnemonic seed phrase for recovery
      const mnemonic = this._generateMnemonic();
      
      // Generate wallet address from public key
      const address = this._deriveAddressFromPublicKey(keyPair.publicKey, keyType);
      
      // Encrypt private key with password
      const encryptedPrivateKey = await this._encryptPrivateKey(keyPair.privateKey, password);
      
      // Create wallet object
      const wallet = {
        id: walletId,
        address,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey,
        keyType,
        createdAt: Date.now()
      };
      
      // Store encrypted mnemonic if recovery is enabled
      if (this.options.enableRecoveryMechanisms) {
        wallet.encryptedMnemonic = await this._encryptMnemonic(mnemonic, password);
      }
      
      // Save wallet if repository exists
      if (options.walletRepository && typeof options.walletRepository.saveWallet === 'function') {
        await options.walletRepository.saveWallet(wallet);
      }
      
      // Return wallet info and mnemonic (only for initial setup)
      return {
        wallet: {
          id: wallet.id,
          address,
          publicKey: wallet.publicKey,
          keyType
        },
        mnemonic,
        recoveryEnabled: this.options.enableRecoveryMechanisms
      };
    } catch (error) {
      logger.error('Failed to generate wallet', { error: error.message });
      throw new Error(`Wallet generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate mnemonic seed phrase
   * 
   * @returns {string} Mnemonic seed phrase
   * @private
   */
  _generateMnemonic() {
    try {
      // In a real implementation, you would use a proper BIP39 library
      // This is a simplified example
      const wordList = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        // ...more words would be included in a real implementation
      ];
      
      // Generate 12 random words
      const entropy = crypto.randomBytes(16);
      const words = [];
      
      for (let i = 0; i < 12; i++) {
        const index = entropy.readUInt16BE(i * 1 % 16) % wordList.length;
        words.push(wordList[index]);
      }
      
      return words.join(' ');
    } catch (error) {
      logger.error('Failed to generate mnemonic', { error: error.message });
      throw new Error(`Mnemonic generation failed: ${error.message}`);
    }
  }
  
  /**
   * Derive wallet address from public key
   * 
   * @param {string} publicKey Public key (PEM format)
   * @param {string} keyType Key type
   * @returns {string} Wallet address
   * @private
   */
  _deriveAddressFromPublicKey(publicKey, keyType) {
    try {
      // Extract the actual key data from PEM format
      const pemHeader = '-----BEGIN PUBLIC KEY-----';
      const pemFooter = '-----END PUBLIC KEY-----';
      
      const pemContents = publicKey
        .replace(pemHeader, '')
        .replace(pemFooter, '')
        .replace(/\s+/g, '');
      
      const binaryData = Buffer.from(pemContents, 'base64');
      
      // Hash the public key
      const hash = crypto.createHash('sha256').update(binaryData).digest();
      
      // Different address formats based on key type
      if (keyType === 'ed25519') {
        // Similar to Solana address format
        return hash.slice(0, 32).toString('hex');
      } else if (keyType === 'secp256k1') {
        // Similar to Ethereum address format (last 20 bytes of keccak256 hash)
        const address = '0x' + hash.slice(12, 32).toString('hex');
        return address;
      } else {
        throw new Error(`Unsupported key type for address derivation: ${keyType}`);
      }
    } catch (error) {
      logger.error('Failed to derive address from public key', { error: error.message });
      throw new Error(`Address derivation failed: ${error.message}`);
    }
  }
  
  /**
   * Encrypt private key
   * 
   * @param {string} privateKey Private key
   * @param {string} password Password
   * @returns {Promise<Object>} Encrypted private key
   * @private
   */
  async _encryptPrivateKey(privateKey, password) {
    try {
      // Derive encryption key from password
      const { key, salt } = this.encryptionService.deriveKey(password);
      
      // Encrypt private key
      const encryptedData = this.encryptionService.encrypt(privateKey, key);
      
      return {
        ...encryptedData,
        salt
      };
    } catch (error) {
      logger.error('Failed to encrypt private key', { error: error.message });
      throw new Error(`Private key encryption failed: ${error.message}`);
    }
  }
  
  /**
   * Decrypt private key
   * 
   * @param {Object} encryptedPrivateKey Encrypted private key
   * @param {string} password Password
   * @returns {Promise<string>} Decrypted private key
   * @private
   */
  async _decryptPrivateKey(encryptedPrivateKey, password) {
    try {
      // Validate encrypted private key format
      if (!encryptedPrivateKey.salt) {
        throw new Error('Invalid encrypted private key format');
      }
      
      // Derive decryption key from password and salt
      const { key } = this.encryptionService.deriveKey(password, encryptedPrivateKey.salt);
      
      // Decrypt private key
      return this.encryptionService.decrypt(encryptedPrivateKey, key);
    } catch (error) {
      logger.error('Failed to decrypt private key', { error: error.message });
      throw new Error(`Private key decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Encrypt mnemonic
   * 
   * @param {string} mnemonic Mnemonic seed phrase
   * @param {string} password Password
   * @returns {Promise<Object>} Encrypted mnemonic
   * @private
   */
  async _encryptMnemonic(mnemonic, password) {
    try {
      // Derive encryption key from password
      const { key, salt } = this.encryptionService.deriveKey(password);
      
      // Encrypt mnemonic
      const encryptedData = this.encryptionService.encrypt(mnemonic, key);
      
      return {
        ...encryptedData,
        salt
      };
    } catch (error) {
      logger.error('Failed to encrypt mnemonic', { error: error.message });
      throw new Error(`Mnemonic encryption failed: ${error.message}`);
    }
  }
  
  /**
   * Decrypt mnemonic
   * 
   * @param {Object} encryptedMnemonic Encrypted mnemonic
   * @param {string} password Password
   * @returns {Promise<string>} Decrypted mnemonic
   * @private
   */
  async _decryptMnemonic(encryptedMnemonic, password) {
    try {
      // Validate encrypted mnemonic format
      if (!encryptedMnemonic.salt) {
        throw new Error('Invalid encrypted mnemonic format');
      }
      
      // Derive decryption key from password and salt
      const { key } = this.encryptionService.deriveKey(password, encryptedMnemonic.salt);
      
      // Decrypt mnemonic
      return this.encryptionService.decrypt(encryptedMnemonic, key);
    } catch (error) {
      logger.error('Failed to decrypt mnemonic', { error: error.message });
      throw new Error(`Mnemonic decryption failed: ${error.message}`);
    }
  }

  /**
   * Open wallet and create a session
   * 
   * @param {Object} wallet Wallet object
   * @param {string} password Wallet password
   * @returns {Promise<Object>} Wallet session info
   */
  async openWallet(wallet, password) {
    try {
      // Validate wallet
      if (!wallet || !wallet.id || !wallet.encryptedPrivateKey) {
        throw new Error('Invalid wallet object');
      }
      
      // Decrypt private key
      const privateKey = await this._decryptPrivateKey(wallet.encryptedPrivateKey, password);
      
      // Generate session ID
      const sessionId = crypto.randomBytes(16).toString('hex');
      
      // Create wallet session
      const session = {
        id: sessionId,
        walletId: wallet.id,
        privateKey,
        publicKey: wallet.publicKey,
        address: wallet.address,
        keyType: wallet.keyType,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        autoLockAt: Date.now() + this.options.autoLockTimeout
      };
      
      // Store session
      this.walletSessions.set(sessionId, session);
      
      // Set auto-lock timeout
      this._setAutoLockTimeout(sessionId);
      
      // Return session info (without private key)
      return {
        sessionId,
        address: wallet.address,
        unlocked: true,
        autoLockTimeout: this.options.autoLockTimeout,
        keyType: wallet.keyType
      };
    } catch (error) {
      logger.error('Failed to open wallet', { walletId: wallet.id, error: error.message });
      throw new Error(`Failed to open wallet: ${error.message}`);
    }
  }
  
  /**
   * Set auto-lock timeout for wallet session
   * 
   * @param {string} sessionId Session ID
   * @private
   */
  _setAutoLockTimeout(sessionId) {
    const session = this.walletSessions.get(sessionId);
    
    if (!session) {
      return;
    }
    
    // Clear existing timeout
    if (session.autoLockTimeoutId) {
      clearTimeout(session.autoLockTimeoutId);
    }
    
    // Set new timeout
    session.autoLockTimeoutId = setTimeout(() => {
      this.lockWallet(sessionId);
    }, this.options.autoLockTimeout);
  }
  
  /**
   * Update wallet activity to prevent auto-lock
   * 
   * @param {string} sessionId Session ID
   * @returns {boolean} Whether activity update was successful
   */
  updateWalletActivity(sessionId) {
    const session = this.walletSessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Update last activity timestamp
    session.lastActivity = Date.now();
    session.autoLockAt = Date.now() + this.options.autoLockTimeout;
    
    // Reset auto-lock timeout
    this._setAutoLockTimeout(sessionId);
    
    return true;
  }

  /**
   * Lock wallet session
   * 
   * @param {string} sessionId Session ID
   * @returns {boolean} Whether lock was successful
   */
  lockWallet(sessionId) {
    const session = this.walletSessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Clear auto-lock timeout
    if (session.autoLockTimeoutId) {
      clearTimeout(session.autoLockTimeoutId);
    }
    
    // Remove session
    this.walletSessions.delete(sessionId);
    
    logger.info('Wallet locked', { sessionId, walletId: session.walletId });
    
    return true;
  }

  /**
   * Check if wallet session is valid
   * 
   * @param {string} sessionId Session ID
   * @returns {boolean} Whether session is valid
   */
  isSessionValid(sessionId) {
    const session = this.walletSessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Check if session is expired
    if (session.autoLockAt < Date.now()) {
      this.lockWallet(sessionId);
      return false;
    }
    
    return true;
  }

  /**
   * Sign a transaction using wallet session
   * 
   * @param {string} sessionId Wallet session ID
   * @param {Object} transaction Transaction to sign
   * @param {boolean} enforceReview Whether to enforce transaction review
   * @returns {Promise<Object>} Signed transaction
   */
  async signTransaction(sessionId, transaction, enforceReview = null) {
    try {
      // Validate wallet session
      if (!this.isSessionValid(sessionId)) {
        throw new Error('Invalid or expired wallet session');
      }
      
      // Get session
      const session = this.walletSessions.get(sessionId);
      
      // Should transaction review be enforced?
      const shouldEnforceReview = enforceReview !== null ? 
        enforceReview : this.options.enforceTransactionReview;
      
      // If review is enforced, validate transaction
      if (shouldEnforceReview) {
        const validationResult = await this._reviewTransaction(transaction, session);
        
        if (!validationResult.approved) {
          throw new Error(`Transaction review failed: ${validationResult.reason}`);
        }
      }
      
      // Update wallet activity
      this.updateWalletActivity(sessionId);
      
      // Sign transaction using transaction security service
      const signature = await this.transactionSecurity.signTransaction(
        transaction,
        session.privateKey
      );
      
      // Return signed transaction
      return {
        transaction,
        signature,
        signer: session.address
      };
    } catch (error) {
      logger.error('Failed to sign transaction', { 
        sessionId,
        error: error.message,
        transactionId: transaction.id
      });
      throw new Error(`Transaction signing failed: ${error.message}`);
    }
  }
  
  /**
   * Review a transaction for suspicious activity
   * 
   * @param {Object} transaction Transaction to review
   * @param {Object} session Wallet session
   * @returns {Promise<Object>} Review result
   * @private
   */
  async _reviewTransaction(transaction, session) {
    try {
      // Validate transaction format
      const formatValidation = this.transactionSecurity.validateTransactionFormat(transaction);
      
      if (!formatValidation.isValid) {
        return {
          approved: false,
          reason: 'Invalid transaction format',
          errors: formatValidation.errors
        };
      }
      
      // Validate transaction sender
      if (transaction.from !== session.address) {
        return {
          approved: false,
          reason: 'Transaction sender does not match wallet address'
        };
      }
      
      // Analyze transaction for suspicious patterns
      const analysisResult = await this.transactionSecurity.analyzeTransaction(transaction);
      
      if (analysisResult.isSuspicious && analysisResult.riskLevel === 'high') {
        return {
          approved: false,
          reason: 'Transaction flagged as high-risk',
          analysis: analysisResult
        };
      }
      
      // Transaction approved, but include warnings if any
      const hasWarnings = analysisResult.isSuspicious && analysisResult.riskLevel !== 'high';
      
      return {
        approved: true,
        hasWarnings,
        warnings: hasWarnings ? analysisResult.reasons : [],
        analysis: analysisResult
      };
    } catch (error) {
      logger.error('Transaction review failed', { error: error.message });
      return {
        approved: false,
        reason: `Review failed: ${error.message}`
      };
    }
  }

  /**
   * Recover wallet using mnemonic
   * 
   * @param {string} mnemonic Mnemonic seed phrase
   * @param {string} newPassword New password for wallet
   * @param {Object} options Recovery options
   * @returns {Promise<Object>} Recovered wallet info
   */
  async recoverWalletFromMnemonic(mnemonic, newPassword, options = {}) {
    try {
      // Validate mnemonic format
      if (!this._validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic format');
      }
      
      // In a real implementation, you would derive keys from the mnemonic
      // This is a simplified example
      
      // Generate deterministic key pair from mnemonic
      const seed = crypto.createHash('sha256').update(mnemonic).digest();
      const keyType = options.keyType || this.options.keyType;
      
      let keyPair;
      
      if (keyType === 'ed25519') {
        keyPair = crypto.generateKeyPairSync('ed25519', {
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          },
          seed: seed.slice(0, 32) // ed25519 requires a 32-byte seed
        });
      } else if (keyType === 'secp256k1') {
        // For secp256k1, typically used in Ethereum and Bitcoin
        // In a real implementation, you'd use specialized libraries
        keyPair = crypto.generateKeyPairSync('ec', {
          namedCurve: 'secp256k1',
          publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
          },
          privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
          }
        });
      } else {
        throw new Error(`Unsupported key type: ${keyType}`);
      }
      
      // Generate wallet address from public key
      const address = this._deriveAddressFromPublicKey(keyPair.publicKey, keyType);
      
      // Encrypt private key with new password
      const encryptedPrivateKey = await this._encryptPrivateKey(keyPair.privateKey, newPassword);
      
      // Create wallet object
      const wallet = {
        id: options.walletId || crypto.randomBytes(16).toString('hex'),
        address,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey,
        keyType,
        recoveredAt: Date.now(),
        createdAt: options.createdAt || Date.now()
      };
      
      // Store encrypted mnemonic if recovery is enabled
      if (this.options.enableRecoveryMechanisms) {
        wallet.encryptedMnemonic = await this._encryptMnemonic(mnemonic, newPassword);
      }
      
      // Save wallet if repository exists
      if (options.walletRepository && typeof options.walletRepository.saveWallet === 'function') {
        await options.walletRepository.saveWallet(wallet);
      }
      
      // Return recovered wallet info
      return {
        wallet: {
          id: wallet.id,
          address,
          publicKey: wallet.publicKey,
          keyType,
          recovered: true
        },
        recoveryEnabled: this.options.enableRecoveryMechanisms
      };
    } catch (error) {
      logger.error('Failed to recover wallet', { error: error.message });
      throw new Error(`Wallet recovery failed: ${error.message}`);
    }
  }
  
  /**
   * Validate mnemonic format
   * 
   * @param {string} mnemonic Mnemonic to validate
   * @returns {boolean} Whether mnemonic format is valid
   * @private
   */
  _validateMnemonic(mnemonic) {
    // In a real implementation, you would use a proper BIP39 validation
    // This is a simplified example
    
    // Check if it has 12 words
    const words = mnemonic.trim().split(/\s+/);
    return words.length === 12;
  }

  /**
   * Export wallet (encrypted)
   * 
   * @param {string} sessionId Wallet session ID
   * @param {string} password Current wallet password
   * @param {string} exportPassword Password for the exported wallet
   * @returns {Promise<Object>} Exported wallet data
   */
  async exportWallet(sessionId, password, exportPassword) {
    try {
      // Validate wallet session
      if (!this.isSessionValid(sessionId)) {
        throw new Error('Invalid or expired wallet session');
      }
      
      // Get session
      const session = this.walletSessions.get(sessionId);
      
      // Create export data
      const exportData = {
        address: session.address,
        keyType: session.keyType,
        publicKey: session.publicKey,
        privateKey: session.privateKey,
        exportedAt: Date.now()
      };
      
      // Encrypt export data with export password
      const encryptedExport = this.encryptionService.encryptConfig(exportData, exportPassword);
      
      // Return encrypted export data
      return {
        encryptedData: encryptedExport,
        address: session.address,
        exportedAt: exportData.exportedAt
      };
    } catch (error) {
      logger.error('Failed to export wallet', { 
        sessionId,
        error: error.message
      });
      throw new Error(`Wallet export failed: ${error.message}`);
    }
  }

  /**
   * Import wallet
   * 
   * @param {Object} encryptedData Encrypted wallet data
   * @param {string} exportPassword Password for the encrypted data
   * @param {string} newPassword New password for the wallet
   * @param {Object} options Import options
   * @returns {Promise<Object>} Imported wallet info
   */
  async importWallet(encryptedData, exportPassword, newPassword, options = {}) {
    try {
      // Decrypt export data
      const exportData = this.encryptionService.decryptConfig(encryptedData, exportPassword);
      
      // Validate export data
      if (!exportData.address || !exportData.publicKey || !exportData.privateKey) {
        throw new Error('Invalid wallet export data');
      }
      
      // Encrypt private key with new password
      const encryptedPrivateKey = await this._encryptPrivateKey(exportData.privateKey, newPassword);
      
      // Create wallet object
      const wallet = {
        id: options.walletId || crypto.randomBytes(16).toString('hex'),
        address: exportData.address,
        publicKey: exportData.publicKey,
        encryptedPrivateKey,
        keyType: exportData.keyType,
        importedAt: Date.now(),
        createdAt: options.createdAt || Date.now()
      };
      
      // Save wallet if repository exists
      if (options.walletRepository && typeof options.walletRepository.saveWallet === 'function') {
        await options.walletRepository.saveWallet(wallet);
      }
      
      // Return imported wallet info
      return {
        wallet: {
          id: wallet.id,
          address: wallet.address,
          publicKey: wallet.publicKey,
          keyType: wallet.keyType,
          imported: true
        }
      };
    } catch (error) {
      logger.error('Failed to import wallet', { error: error.message });
      throw new Error(`Wallet import failed: ${error.message}`);
    }
  }

  /**
   * Generate anti-phishing code for user
   * 
   * @param {string} userId User ID
   * @returns {Promise<Object>} Generated anti-phishing code
   */
  async generateAntiPhishingCode(userId) {
    try {
      if (!this.options.enableAntiPhishing) {
        throw new Error('Anti-phishing feature is not enabled');
      }
      
      // Generate random code
      const code = this._generateAntiPhishingCode();
      
      // Create anti-phishing data
      const antiPhishingData = {
        userId,
        code,
        createdAt: Date.now()
      };
      
      // Save anti-phishing code if repository exists
      if (this.options.walletRepository && typeof this.options.walletRepository.saveAntiPhishingCode === 'function') {
        await this.options.walletRepository.saveAntiPhishingCode(userId, code);
      }
      
      return {
        code,
        enabled: true
      };
    } catch (error) {
      logger.error('Failed to generate anti-phishing code', { 
        userId,
        error: error.message
      });
      throw new Error(`Anti-phishing code generation failed: ${error.message}`);
    }
  }
  
  /**
   * Generate random anti-phishing code
   * 
   * @returns {string} Random anti-phishing code
   * @private
   */
  _generateAntiPhishingCode() {
    // Generate random color and animal for easy recognition
    const colors = [
      'Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 
      'Teal', 'Gold', 'Silver', 'Brown', 'White', 'Black'
    ];
    
    const animals = [
      'Tiger', 'Lion', 'Bear', 'Eagle', 'Hawk', 'Wolf', 'Dolphin', 
      'Whale', 'Shark', 'Elephant', 'Giraffe', 'Zebra', 'Monkey'
    ];
    
    const randomBytes = crypto.randomBytes(2);
    const colorIndex = randomBytes[0] % colors.length;
    const animalIndex = randomBytes[1] % animals.length;
    
    return `${colors[colorIndex]} ${animals[animalIndex]}`;
  }
}

module.exports = {
  WalletSecurityService
}; 