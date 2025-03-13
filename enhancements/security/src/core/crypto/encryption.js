/**
 * RealStack Data Encryption Service
 * 
 * Provides secure data encryption and decryption capabilities including:
 * - Symmetric encryption (AES)
 * - Asymmetric encryption (RSA)
 * - Field-level encryption
 * - Key management
 * - Data signing and verification
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('../../utils/logger');

// Create logger instance
const logger = createLogger({
  service: 'data_encryption',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * Data Encryption Service
 */
class EncryptionService {
  /**
   * Create a new encryption service
   * 
   * @param {Object} options Configuration options
   * @param {string} options.encryptionKey Symmetric encryption key (if not provided, will use env var or generate a new one)
   * @param {string} options.algorithm Symmetric encryption algorithm
   * @param {number} options.keySize Symmetric encryption key size (bits)
   * @param {string} options.keysDir Asymmetric key storage directory
   * @param {boolean} options.useHardwareSecure Whether to use hardware security module (if available)
   */
  constructor(options = {}) {
    this.options = {
      encryptionKey: options.encryptionKey || process.env.ENCRYPTION_KEY,
      algorithm: options.algorithm || 'aes-256-gcm',
      keySize: options.keySize || 32, // 256 bits
      ivSize: options.ivSize || 16, // 128 bits
      keysDir: options.keysDir || 'keys',
      rsaKeySize: options.rsaKeySize || 2048,
      useHardwareSecure: options.useHardwareSecure || false,
      ...options
    };

    // Ensure a symmetric encryption key is available
    if (!this.options.encryptionKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Encryption key must be provided in production environment');
      } else {
        // Generate a temporary key for development
        this.options.encryptionKey = crypto.randomBytes(this.options.keySize).toString('hex');
        logger.warn('No encryption key provided, generated temporary key (for development only)');
      }
    }

    // Ensure keys directory exists
    this.ensureKeysDir();
  }

  /**
   * Ensure keys directory exists
   */
  async ensureKeysDir() {
    try {
      const keysPath = path.resolve(this.options.keysDir);
      await fs.mkdir(keysPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create keys directory', { error: error.message });
    }
  }

  /**
   * Get normalized encryption key
   * 
   * @param {string} key Encryption key (hex format)
   * @returns {Buffer} Normalized key buffer
   */
  getNormalizedKey(key = null) {
    const hexKey = key || this.options.encryptionKey;
    // If key is a hex string, convert to Buffer
    if (typeof hexKey === 'string') {
      // Ensure key length is correct
      const keyBuffer = Buffer.from(hexKey, 'hex');
      if (keyBuffer.length !== this.options.keySize) {
        // If length doesn't match, use normalization function
        return crypto.scryptSync(hexKey, 'salt', this.options.keySize);
      }
      return keyBuffer;
    }
    // If already a Buffer, return as is
    return hexKey;
  }

  /**
   * Encrypt data using AES-GCM algorithm
   * 
   * @param {string|Buffer|Object} data Data to encrypt
   * @param {string} key Optional encryption key
   * @returns {Object} Encryption result with iv, auth tag and ciphertext
   */
  encrypt(data, key = null) {
    try {
      // Preprocess data
      let dataToEncrypt;
      let dataType = typeof data;
      
      if (Buffer.isBuffer(data)) {
        dataToEncrypt = data;
        dataType = 'buffer';
      } else if (typeof data === 'object') {
        dataToEncrypt = Buffer.from(JSON.stringify(data), 'utf8');
        dataType = 'object';
      } else {
        dataToEncrypt = Buffer.from(String(data), 'utf8');
      }

      // Generate random initialization vector (IV)
      const iv = crypto.randomBytes(this.options.ivSize);
      
      // Get normalized key
      const normalizedKey = this.getNormalizedKey(key);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.options.algorithm, normalizedKey, iv);
      
      // Encrypt data
      const encrypted = Buffer.concat([
        cipher.update(dataToEncrypt),
        cipher.final()
      ]);
      
      // Get authentication tag (GCM mode only)
      const authTag = cipher.getAuthTag ? cipher.getAuthTag() : null;
      
      // Return encryption result
      return {
        iv: iv.toString('hex'),
        authTag: authTag ? authTag.toString('hex') : null,
        encrypted: encrypted.toString('hex'),
        dataType
      };
    } catch (error) {
      logger.error('Data encryption failed', { error: error.message });
      throw new Error(`Data encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-GCM algorithm
   * 
   * @param {Object} encryptedData Encrypted data object
   * @param {string} key Optional decryption key
   * @returns {string|Buffer|Object} Decrypted data
   */
  decrypt(encryptedData, key = null) {
    try {
      // Validate encrypted data format
      if (!encryptedData.iv || !encryptedData.encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Convert hex strings back to Buffers
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const encrypted = Buffer.from(encryptedData.encrypted, 'hex');
      const authTag = encryptedData.authTag ? Buffer.from(encryptedData.authTag, 'hex') : null;
      
      // Get normalized key
      const normalizedKey = this.getNormalizedKey(key);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.options.algorithm, normalizedKey, iv);
      
      // Set auth tag (if provided)
      if (authTag && decipher.setAuthTag) {
        decipher.setAuthTag(authTag);
      }
      
      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      // Return in appropriate format based on original data type
      if (encryptedData.dataType === 'buffer') {
        return decrypted;
      } else if (encryptedData.dataType === 'object') {
        return JSON.parse(decrypted.toString('utf8'));
      } else {
        return decrypted.toString('utf8');
      }
    } catch (error) {
      logger.error('Data decryption failed', { error: error.message });
      throw new Error(`Data decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate RSA key pair
   * 
   * @param {string} keyName Key name
   * @param {number} keySize Key size (bits)
   * @returns {Promise<Object>} Generated key pair info
   */
  async generateRSAKeyPair(keyName, keySize = null) {
    try {
      const rsaKeySize = keySize || this.options.rsaKeySize;
      
      logger.info('Generating RSA key pair', { keyName, keySize: rsaKeySize });
      
      // Generate key pair
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: rsaKeySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // Save keys to files
      const publicKeyPath = path.join(this.options.keysDir, `${keyName}.public.pem`);
      const privateKeyPath = path.join(this.options.keysDir, `${keyName}.private.pem`);
      
      await Promise.all([
        fs.writeFile(publicKeyPath, publicKey, 'utf8'),
        fs.writeFile(privateKeyPath, privateKey, 'utf8')
      ]);
      
      logger.info('RSA key pair generated and saved', { keyName, publicKeyPath, privateKeyPath });
      
      return {
        keyName,
        publicKey,
        privateKey,
        publicKeyPath,
        privateKeyPath
      };
    } catch (error) {
      logger.error('RSA key pair generation failed', { keyName, error: error.message });
      throw new Error(`RSA key pair generation failed: ${error.message}`);
    }
  }

  /**
   * Load RSA key pair
   * 
   * @param {string} keyName Key name
   * @returns {Promise<Object>} Loaded key pair
   */
  async loadRSAKeyPair(keyName) {
    try {
      const publicKeyPath = path.join(this.options.keysDir, `${keyName}.public.pem`);
      const privateKeyPath = path.join(this.options.keysDir, `${keyName}.private.pem`);
      
      // Load key files in parallel
      const [publicKey, privateKey] = await Promise.all([
        fs.readFile(publicKeyPath, 'utf8'),
        fs.readFile(privateKeyPath, 'utf8').catch(() => null) // Private key may not be available
      ]);
      
      return {
        keyName,
        publicKey,
        privateKey,
        publicKeyPath,
        privateKeyPath
      };
    } catch (error) {
      logger.error('Loading RSA key pair failed', { keyName, error: error.message });
      throw new Error(`Loading RSA key pair failed: ${error.message}`);
    }
  }

  /**
   * Encrypt data with RSA public key
   * 
   * @param {string|Buffer} data Data to encrypt
   * @param {string|Object} publicKey Public key or key name
   * @returns {Promise<string>} Encrypted data (Base64 encoded)
   */
  async encryptWithRSA(data, publicKey) {
    try {
      // Preprocess data
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      
      // Get public key
      let publicKeyPem;
      if (typeof publicKey === 'string' && !publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
        // If key name, load key
        const keyPair = await this.loadRSAKeyPair(publicKey);
        publicKeyPem = keyPair.publicKey;
      } else if (typeof publicKey === 'object' && publicKey.publicKey) {
        publicKeyPem = publicKey.publicKey;
      } else {
        publicKeyPem = publicKey;
      }
      
      // Perform encryption
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        dataBuffer
      );
      
      // Return Base64 encoded ciphertext
      return encrypted.toString('base64');
    } catch (error) {
      logger.error('RSA encryption failed', { error: error.message });
      throw new Error(`RSA encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data with RSA private key
   * 
   * @param {string} encryptedData Encrypted data (Base64 encoded)
   * @param {string|Object} privateKey Private key or key name
   * @returns {Promise<string>} Decrypted data
   */
  async decryptWithRSA(encryptedData, privateKey) {
    try {
      // Convert Base64 encoded ciphertext to Buffer
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      
      // Get private key
      let privateKeyPem;
      if (typeof privateKey === 'string' && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // If key name, load key
        const keyPair = await this.loadRSAKeyPair(privateKey);
        if (!keyPair.privateKey) {
          throw new Error(`Private key not available: ${privateKey}`);
        }
        privateKeyPem = keyPair.privateKey;
      } else if (typeof privateKey === 'object' && privateKey.privateKey) {
        privateKeyPem = privateKey.privateKey;
      } else {
        privateKeyPem = privateKey;
      }
      
      // Perform decryption
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        encryptedBuffer
      );
      
      // Return decrypted data
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('RSA decryption failed', { error: error.message });
      throw new Error(`RSA decryption failed: ${error.message}`);
    }
  }

  /**
   * Sign data with RSA private key
   * 
   * @param {string|Buffer} data Data to sign
   * @param {string|Object} privateKey Private key or key name
   * @returns {Promise<string>} Signature (Base64 encoded)
   */
  async signWithRSA(data, privateKey) {
    try {
      // Preprocess data
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      
      // Get private key
      let privateKeyPem;
      if (typeof privateKey === 'string' && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // If key name, load key
        const keyPair = await this.loadRSAKeyPair(privateKey);
        if (!keyPair.privateKey) {
          throw new Error(`Private key not available: ${privateKey}`);
        }
        privateKeyPem = keyPair.privateKey;
      } else if (typeof privateKey === 'object' && privateKey.privateKey) {
        privateKeyPem = privateKey.privateKey;
      } else {
        privateKeyPem = privateKey;
      }
      
      // Create signer
      const signer = crypto.createSign('SHA256');
      signer.update(dataBuffer);
      
      // Calculate signature
      const signature = signer.sign(privateKeyPem, 'base64');
      
      return signature;
    } catch (error) {
      logger.error('RSA signing failed', { error: error.message });
      throw new Error(`RSA signing failed: ${error.message}`);
    }
  }

  /**
   * Verify signature with RSA public key
   * 
   * @param {string|Buffer} data Original data
   * @param {string} signature Signature (Base64 encoded)
   * @param {string|Object} publicKey Public key or key name
   * @returns {Promise<boolean>} Whether signature is valid
   */
  async verifyWithRSA(data, signature, publicKey) {
    try {
      // Preprocess data
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      
      // Get public key
      let publicKeyPem;
      if (typeof publicKey === 'string' && !publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
        // If key name, load key
        const keyPair = await this.loadRSAKeyPair(publicKey);
        publicKeyPem = keyPair.publicKey;
      } else if (typeof publicKey === 'object' && publicKey.publicKey) {
        publicKeyPem = publicKey.publicKey;
      } else {
        publicKeyPem = publicKey;
      }
      
      // Create verifier
      const verifier = crypto.createVerify('SHA256');
      verifier.update(dataBuffer);
      
      // Verify signature
      return verifier.verify(publicKeyPem, signature, 'base64');
    } catch (error) {
      logger.error('RSA signature verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Encrypt specific fields in an object
   * 
   * @param {Object} data Object to encrypt
   * @param {Array<string>} fields Fields to encrypt
   * @param {string} key Optional encryption key
   * @returns {Object} Object with encrypted fields
   */
  encryptFields(data, fields, key = null) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Data must be an object');
      }
      
      // Create copy of result object
      const result = { ...data };
      
      // Encrypt specified fields
      for (const field of fields) {
        if (field in result && result[field] !== undefined && result[field] !== null) {
          // Mark field as encrypted
          const encryptedData = this.encrypt(result[field], key);
          result[field] = {
            __encrypted: true,
            ...encryptedData
          };
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Field encryption failed', { error: error.message });
      throw new Error(`Field encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt encrypted fields in an object
   * 
   * @param {Object} data Object with encrypted fields
   * @param {string} key Optional decryption key
   * @returns {Object} Decrypted object
   */
  decryptFields(data, key = null) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('Data must be an object');
      }
      
      // Create copy of result object
      const result = { ...data };
      
      // Decrypt all fields marked as encrypted
      for (const field in result) {
        if (
          result[field] && 
          typeof result[field] === 'object' && 
          result[field].__encrypted === true
        ) {
          try {
            result[field] = this.decrypt(result[field], key);
          } catch (decryptError) {
            logger.warn(`Failed to decrypt field "${field}"`, { error: decryptError.message });
            // Preserve encrypted data but mark decryption as failed
            result[field].__decryptFailed = true;
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Field decryption failed', { error: error.message });
      throw new Error(`Field decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate key derivation key
   * 
   * @param {string} password Password
   * @param {string} salt Salt (if not provided, will generate new)
   * @param {number} keyLen Key length
   * @returns {Object} Derived key and salt
   */
  deriveKey(password, salt = null, keyLen = null) {
    try {
      const saltValue = salt || crypto.randomBytes(16).toString('hex');
      const keyLength = keyLen || this.options.keySize;
      
      // Use PBKDF2 to derive key
      const derivedKey = crypto.pbkdf2Sync(
        password,
        saltValue,
        100000, // Iterations
        keyLength,
        'sha512'
      );
      
      return {
        key: derivedKey.toString('hex'),
        salt: saltValue
      };
    } catch (error) {
      logger.error('Key derivation failed', { error: error.message });
      throw new Error(`Key derivation failed: ${error.message}`);
    }
  }

  /**
   * Generate secure random key
   * 
   * @param {number} length Key length (bytes)
   * @returns {string} Hex-formatted key
   */
  generateSecureKey(length = null) {
    const keyLength = length || this.options.keySize;
    return crypto.randomBytes(keyLength).toString('hex');
  }

  /**
   * Create hash
   * 
   * @param {string|Buffer} data Data to hash
   * @param {string} algorithm Hash algorithm
   * @returns {string} Hex-formatted hash
   */
  createHash(data, algorithm = 'sha256') {
    try {
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      return crypto.createHash(algorithm).update(dataBuffer).digest('hex');
    } catch (error) {
      logger.error('Hash creation failed', { algorithm, error: error.message });
      throw new Error(`Hash creation failed: ${error.message}`);
    }
  }

  /**
   * Create HMAC
   * 
   * @param {string|Buffer} data Data to authenticate
   * @param {string} key Key
   * @param {string} algorithm HMAC algorithm
   * @returns {string} Hex-formatted HMAC
   */
  createHMAC(data, key, algorithm = 'sha256') {
    try {
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'utf8');
      
      return crypto.createHmac(algorithm, keyBuffer).update(dataBuffer).digest('hex');
    } catch (error) {
      logger.error('HMAC creation failed', { algorithm, error: error.message });
      throw new Error(`HMAC creation failed: ${error.message}`);
    }
  }

  /**
   * Encrypt sensitive configuration with password
   * 
   * @param {Object} config Configuration object
   * @param {string} password Password
   * @returns {Object} Encrypted configuration
   */
  encryptConfig(config, password) {
    try {
      // Derive key
      const { key, salt } = this.deriveKey(password);
      
      // Encrypt configuration
      const encryptedData = this.encrypt(config, key);
      
      // Return object with salt and encrypted data
      return {
        salt,
        ...encryptedData
      };
    } catch (error) {
      logger.error('Configuration encryption failed', { error: error.message });
      throw new Error(`Configuration encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive configuration with password
   * 
   * @param {Object} encryptedConfig Encrypted configuration
   * @param {string} password Password
   * @returns {Object} Decrypted configuration
   */
  decryptConfig(encryptedConfig, password) {
    try {
      // Ensure salt exists
      if (!encryptedConfig.salt) {
        throw new Error('Encrypted configuration missing salt');
      }
      
      // Derive key
      const { key } = this.deriveKey(password, encryptedConfig.salt);
      
      // Decrypt configuration
      return this.decrypt(encryptedConfig, key);
    } catch (error) {
      logger.error('Configuration decryption failed', { error: error.message });
      throw new Error(`Configuration decryption failed: ${error.message}`);
    }
  }
}

// Export
module.exports = {
  EncryptionService
}; 