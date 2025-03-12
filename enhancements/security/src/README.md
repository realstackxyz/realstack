# RealStack Security Module

This module provides comprehensive security features for RealStack applications, including authentication, encryption, blockchain transaction security, middleware, and CI/CD security tools.

## Architecture Overview

The security module follows a modular, service-oriented architecture designed for maximum flexibility and robust protection.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Security Module Core                              │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │  Authentication     │  │  Encryption         │  │  Blockchain     │  │
│  │  Service            │  │  Service            │  │  Security       │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │  Security           │  │  CI/CD              │  │  Wallet         │  │
│  │  Middleware         │  │  Security           │  │  Security       │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        Integration Layer                                 │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │  Express/Node.js    │  │  Solana             │  │  Frontend       │  │
│  │  Integration        │  │  Integration        │  │  Integration    │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        Application Layer                                 │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐  │
│  │  Web Application    │  │  API Services       │  │  Blockchain     │  │
│  │                     │  │                     │  │  Operations     │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
enhancements/security/src/
├── core/                  # Core security components
│   ├── auth/              # Authentication and authorization
│   │   └── authentication.js  # Authentication service
│   ├── crypto/            # Encryption and cryptographic operations
│   │   └── encryption-service.js  # Encryption service
│   └── blockchain/        # Blockchain security features
│       ├── transaction-security.js  # Transaction validation
│       └── wallet-security.js  # Wallet protection
├── middleware/            # Security middleware components
│   ├── rate-limiter.js    # Rate limiting middleware
│   └── csrf-protection.js # CSRF protection middleware
├── utils/                 # Utility functions
│   └── logger.js          # Security logging utility
├── ci/                    # CI/CD security tools
│   └── cd/                # Continuous deployment security
│       └── security-checks.js  # Security scanning and validation
├── tests/                 # Unit and integration tests
│   └── encryption-service.test.js  # Tests for encryption service
├── examples/              # Example implementations
│   └── crypto-example.js  # Encryption usage examples
├── docs/                  # Documentation
│   ├── user-security-guide.md          # User security guide
│   ├── security-operations-manual.md   # Security operations manual
│   └── secure-coding-guidelines.md     # Secure coding guidelines
└── index.js               # Main entry point
```

## Security Components

### 1. Authentication Service

The Authentication Service provides secure user authentication capabilities:

```javascript
// Core authentication functionality
const auth = new Authentication({
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxRepeatedChars: 2
  },
  mfa: {
    enabled: true,
    issuer: 'RealStack',
    digits: 6,
    step: 30
  }
});

// Password management
const hashedPassword = await auth.hashPassword('user-password');
const isValid = await auth.verifyPassword('user-password', hashedPassword);

// MFA operations
const secret = await auth.generateMFASecret(userId);
const isValidMFA = auth.verifyMFAToken(secret, userToken);

// JWT operations
const token = await auth.generateToken(user);
const decoded = await auth.verifyToken(token);
```

### 2. Encryption Service

The Encryption Service provides data protection through modern cryptographic algorithms:

```javascript
// Initializing with custom options
const encryption = new EncryptionService({
  defaultAlgorithm: 'aes-256-gcm',
  keyLength: 32,
  iterations: 100000
});

// Symmetric encryption
const encrypted = encryption.encrypt(sensitiveData, encryptionKey);
const decrypted = encryption.decrypt(encrypted, encryptionKey);

// HMAC creation
const hmac = encryption.createHMAC(data, key);

// Configuration encryption
const encryptedConfig = encryption.encryptConfig(configObject, password);
const decryptedConfig = encryption.decryptConfig(encryptedConfig, password);

// Asymmetric encryption
const keyPair = encryption.generateKeyPair('rsa');
const encryptedWithPublic = encryption.publicEncrypt(data, keyPair.publicKey);
const decryptedWithPrivate = encryption.privateDecrypt(encryptedWithPublic, keyPair.privateKey);
```

### 3. Blockchain Transaction Security

The Transaction Security Service provides protection for blockchain operations:

```javascript
// Initialize with custom options
const txSecurity = new TransactionSecurity({
  nonceExpirationTime: 300, // 5 minutes
  maxTransactionAge: 3600,  // 1 hour
  rateLimits: {
    default: { txPerMinute: 10, dailyValue: 10000 },
    premium: { txPerMinute: 30, dailyValue: 50000 }
  }
});

// Generate and verify nonces to prevent replay attacks
const nonce = txSecurity.generateNonce(accountAddress);
const isValidNonce = txSecurity.verifyNonce(accountAddress, nonce);

// Validate transaction format and contents
const isValidFormat = txSecurity.validateTransactionFormat(transaction);

// Verify transaction signatures
const isValidSignature = txSecurity.verifyTransactionSignature(transaction, publicKey);

// Analyze transactions for suspicious patterns
const analysis = txSecurity.analyzeTransaction(transaction);
```

### 4. Security Middleware

The security middleware components provide protection for web services:

```javascript
// Rate limiting middleware
const rateLimiter = createRateLimiter({
  storeType: 'redis',
  redis: { host: 'localhost', port: 6379 },
  limiters: {
    default: { points: 100, duration: 60 },
    'POST /api/auth/login': { points: 5, duration: 60, blockDuration: 600 }
  }
});
app.use(rateLimiter);

// CSRF protection middleware
const csrfProtection = createCsrfProtection({
  cookieName: 'XSRF-TOKEN',
  headerName: 'X-XSRF-TOKEN',
  excludeRoutes: ['/api/webhook', '/api/public']
});
app.use(csrfProtection.middleware);
```

## Data Flow Architecture

The security module implements a multi-layered defense approach:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ User Request │───►│ Rate Limiter │───►│ CSRF         │───►│ Request      │
│              │    │              │    │ Protection   │    │ Validation   │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                    │
                                                                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Response     │◄───│ Action       │◄───│ Transaction  │◄───│ Authentication│
│ Processing   │    │ Processing   │    │ Security     │    │ & Authorization│
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## Usage

### Basic Usage

```javascript
const security = require('enhancements/security/src');

// Initialize all security components with default configuration
const securityComponents = security.initializeSecurity();

// Use individual components
const { authentication, encryption, middleware } = securityComponents;
```

### Using Individual Components

```javascript
const { 
  Authentication, 
  EncryptionService, 
  createRateLimiter, 
  createLogger 
} = require('enhancements/security/src');

// Create a logger
const logger = createLogger({ service: 'my-service' });

// Initialize authentication
const auth = new Authentication({
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  logger
});

// Initialize encryption
const encryption = new EncryptionService({
  defaultAlgorithm: 'aes-256-gcm',
  keyLength: 32
});

// Create rate limiter middleware
const rateLimiter = createRateLimiter({
  storeType: 'memory',
  limiters: {
    default: {
      points: 100,
      duration: 60,
      blockDuration: 600
    }
  },
  logger
});
```

### Express Integration

```javascript
const express = require('express');
const { initializeSecurity } = require('enhancements/security/src');

const app = express();
const security = initializeSecurity();

// Apply security middleware
app.use(security.middleware.httpLogger);
app.use(security.middleware.rateLimiter);
app.use(security.middleware.csrfProtection.middleware);

// Error handling
app.use(security.middleware.errorLogger);

// Protected route example
app.post('/api/secure-endpoint', async (req, res) => {
  try {
    // Authenticate user
    const user = await security.authentication.verifyToken(req.headers.authorization);
    
    // Encrypt sensitive data
    const encryptedData = security.encryption.encrypt(req.body.sensitiveData, process.env.ENCRYPTION_KEY);
    
    // Process blockchain transaction
    const transaction = await security.transactionSecurity.verifyTransaction(req.body.transaction);
    
    res.json({ success: true, data: encryptedData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## CI/CD Security Integration

```javascript
const { SecurityCIChecks } = require('enhancements/security/src');

// Create security CI/CD checks
const securityCI = new SecurityCIChecks({
  projectRoot: process.cwd(),
  failOnError: true,
  thresholds: {
    vulnerabilities: {
      critical: 0,
      high: 0,
      moderate: 5,
      low: 10
    }
  }
});

// Run all security checks
async function runSecurityChecks() {
  try {
    const results = await securityCI.runAllChecks();
    console.log('Security checks passed:', results.summary.passed);
    console.log('Overall security score:', results.summary.overallScore);
  } catch (error) {
    console.error('Security checks failed:', error.message);
    process.exit(1);
  }
}

runSecurityChecks();
```

## Security Testing

The module includes comprehensive tests for all security components. Run the tests using:

```bash
npm test
```

## Documentation

For more detailed information, please refer to the documentation in the `docs` directory:

- [User Security Guide](./docs/user-security-guide.md) - Security best practices for users
- [Security Operations Manual](./docs/security-operations-manual.md) - Guide for security operations
- [Secure Coding Guidelines](./docs/secure-coding-guidelines.md) - Guidelines for secure coding practices

## Best Practices

- Always use the latest version of the security module
- Store encryption keys and sensitive configuration in a secure environment
- Implement the complete suite of security features for maximum protection
- Regularly update and patch dependencies
- Conduct periodic security reviews and penetration testing
- Use hardware security modules (HSMs) for production key storage
- Enable Multi-Factor Authentication for all administrative access
- Follow least privilege principles when configuring permissions 