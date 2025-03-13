/**
 * RealStack Encryption Service Example
 * 
 * This example demonstrates how to use the EncryptionService for various
 * encryption and decryption operations.
 */

const EncryptionService = require('../core/crypto/encryption-service');

// Create an instance of the encryption service with default options
const encryptionService = new EncryptionService();

// Example 1: Symmetric Encryption and Decryption
console.log('Example 1: Symmetric Encryption and Decryption');
console.log('----------------------------------------------');

const sensitiveData = 'This is sensitive information that needs to be encrypted';
const encryptionKey = 'my-secure-password';

try {
  // Encrypt the data
  console.log(`Original data: ${sensitiveData}`);
  const encryptedData = encryptionService.encrypt(sensitiveData, encryptionKey);
  console.log(`Encrypted data: ${JSON.stringify(encryptedData, null, 2)}`);
  
  // Decrypt the data
  const decryptedData = encryptionService.decrypt(encryptedData, encryptionKey);
  console.log(`Decrypted data: ${decryptedData}`);
  console.log(`Decryption successful: ${sensitiveData === decryptedData}`);
} catch (error) {
  console.error(`Error in symmetric encryption example: ${error.message}`);
}

console.log('\n');

// Example 2: Configuration Object Encryption
console.log('Example 2: Configuration Object Encryption');
console.log('------------------------------------------');

const configObject = {
  apiKey: 'abc123xyz789',
  endpoint: 'https://api.example.com/v1',
  timeout: 30000,
  retryCount: 3,
  credentials: {
    username: 'admin',
    password: 'super-secret-password'
  }
};

try {
  // Encrypt the configuration
  console.log(`Original config: ${JSON.stringify(configObject, null, 2)}`);
  const encryptedConfig = encryptionService.encryptConfig(configObject, 'config-password');
  console.log(`Encrypted config: ${JSON.stringify(encryptedConfig, null, 2)}`);
  
  // Decrypt the configuration
  const decryptedConfig = encryptionService.decryptConfig(encryptedConfig, 'config-password');
  console.log(`Decrypted config: ${JSON.stringify(decryptedConfig, null, 2)}`);
} catch (error) {
  console.error(`Error in config encryption example: ${error.message}`);
}

console.log('\n');

// Example 3: HMAC Creation
console.log('Example 3: HMAC Creation');
console.log('-----------------------');

const dataToSign = 'This data needs to be signed to verify its integrity';
const hmacKey = 'hmac-secret-key';

try {
  // Create HMAC
  const hmac = encryptionService.createHMAC(dataToSign, hmacKey);
  console.log(`Data: ${dataToSign}`);
  console.log(`HMAC: ${hmac}`);
  
  // Verify HMAC
  const verificationHmac = encryptionService.createHMAC(dataToSign, hmacKey);
  console.log(`Verification HMAC: ${verificationHmac}`);
  console.log(`HMAC verification successful: ${hmac === verificationHmac}`);
  
  // Example of tampered data
  const tamperedData = dataToSign + ' (tampered)';
  const tamperedHmac = encryptionService.createHMAC(tamperedData, hmacKey);
  console.log(`Tampered data: ${tamperedData}`);
  console.log(`Tampered HMAC: ${tamperedHmac}`);
  console.log(`Tampered data detected: ${hmac !== tamperedHmac}`);
} catch (error) {
  console.error(`Error in HMAC example: ${error.message}`);
}

console.log('\n');

// Example 4: Asymmetric Encryption with Key Pair
console.log('Example 4: Asymmetric Encryption with Key Pair');
console.log('---------------------------------------------');

try {
  // Generate a key pair
  console.log('Generating RSA key pair...');
  const keyPair = encryptionService.generateKeyPair('rsa', { modulusLength: 2048 });
  console.log('Key pair generated successfully');
  
  // Data to encrypt with public key
  const dataForAsymmetric = 'This data will be encrypted with a public key and decrypted with a private key';
  console.log(`Original data: ${dataForAsymmetric}`);
  
  // Encrypt with public key
  const publicKeyEncrypted = encryptionService.publicEncrypt(dataForAsymmetric, keyPair.publicKey);
  console.log(`Public key encrypted data: ${publicKeyEncrypted.substring(0, 64)}...`);
  
  // Decrypt with private key
  const privateKeyDecrypted = encryptionService.privateDecrypt(publicKeyEncrypted, keyPair.privateKey);
  console.log(`Private key decrypted data: ${privateKeyDecrypted}`);
  console.log(`Asymmetric encryption/decryption successful: ${dataForAsymmetric === privateKeyDecrypted}`);
} catch (error) {
  console.error(`Error in asymmetric encryption example: ${error.message}`);
}

console.log('\n');

// Example 5: Custom Encryption Options
console.log('Example 5: Custom Encryption Options');
console.log('-----------------------------------');

try {
  // Create a custom encryption service instance
  const customEncryptionService = new EncryptionService({
    defaultAlgorithm: 'aes-192-cbc',
    keyLength: 24,
    ivLength: 16,
    iterations: 150000,
    digest: 'sha256'
  });
  
  const customData = 'This data will be encrypted with custom options';
  console.log(`Original data: ${customData}`);
  
  // Encrypt with custom options
  const customEncrypted = customEncryptionService.encrypt(customData, 'custom-key');
  console.log(`Custom encrypted data: ${JSON.stringify(customEncrypted, null, 2)}`);
  
  // Decrypt with custom options
  const customDecrypted = customEncryptionService.decrypt(customEncrypted, 'custom-key');
  console.log(`Custom decrypted data: ${customDecrypted}`);
  console.log(`Custom encryption/decryption successful: ${customData === customDecrypted}`);
} catch (error) {
  console.error(`Error in custom encryption example: ${error.message}`);
}

// Run this example with: node crypto-example.js 