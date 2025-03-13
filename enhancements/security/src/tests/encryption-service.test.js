/**
 * Unit tests for the EncryptionService
 */

const assert = require('assert');
const EncryptionService = require('../core/crypto/encryption-service');

// Test suite for EncryptionService
describe('EncryptionService', () => {
  let encryptionService;
  
  // Setup before each test
  beforeEach(() => {
    encryptionService = new EncryptionService();
  });
  
  // Test symmetric encryption and decryption
  describe('Symmetric Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'This is a test message';
      const password = 'test-password';
      
      // Encrypt the data
      const encrypted = encryptionService.encrypt(originalData, password);
      
      // Verify encrypted data structure
      assert.ok(encrypted.encrypted, 'Encrypted data should be present');
      assert.ok(encrypted.iv, 'IV should be present');
      assert.ok(encrypted.salt, 'Salt should be present');
      assert.ok(encrypted.authTag, 'Auth tag should be present for GCM mode');
      assert.strictEqual(encrypted.algorithm, 'aes-256-gcm', 'Algorithm should match default');
      
      // Decrypt the data
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      // Verify decryption result
      assert.strictEqual(decrypted, originalData, 'Decrypted data should match original');
    });
    
    it('should throw an error when decrypting with wrong password', () => {
      const originalData = 'This is a test message';
      const password = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      // Encrypt the data
      const encrypted = encryptionService.encrypt(originalData, password);
      
      // Attempt to decrypt with wrong password
      assert.throws(() => {
        encryptionService.decrypt(encrypted, wrongPassword);
      }, /Decryption failed/, 'Should throw an error when using wrong password');
    });
    
    it('should encrypt and decrypt with custom algorithm', () => {
      const originalData = 'This is a test message';
      const password = 'test-password';
      const options = { algorithm: 'aes-256-cbc' };
      
      // Encrypt with custom algorithm
      const encrypted = encryptionService.encrypt(originalData, password, options);
      
      // Verify algorithm
      assert.strictEqual(encrypted.algorithm, 'aes-256-cbc', 'Algorithm should match specified value');
      assert.strictEqual(encrypted.authTag, null, 'Auth tag should be null for CBC mode');
      
      // Decrypt the data
      const decrypted = encryptionService.decrypt(encrypted, password);
      
      // Verify decryption result
      assert.strictEqual(decrypted, originalData, 'Decrypted data should match original');
    });
  });
  
  // Test configuration object encryption
  describe('Configuration Encryption', () => {
    it('should encrypt and decrypt configuration objects', () => {
      const config = {
        apiKey: 'test-api-key',
        endpoint: 'https://api.example.com',
        options: {
          timeout: 5000,
          retries: 3
        }
      };
      const password = 'config-password';
      
      // Encrypt the config
      const encryptedConfig = encryptionService.encryptConfig(config, password);
      
      // Verify encrypted config structure
      assert.ok(encryptedConfig.encrypted, 'Encrypted data should be present');
      assert.ok(encryptedConfig.iv, 'IV should be present');
      assert.ok(encryptedConfig.salt, 'Salt should be present');
      assert.ok(encryptedConfig.type, 'Type should be present');
      assert.strictEqual(encryptedConfig.type, 'encrypted-config', 'Type should be encrypted-config');
      assert.ok(encryptedConfig.timestamp, 'Timestamp should be present');
      
      // Decrypt the config
      const decryptedConfig = encryptionService.decryptConfig(encryptedConfig, password);
      
      // Verify decryption result
      assert.deepStrictEqual(decryptedConfig, config, 'Decrypted config should match original');
    });
    
    it('should throw an error when decrypting invalid config', () => {
      const invalidConfig = {
        encrypted: 'some-data',
        iv: 'some-iv',
        salt: 'some-salt',
        type: 'not-encrypted-config'
      };
      
      // Attempt to decrypt invalid config
      assert.throws(() => {
        encryptionService.decryptConfig(invalidConfig, 'password');
      }, /Invalid encrypted configuration object/, 'Should throw an error for invalid config type');
    });
  });
  
  // Test HMAC creation
  describe('HMAC Creation', () => {
    it('should create consistent HMACs for the same data and key', () => {
      const data = 'Test data for HMAC';
      const key = 'hmac-key';
      
      // Create HMAC
      const hmac1 = encryptionService.createHMAC(data, key);
      const hmac2 = encryptionService.createHMAC(data, key);
      
      // Verify HMACs match
      assert.strictEqual(hmac1, hmac2, 'HMACs should be consistent for same data and key');
    });
    
    it('should create different HMACs for different data', () => {
      const data1 = 'Test data 1';
      const data2 = 'Test data 2';
      const key = 'hmac-key';
      
      // Create HMACs
      const hmac1 = encryptionService.createHMAC(data1, key);
      const hmac2 = encryptionService.createHMAC(data2, key);
      
      // Verify HMACs are different
      assert.notStrictEqual(hmac1, hmac2, 'HMACs should be different for different data');
    });
    
    it('should create different HMACs for different keys', () => {
      const data = 'Test data';
      const key1 = 'hmac-key-1';
      const key2 = 'hmac-key-2';
      
      // Create HMACs
      const hmac1 = encryptionService.createHMAC(data, key1);
      const hmac2 = encryptionService.createHMAC(data, key2);
      
      // Verify HMACs are different
      assert.notStrictEqual(hmac1, hmac2, 'HMACs should be different for different keys');
    });
    
    it('should support different hash algorithms', () => {
      const data = 'Test data';
      const key = 'hmac-key';
      
      // Create HMACs with different algorithms
      const hmacSha256 = encryptionService.createHMAC(data, key, 'sha256');
      const hmacSha512 = encryptionService.createHMAC(data, key, 'sha512');
      
      // Verify HMACs are different
      assert.notStrictEqual(hmacSha256, hmacSha512, 'HMACs should be different for different algorithms');
      assert.strictEqual(hmacSha256.length, 64, 'SHA-256 HMAC should be 64 characters (32 bytes in hex)');
      assert.strictEqual(hmacSha512.length, 128, 'SHA-512 HMAC should be 128 characters (64 bytes in hex)');
    });
  });
  
  // Test asymmetric encryption
  describe('Asymmetric Encryption', () => {
    it('should generate key pairs', () => {
      // Generate RSA key pair
      const keyPair = encryptionService.generateKeyPair('rsa', { modulusLength: 2048 });
      
      // Verify key pair structure
      assert.ok(keyPair.publicKey, 'Public key should be present');
      assert.ok(keyPair.privateKey, 'Private key should be present');
      assert.ok(keyPair.publicKey.includes('BEGIN PUBLIC KEY'), 'Public key should be in PEM format');
      assert.ok(keyPair.privateKey.includes('BEGIN PRIVATE KEY'), 'Private key should be in PEM format');
    });
    
    it('should encrypt with public key and decrypt with private key', () => {
      // Generate key pair
      const keyPair = encryptionService.generateKeyPair('rsa', { modulusLength: 2048 });
      const originalData = 'Test data for asymmetric encryption';
      
      // Encrypt with public key
      const encrypted = encryptionService.publicEncrypt(originalData, keyPair.publicKey);
      
      // Decrypt with private key
      const decrypted = encryptionService.privateDecrypt(encrypted, keyPair.privateKey);
      
      // Verify decryption result
      assert.strictEqual(decrypted, originalData, 'Decrypted data should match original');
    });
    
    it('should throw an error when decrypting with wrong private key', () => {
      // Generate two key pairs
      const keyPair1 = encryptionService.generateKeyPair('rsa', { modulusLength: 2048 });
      const keyPair2 = encryptionService.generateKeyPair('rsa', { modulusLength: 2048 });
      const originalData = 'Test data for asymmetric encryption';
      
      // Encrypt with first public key
      const encrypted = encryptionService.publicEncrypt(originalData, keyPair1.publicKey);
      
      // Attempt to decrypt with second private key
      assert.throws(() => {
        encryptionService.privateDecrypt(encrypted, keyPair2.privateKey);
      }, /Private key decryption failed/, 'Should throw an error when using wrong private key');
    });
  });
  
  // Test custom encryption service options
  describe('Custom Encryption Service Options', () => {
    it('should use custom options when provided', () => {
      const customOptions = {
        defaultAlgorithm: 'aes-192-cbc',
        keyLength: 24,
        ivLength: 16,
        saltLength: 32,
        iterations: 50000,
        digest: 'sha256'
      };
      
      // Create custom encryption service
      const customService = new EncryptionService(customOptions);
      
      // Test encryption with custom service
      const originalData = 'Test data for custom encryption';
      const password = 'custom-password';
      
      // Encrypt data
      const encrypted = customService.encrypt(originalData, password);
      
      // Verify algorithm
      assert.strictEqual(encrypted.algorithm, customOptions.defaultAlgorithm, 'Algorithm should match custom default');
      
      // Decrypt data
      const decrypted = customService.decrypt(encrypted, password);
      
      // Verify decryption result
      assert.strictEqual(decrypted, originalData, 'Decrypted data should match original');
    });
  });
}); 