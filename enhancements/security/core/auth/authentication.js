/**
 * RealStack Enhanced Authentication System
 * 
 * Provides secure authentication capabilities including:
 * - Multi-factor authentication (MFA)
 * - JWT token management
 * - Password policy enforcement
 * - Rate limiting and brute force protection
 * - Session management
 * - Risk-based authentication
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { EncryptionService } = require('../crypto/encryption');
const { createLogger } = require('../../utils/logger');

// Promisify JWT functions
const jwtSignAsync = promisify(jwt.sign);
const jwtVerifyAsync = promisify(jwt.verify);

// Create logger instance
const logger = createLogger({
  service: 'authentication',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * Password policy configuration
 */
const DEFAULT_PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  maxRepeatedChars: 3,
  prohibitCommonPasswords: true,
  prohibitPersonalInfo: true,
  passwordHistoryLimit: 5,
  expiryDays: 90
};

/**
 * MFA configuration
 */
const DEFAULT_MFA_CONFIG = {
  issuer: 'RealStack',
  digits: 6,
  step: 30,
  window: 1, // Number of steps to check before/after current step
  forceSetup: process.env.NODE_ENV === 'production'
};

/**
 * Token configuration
 */
const DEFAULT_TOKEN_CONFIG = {
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  algorithm: 'HS256',
  issuer: 'realstack-auth',
  audience: 'realstack-api'
};

/**
 * Rate limit configuration
 */
const DEFAULT_RATE_LIMIT_CONFIG = {
  maxLoginAttempts: 5,
  lockoutPeriod: 15 * 60 * 1000, // 15 minutes
  throttleAfterAttempts: 3,
  throttleDelayMs: 2000
};

/**
 * Enhanced Authentication Service
 */
class AuthenticationService {
  /**
   * Create a new authentication service
   * 
   * @param {Object} options Configuration options
   * @param {string} options.jwtSecret JWT secret for signing tokens
   * @param {string} options.refreshTokenSecret Separate secret for refresh tokens
   * @param {Object} options.encryptionService Encryption service instance (optional)
   * @param {Object} options.passwordPolicy Password policy configuration
   * @param {Object} options.mfaConfig MFA configuration
   * @param {Object} options.tokenConfig Token configuration
   * @param {Object} options.rateLimitConfig Rate limit configuration
   * @param {Function} options.userRepository User repository for persistence
   * @param {boolean} options.enableMfa Whether to enable MFA
   * @param {boolean} options.enableRiskBasedAuth Whether to enable risk-based authentication
   */
  constructor(options = {}) {
    // Validate required options
    if (!options.jwtSecret && !process.env.JWT_SECRET) {
      throw new Error('JWT secret is required for authentication service');
    }

    // Initialize options with defaults
    this.options = {
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
      refreshTokenSecret: options.refreshTokenSecret || process.env.REFRESH_TOKEN_SECRET || options.jwtSecret || process.env.JWT_SECRET,
      passwordPolicy: { ...DEFAULT_PASSWORD_POLICY, ...options.passwordPolicy },
      mfaConfig: { ...DEFAULT_MFA_CONFIG, ...options.mfaConfig },
      tokenConfig: { ...DEFAULT_TOKEN_CONFIG, ...options.tokenConfig },
      rateLimitConfig: { ...DEFAULT_RATE_LIMIT_CONFIG, ...options.rateLimitConfig },
      enableMfa: options.enableMfa ?? (process.env.ENABLE_MFA === 'true'),
      enableRiskBasedAuth: options.enableRiskBasedAuth ?? (process.env.ENABLE_RISK_BASED_AUTH === 'true'),
      userRepository: options.userRepository,
      ...options
    };

    // Initialize encryption service if not provided
    this.encryptionService = options.encryptionService || new EncryptionService();

    // Initialize rate limiters
    this.loginAttemptTracker = new Map();
    this.mfaAttemptTracker = new Map();
    this.resetAttemptTracker = new Map();

    // Initialize token blacklist (for revoked tokens)
    this.tokenBlacklist = new Set();

    // Initialize MFA service if needed
    if (this.options.enableMfa) {
      try {
        const speakeasy = require('speakeasy');
        const QRCode = require('qrcode');
        this.speakeasy = speakeasy;
        this.qrcode = QRCode;
      } catch (error) {
        logger.warn('MFA modules not available, install speakeasy and qrcode packages', { error: error.message });
        this.options.enableMfa = false;
      }
    }

    logger.info('Authentication service initialized', {
      enableMfa: this.options.enableMfa,
      enableRiskBasedAuth: this.options.enableRiskBasedAuth
    });
  }

  /**
   * Hash a password
   * 
   * @param {string} password Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    // Using crypto's scrypt for password hashing (better than bcrypt for modern systems)
    return new Promise((resolve, reject) => {
      // Generate random salt
      const salt = crypto.randomBytes(16).toString('hex');
      
      // Hash password
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        // Format: algorithm:salt:hash
        resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
      });
    });
  }

  /**
   * Verify a password against its hash
   * 
   * @param {string} password Plain text password
   * @param {string} hashedPassword Hashed password
   * @returns {Promise<boolean>} Whether password matches
   */
  async verifyPassword(password, hashedPassword) {
    return new Promise((resolve, reject) => {
      // Split stored hash into parts
      const [algorithm, salt, storedHash] = hashedPassword.split(':');
      
      if (algorithm !== 'scrypt') {
        return reject(new Error(`Unsupported hash algorithm: ${algorithm}`));
      }
      
      // Hash the password with the same salt
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        // Check if hashes match
        resolve(storedHash === derivedKey.toString('hex'));
      });
    });
  }

  /**
   * Check if password meets policy requirements
   * 
   * @param {string} password Password to check
   * @param {Object} userData User data to check against (optional)
   * @returns {Object} Validation result
   */
  validatePasswordStrength(password, userData = {}) {
    const policy = this.options.passwordPolicy;
    const errors = [];
    
    // Check minimum length
    if (password.length < policy.minLength) {
      errors.push({
        code: 'PASSWORD_TOO_SHORT',
        message: `Password must be at least ${policy.minLength} characters long`
      });
    }
    
    // Check for uppercase letters
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push({
        code: 'PASSWORD_REQUIRES_UPPERCASE',
        message: 'Password must contain at least one uppercase letter'
      });
    }
    
    // Check for lowercase letters
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push({
        code: 'PASSWORD_REQUIRES_LOWERCASE',
        message: 'Password must contain at least one lowercase letter'
      });
    }
    
    // Check for numbers
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push({
        code: 'PASSWORD_REQUIRES_NUMBER',
        message: 'Password must contain at least one number'
      });
    }
    
    // Check for symbols
    if (policy.requireSymbols && !/[^A-Za-z0-9]/.test(password)) {
      errors.push({
        code: 'PASSWORD_REQUIRES_SYMBOL',
        message: 'Password must contain at least one special character'
      });
    }
    
    // Check for repeated characters
    if (policy.maxRepeatedChars) {
      const repeatedCharsRegex = new RegExp(`(.)\\1{${policy.maxRepeatedChars},}`);
      if (repeatedCharsRegex.test(password)) {
        errors.push({
          code: 'PASSWORD_HAS_REPEATED_CHARS',
          message: `Password must not contain more than ${policy.maxRepeatedChars} repeated characters`
        });
      }
    }
    
    // Check against common passwords
    if (policy.prohibitCommonPasswords) {
      // This is a very simplified check - in production you'd use a dictionary
      const commonPasswords = ['password', 'password123', '123456', 'qwerty', 'admin'];
      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push({
          code: 'PASSWORD_IS_COMMON',
          message: 'Password is too common and easily guessable'
        });
      }
    }
    
    // Check for personal information
    if (policy.prohibitPersonalInfo && userData && Object.keys(userData).length > 0) {
      const personalInfo = [
        userData.username,
        userData.email,
        userData.firstName,
        userData.lastName,
        userData.phone
      ].filter(Boolean).map(v => v.toLowerCase());
      
      // Check if password contains personal info
      for (const info of personalInfo) {
        if (info && info.length > 2 && password.toLowerCase().includes(info)) {
          errors.push({
            code: 'PASSWORD_CONTAINS_PERSONAL_INFO',
            message: 'Password must not contain personal information'
          });
          break;
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this._calculatePasswordStrength(password)
    };
  }

  /**
   * Calculate a password strength score
   * 
   * @param {string} password Password to check
   * @returns {number} Strength score (0-100)
   * @private
   */
  _calculatePasswordStrength(password) {
    let score = 0;
    
    // Basic length score
    score += Math.min(30, password.length * 2);
    
    // Character variety
    if (/[A-Z]/.test(password)) score += 10; // Uppercase
    if (/[a-z]/.test(password)) score += 10; // Lowercase
    if (/[0-9]/.test(password)) score += 10; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 15; // Symbols
    
    // Complexity bonuses
    if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Multiple uppercase
    if (/[0-9].*[0-9]/.test(password)) score += 5; // Multiple numbers
    if (/[^A-Za-z0-9].*[^A-Za-z0-9]/.test(password)) score += 10; // Multiple symbols
    
    // Mix of character types
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) score += 10;
    if (/[A-Za-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 15;
    
    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Generate access and refresh tokens for a user
   * 
   * @param {Object} user User object
   * @param {Object} options Token options
   * @returns {Promise<Object>} Generated tokens
   */
  async generateTokens(user, options = {}) {
    try {
      // Prepare payload
      const now = Math.floor(Date.now() / 1000);
      const basePayload = {
        sub: user.id || user._id,
        iss: this.options.tokenConfig.issuer,
        aud: this.options.tokenConfig.audience,
        iat: now,
        type: 'access'
      };
      
      // Add custom claims
      const customClaims = options.claims || {};
      
      // Generate access token
      const accessPayload = {
        ...basePayload,
        ...customClaims,
        exp: now + this._parseExpiryTime(this.options.tokenConfig.accessTokenExpiresIn)
      };
      
      // Add required user info to token
      if (user.roles) accessPayload.roles = user.roles;
      if (user.permissions) accessPayload.permissions = user.permissions;
      if (user.username) accessPayload.username = user.username;
      
      // Generate refresh token (with minimal payload)
      const refreshPayload = {
        ...basePayload,
        type: 'refresh',
        exp: now + this._parseExpiryTime(this.options.tokenConfig.refreshTokenExpiresIn),
        jti: crypto.randomBytes(16).toString('hex') // Unique token ID for revocation
      };
      
      // Sign tokens
      const [accessToken, refreshToken] = await Promise.all([
        jwtSignAsync(accessPayload, this.options.jwtSecret, {
          algorithm: this.options.tokenConfig.algorithm
        }),
        jwtSignAsync(refreshPayload, this.options.refreshTokenSecret, {
          algorithm: this.options.tokenConfig.algorithm
        })
      ]);
      
      // Persist refresh token if repository exists
      if (this.options.userRepository && typeof this.options.userRepository.saveRefreshToken === 'function') {
        await this.options.userRepository.saveRefreshToken(user.id, refreshPayload.jti, refreshPayload.exp);
      }
      
      // Return tokens with expiry info
      return {
        accessToken,
        refreshToken,
        expiresIn: accessPayload.exp - now,
        tokenType: 'Bearer'
      };
    } catch (error) {
      logger.error('Failed to generate auth tokens', { error: error.message, userId: user.id });
      throw new Error(`Token generation failed: ${error.message}`);
    }
  }

  /**
   * Parse expiry time from string or number
   * 
   * @param {string|number} expiryTime Expiry time
   * @returns {number} Expiry time in seconds
   * @private
   */
  _parseExpiryTime(expiryTime) {
    if (typeof expiryTime === 'number') {
      return expiryTime;
    }
    
    // Parse string format like '15m', '7d', etc.
    const match = expiryTime.match(/^(\d+)([smhdw])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      case 'w': return value * 60 * 60 * 24 * 7;
      default: return 3600;
    }
  }

  /**
   * Verify an access token
   * 
   * @param {string} token JWT token to verify
   * @param {Object} options Verification options
   * @returns {Promise<Object>} Decoded token
   */
  async verifyAccessToken(token, options = {}) {
    try {
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }
      
      // Set verification options
      const verifyOptions = {
        algorithms: [this.options.tokenConfig.algorithm],
        issuer: this.options.tokenConfig.issuer,
        audience: this.options.tokenConfig.audience,
        ...options
      };
      
      // Verify token
      const decoded = await jwtVerifyAsync(token, this.options.jwtSecret, verifyOptions);
      
      // Ensure it's an access token
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      logger.debug('Token verification failed', { error: error.message });
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Refresh an access token using a refresh token
   * 
   * @param {string} refreshToken Refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const verifyOptions = {
        algorithms: [this.options.tokenConfig.algorithm],
        issuer: this.options.tokenConfig.issuer,
        audience: this.options.tokenConfig.audience
      };
      
      const decoded = await jwtVerifyAsync(refreshToken, this.options.refreshTokenSecret, verifyOptions);
      
      // Ensure it's a refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Check if refresh token is valid (if repository exists)
      if (this.options.userRepository && typeof this.options.userRepository.validateRefreshToken === 'function') {
        const isValid = await this.options.userRepository.validateRefreshToken(decoded.sub, decoded.jti);
        if (!isValid) {
          throw new Error('Refresh token has been revoked');
        }
      }
      
      // Get user from repository
      if (!this.options.userRepository || typeof this.options.userRepository.getUserById !== 'function') {
        throw new Error('User repository is required for token refresh');
      }
      
      const user = await this.options.userRepository.getUserById(decoded.sub);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Invalidate old refresh token (if repository supports it)
      if (this.options.userRepository && typeof this.options.userRepository.revokeRefreshToken === 'function') {
        await this.options.userRepository.revokeRefreshToken(decoded.sub, decoded.jti);
      }
      
      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      logger.warn('Access token refresh failed', { error: error.message });
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Revoke a token
   * 
   * @param {string} token Token to revoke
   * @param {string} tokenType Type of token ('access' or 'refresh')
   * @returns {Promise<boolean>} Whether token was revoked
   */
  async revokeToken(token, tokenType = 'access') {
    try {
      // Different handling based on token type
      if (tokenType === 'access') {
        // Add access token to blacklist
        this.tokenBlacklist.add(token);
        
        // Parse token to get expiration
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
          // Schedule cleanup of blacklisted token
          const expiryMs = (decoded.exp * 1000) - Date.now();
          if (expiryMs > 0) {
            setTimeout(() => {
              this.tokenBlacklist.delete(token);
            }, expiryMs);
          }
        }
        
        return true;
      } else if (tokenType === 'refresh') {
        // Verify refresh token first
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.sub || !decoded.jti) {
          throw new Error('Invalid refresh token format');
        }
        
        // Revoke in repository if available
        if (this.options.userRepository && typeof this.options.userRepository.revokeRefreshToken === 'function') {
          await this.options.userRepository.revokeRefreshToken(decoded.sub, decoded.jti);
        } else {
          throw new Error('User repository is required for refresh token revocation');
        }
        
        return true;
      } else {
        throw new Error(`Unsupported token type: ${tokenType}`);
      }
    } catch (error) {
      logger.error('Token revocation failed', { error: error.message, tokenType });
      throw new Error(`Token revocation failed: ${error.message}`);
    }
  }

  /**
   * Generate MFA secret for a user
   * 
   * @param {Object} user User object
   * @param {string} label Label for the MFA app
   * @returns {Promise<Object>} MFA setup details
   */
  async generateMFASecret(user, label = null) {
    if (!this.options.enableMfa || !this.speakeasy) {
      throw new Error('MFA is not enabled or required packages are not installed');
    }
    
    try {
      // Generate new secret
      const secret = this.speakeasy.generateSecret({
        length: 20,
        name: label || `${this.options.mfaConfig.issuer}:${user.username || user.email || user.id}`
      });
      
      // Generate QR code
      const qrCodeUrl = await this.qrcode.toDataURL(secret.otpauth_url);
      
      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url
      };
    } catch (error) {
      logger.error('MFA secret generation failed', { error: error.message, userId: user.id });
      throw new Error(`MFA setup failed: ${error.message}`);
    }
  }

  /**
   * Verify MFA token
   * 
   * @param {string} token MFA token
   * @param {string} secret User's MFA secret
   * @returns {boolean} Whether token is valid
   */
  verifyMFAToken(token, secret) {
    if (!this.options.enableMfa || !this.speakeasy) {
      throw new Error('MFA is not enabled or required packages are not installed');
    }
    
    try {
      // Verify token
      return this.speakeasy.totp.verify({
        secret,
        token,
        encoding: 'base32',
        window: this.options.mfaConfig.window,
        digits: this.options.mfaConfig.digits,
        step: this.options.mfaConfig.step
      });
    } catch (error) {
      logger.debug('MFA token verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Track login attempt for rate limiting
   * 
   * @param {string} identifier User identifier (username, email, ip, etc.)
   * @returns {Object} Rate limit status
   */
  trackLoginAttempt(identifier) {
    const now = Date.now();
    const config = this.options.rateLimitConfig;
    
    // Get or create attempt record
    if (!this.loginAttemptTracker.has(identifier)) {
      this.loginAttemptTracker.set(identifier, {
        count: 0,
        firstAttempt: now,
        lastAttempt: now,
        lockedUntil: null
      });
    }
    
    const record = this.loginAttemptTracker.get(identifier);
    
    // Check if account is locked
    if (record.lockedUntil && record.lockedUntil > now) {
      return {
        allowed: false,
        lockedUntil: record.lockedUntil,
        remainingMs: record.lockedUntil - now
      };
    }
    
    // Check if we should reset the counter (after lockout period)
    if (record.lockedUntil && record.lockedUntil <= now) {
      record.count = 0;
      record.firstAttempt = now;
    }
    
    // Increment attempt counter
    record.count++;
    record.lastAttempt = now;
    
    // Check if account should be locked
    if (record.count >= config.maxLoginAttempts) {
      record.lockedUntil = now + config.lockoutPeriod;
      
      logger.warn('Account locked due to too many login attempts', {
        identifier,
        attempts: record.count,
        lockedUntil: new Date(record.lockedUntil).toISOString()
      });
      
      return {
        allowed: false,
        lockedUntil: record.lockedUntil,
        remainingMs: config.lockoutPeriod
      };
    }
    
    // Check if we should throttle
    if (record.count >= config.throttleAfterAttempts) {
      const throttleDelay = config.throttleDelayMs;
      return {
        allowed: true,
        throttled: true,
        throttleMs: throttleDelay,
        attemptCount: record.count
      };
    }
    
    return {
      allowed: true,
      attemptCount: record.count
    };
  }

  /**
   * Reset login attempt counter
   * 
   * @param {string} identifier User identifier
   */
  resetLoginAttempts(identifier) {
    this.loginAttemptTracker.delete(identifier);
  }

  /**
   * Perform risk analysis on login attempt
   * 
   * @param {Object} context Login context information
   * @returns {Promise<Object>} Risk assessment
   */
  async analyzeLoginRisk(context) {
    if (!this.options.enableRiskBasedAuth) {
      return { riskLevel: 'none', score: 0, requireMFA: false };
    }
    
    try {
      const {
        user,
        ip,
        userAgent,
        location,
        device,
        timestamp = Date.now()
      } = context;
      
      let riskScore = 0;
      const riskFactors = [];
      
      // Check if user has previous login history
      const hasLoginHistory = user.lastLogin && user.knownIps && user.knownIps.length > 0;
      
      // Check IP against known IPs
      if (hasLoginHistory && user.knownIps && !user.knownIps.includes(ip)) {
        riskScore += 25;
        riskFactors.push({
          factor: 'UNKNOWN_IP',
          description: 'Login from new IP address'
        });
      }
      
      // Check device against known devices
      if (hasLoginHistory && user.knownDevices && device && !user.knownDevices.includes(device)) {
        riskScore += 20;
        riskFactors.push({
          factor: 'UNKNOWN_DEVICE',
          description: 'Login from new device'
        });
      }
      
      // Check location
      if (hasLoginHistory && user.lastLocation && location) {
        // Simple distance check - in production you'd use actual geolocation APIs
        const isSameCountry = user.lastLocation.country === location.country;
        if (!isSameCountry) {
          riskScore += 30;
          riskFactors.push({
            factor: 'LOCATION_CHANGE',
            description: 'Login from different country'
          });
        }
      }
      
      // Check time elapsed since last login
      if (hasLoginHistory && user.lastLogin) {
        const daysSinceLastLogin = (timestamp - user.lastLogin) / (1000 * 60 * 60 * 24);
        if (daysSinceLastLogin > 30) {
          riskScore += 15;
          riskFactors.push({
            factor: 'LONG_ABSENCE',
            description: 'First login after extended absence'
          });
        }
      }
      
      // Check suspicious login time (if user has established patterns)
      if (hasLoginHistory && user.loginTimePattern) {
        const hour = new Date(timestamp).getHours();
        if (!user.loginTimePattern.includes(hour)) {
          riskScore += 10;
          riskFactors.push({
            factor: 'UNUSUAL_TIME',
            description: 'Login at unusual time'
          });
        }
      }
      
      // Determine risk level
      let riskLevel = 'low';
      if (riskScore >= 50) {
        riskLevel = 'high';
      } else if (riskScore >= 25) {
        riskLevel = 'medium';
      }
      
      // Determine if MFA should be required based on risk
      const requireMFA = riskLevel === 'high' || (riskLevel === 'medium' && this.options.enableMfa);
      
      // Log risk assessment
      if (riskScore > 0) {
        logger.info('Risk-based authentication assessment', {
          userId: user.id,
          riskScore,
          riskLevel,
          riskFactors,
          requireMFA
        });
      }
      
      return {
        riskLevel,
        score: riskScore,
        factors: riskFactors,
        requireMFA
      };
    } catch (error) {
      logger.error('Risk analysis failed', { error: error.message });
      // In case of error, default to requiring MFA as a precaution
      return { riskLevel: 'unknown', score: 50, requireMFA: this.options.enableMfa };
    }
  }

  /**
   * Generate recovery codes for account
   * 
   * @param {number} count Number of codes to generate
   * @returns {Array<string>} Generated recovery codes
   */
  generateRecoveryCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Format: XXXX-XXXX-XXXX
      const code = `${this._randomAlphaNumeric(4)}-${this._randomAlphaNumeric(4)}-${this._randomAlphaNumeric(4)}`;
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate random alphanumeric string
   * 
   * @param {number} length Length of string
   * @returns {string} Random string
   * @private
   */
  _randomAlphaNumeric(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars.charAt(randomBytes[i] % chars.length);
    }
    return result;
  }

  /**
   * Generate a password reset token
   * 
   * @param {string} userId User ID
   * @returns {Promise<Object>} Reset token details
   */
  async generatePasswordResetToken(userId) {
    try {
      // Generate secure random token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Calculate expiry (24 hours)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      
      // Hash token for storage
      const tokenHash = this.encryptionService.createHash(token);
      
      // Store token if repository exists
      if (this.options.userRepository && typeof this.options.userRepository.saveResetToken === 'function') {
        await this.options.userRepository.saveResetToken(userId, tokenHash, expiresAt);
      }
      
      return {
        token,
        tokenHash,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to generate password reset token', { error: error.message, userId });
      throw new Error(`Reset token generation failed: ${error.message}`);
    }
  }

  /**
   * Verify password reset token
   * 
   * @param {string} userId User ID
   * @param {string} token Reset token
   * @returns {Promise<boolean>} Whether token is valid
   */
  async verifyPasswordResetToken(userId, token) {
    try {
      if (!this.options.userRepository || typeof this.options.userRepository.getResetToken !== 'function') {
        throw new Error('User repository is required for token verification');
      }
      
      // Hash token for comparison
      const tokenHash = this.encryptionService.createHash(token);
      
      // Get stored token
      const storedToken = await this.options.userRepository.getResetToken(userId);
      
      // Check if token exists and is not expired
      if (!storedToken || !storedToken.hash || !storedToken.expiresAt) {
        return false;
      }
      
      // Check if token is expired
      if (storedToken.expiresAt < Date.now()) {
        return false;
      }
      
      // Compare token hashes
      return storedToken.hash === tokenHash;
    } catch (error) {
      logger.error('Failed to verify password reset token', { error: error.message, userId });
      return false;
    }
  }

  /**
   * Create Express middleware to check authentication
   * 
   * @param {Object} options Auth check options
   * @returns {Function} Express middleware
   */
  createAuthMiddleware(options = {}) {
    const {
      required = true,
      roles = null,
      permissions = null
    } = options;
    
    return async (req, res, next) => {
      try {
        // Check for Authorization header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          if (required) {
            return res.status(401).json({
              error: 'Authentication required',
              code: 'AUTH_REQUIRED'
            });
          } else {
            // If auth is optional, continue without user
            return next();
          }
        }
        
        // Extract token
        const token = authHeader.split(' ')[1];
        
        // Verify token
        try {
          const decoded = await this.verifyAccessToken(token);
          
          // Attach user to request
          req.user = decoded;
          
          // Check roles if required
          if (roles && Array.isArray(roles) && roles.length > 0) {
            const userRoles = decoded.roles || [];
            const hasRequiredRole = roles.some(role => userRoles.includes(role));
            
            if (!hasRequiredRole) {
              return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_ROLE'
              });
            }
          }
          
          // Check permissions if required
          if (permissions && Array.isArray(permissions) && permissions.length > 0) {
            const userPermissions = decoded.permissions || [];
            const hasRequiredPermissions = permissions.every(perm => userPermissions.includes(perm));
            
            if (!hasRequiredPermissions) {
              return res.status(403).json({
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS'
              });
            }
          }
          
          // Continue to next middleware
          next();
        } catch (error) {
          if (required) {
            return res.status(401).json({
              error: 'Invalid or expired token',
              code: 'INVALID_TOKEN'
            });
          } else {
            // If auth is optional, continue without user
            return next();
          }
        }
      } catch (error) {
        logger.error('Auth middleware error', { error: error.message });
        return res.status(500).json({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }
}

// Export authentication service
module.exports = {
  AuthenticationService
}; 