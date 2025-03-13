/**
 * RealStack Encryption Service
 * 
 * Provides data encryption and decryption functionality, supporting both symmetric and asymmetric encryption.
 * This service is used to protect sensitive data such as user credentials, configuration information, and private keys.
 */

const crypto = require('crypto');

class EncryptionService {
  /**
   * Creates an encryption service instance
   * @param {Object} options - Encryption service configuration options
   * @param {string} options.defaultAlgorithm - Default symmetric encryption algorithm (default: 'aes-256-gcm')
   * @param {number} options.keyLength - Key length (default: 32 bytes)
   * @param {number} options.ivLength - Initialization vector length (default: 16 bytes)
   * @param {number} options.saltLength - Salt length (default: 64 bytes)
   * @param {number} options.iterations - PBKDF2 iteration count (default: 100000)
   * @param {string} options.digest - Hash digest algorithm (default: 'sha512')
   */
  constructor(options = {}) {
    this.options = {
      defaultAlgorithm: options.defaultAlgorithm || 'aes-256-gcm',
      keyLength: options.keyLength || 32,
      ivLength: options.ivLength || 16,
      saltLength: options.saltLength || 64,
      iterations: options.iterations || 100000,
      digest: options.digest || 'sha512'
    };
  }

  /**
   * Generates random bytes
   * @param {number} length - Number of bytes to generate
   * @returns {Buffer} Random bytes buffer
   */
  generateRandomBytes(length) {
    try {
      return crypto.randomBytes(length);
    } catch (error) {
      throw new Error(`Failed to generate random bytes: ${error.message}`);
    }
  }

  /**
   * Derives a key from a password
   * @param {string} password - Password to derive key from
   * @param {Buffer} salt - Salt value
   * @returns {Buffer} Derived key
   */
  deriveKeyFromPassword(password, salt) {
    try {
      return crypto.pbkdf2Sync(
        password,
        salt,
        this.options.iterations,
        this.options.keyLength,
        this.options.digest
      );
    } catch (error) {
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }

  /**
   * Encrypts data using a symmetric algorithm
   * @param {string|Buffer} data - Data to encrypt
   * @param {string} key - Encryption key
   * @param {Object} options - Encryption options
   * @param {string} options.algorithm - Encryption algorithm (default: this.options.defaultAlgorithm)
   * @returns {Object} Object containing encrypted data and metadata
   */
  encrypt(data, key, options = {}) {
    try {
      const algorithm = options.algorithm || this.options.defaultAlgorithm;
      const iv = this.generateRandomBytes(this.options.ivLength);
      const salt = this.generateRandomBytes(this.options.saltLength);
      
      // Derive key from password
      const derivedKey = this.deriveKeyFromPassword(key, salt);
      
      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, derivedKey, iv);
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag (only for GCM mode)
      const authTag = algorithm.includes('gcm') ? cipher.getAuthTag() : null;
      
      return {
        encrypted,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        authTag: authTag ? authTag.toString('base64') : null,
        algorithm
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts data using a symmetric algorithm
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} encryptedData.encrypted - Encrypted data
   * @param {string} encryptedData.iv - Initialization vector (Base64 encoded)
   * @param {string} encryptedData.salt - Salt (Base64 encoded)
   * @param {string} encryptedData.authTag - Authentication tag (Base64 encoded, only for GCM mode)
   * @param {string} encryptedData.algorithm - Encryption algorithm used
   * @param {string} key - Decryption key
   * @returns {string} Decrypted data
   */
  decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, salt, authTag, algorithm } = encryptedData;
      
      // Derive key from password
      const derivedKey = this.deriveKeyFromPassword(
        key,
        Buffer.from(salt, 'base64')
      );
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        algorithm,
        derivedKey,
        Buffer.from(iv, 'base64')
      );
      
      // Set authentication tag (only for GCM mode)
      if (authTag && algorithm.includes('gcm')) {
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));
      }
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Creates an HMAC
   * @param {string|Buffer} data - Data to create HMAC for
   * @param {string} key - HMAC key
   * @param {string} algorithm - Hash algorithm (default: 'sha256')
   * @returns {string} HMAC digest (hex)
   */
  createHMAC(data, key, algorithm = 'sha256') {
    try {
      const hmac = crypto.createHmac(algorithm, key);
      hmac.update(data);
      return hmac.digest('hex');
    } catch (error) {
      throw new Error(`Failed to create HMAC: ${error.message}`);
    }
  }

  /**
   * Encrypts a configuration object
   * @param {Object} config - Configuration object to encrypt
   * @param {string} password - Encryption password
   * @returns {Object} Encrypted configuration object
   */
  encryptConfig(config, password) {
    try {
      const configStr = JSON.stringify(config);
      const encrypted = this.encrypt(configStr, password);
      
      return {
        ...encrypted,
        type: 'encrypted-config',
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Configuration encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts a configuration object
   * @param {Object} encryptedConfig - Encrypted configuration object
   * @param {string} password - Decryption password
   * @returns {Object} Decrypted configuration object
   */
  decryptConfig(encryptedConfig, password) {
    try {
      if (encryptedConfig.type !== 'encrypted-config') {
        throw new Error('Invalid encrypted configuration object');
      }
      
      const decrypted = this.decrypt(encryptedConfig, password);
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Configuration decryption failed: ${error.message}`);
    }
  }

  /**
   * Generates a key pair
   * @param {string} type - Key type ('rsa', 'ec', 'ed25519')
   * @param {Object} options - Key generation options
   * @returns {Object} Object containing public and private keys
   */
  generateKeyPair(type = 'rsa', options = {}) {
    try {
      const defaultOptions = {
        rsa: { modulusLength: 4096 },
        ec: { namedCurve: 'secp256k1' },
        ed25519: {}
      };
      
      const keyPair = crypto.generateKeyPairSync(type, {
        ...defaultOptions[type],
        ...options
      });
      
      return {
        publicKey: keyPair.publicKey.export({ type: 'spki', format: 'pem' }),
        privateKey: keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' })
      };
    } catch (error) {
      throw new Error(`Key pair generation failed: ${error.message}`);
    }
  }

  /**
   * Encrypts data using a public key
   * @param {string|Buffer} data - Data to encrypt
   * @param {string} publicKey - Public key in PEM format
   * @returns {string} Base64 encoded encrypted data
   */
  publicEncrypt(data, publicKey) {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        buffer
      );
      
      return encrypted.toString('base64');
    } catch (error) {
      throw new Error(`Public key encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts data using a private key
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} privateKey - Private key in PEM format
   * @returns {string} Decrypted data
   */
  privateDecrypt(encryptedData, privateKey) {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        buffer
      );
      
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(`Private key decryption failed: ${error.message}`);
    }
  }
}

module.exports = EncryptionService; 