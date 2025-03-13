/**
 * RealStack 增强身份认证系统
 * 
 * 提供增强的身份验证功能，包括：
 * - 多因素认证 (MFA)
 * - 基于JWT的安全会话管理
 * - 防暴力破解机制
 * - 密码策略强制实施
 * - 账户锁定与恢复
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const { createLogger } = require('../utils/logger');

// 创建日志记录器
const logger = createLogger({
  service: 'authentication',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * 增强身份认证服务
 */
class EnhancedAuthService {
  /**
   * 创建增强身份认证服务
   * 
   * @param {Object} options 配置选项
   * @param {string} options.jwtSecret JWT密钥
   * @param {number} options.jwtExpiresIn JWT过期时间（秒）
   * @param {string} options.issuer 令牌颁发者
   * @param {number} options.saltRounds 密码哈希盐轮数
   * @param {string} options.otpIssuer OTP颁发者名称
   * @param {Object} options.passwordPolicy 密码策略配置
   * @param {number} options.lockoutThreshold 账户锁定阈值
   * @param {number} options.lockoutDuration 账户锁定时长（秒）
   * @param {number} options.maxDevices 每个用户的最大设备数
   * @param {function} options.userRepository 用户数据仓库
   * @param {function} options.sessionRepository 会话数据仓库
   */
  constructor(options = {}) {
    this.options = {
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
      jwtExpiresIn: options.jwtExpiresIn || parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
      refreshTokenExpiresIn: options.refreshTokenExpiresIn || parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '2592000', 10), // 30天
      issuer: options.issuer || process.env.TOKEN_ISSUER || 'realstack',
      saltRounds: options.saltRounds || 12,
      otpIssuer: options.otpIssuer || process.env.OTP_ISSUER || 'RealStack',
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        ...options.passwordPolicy
      },
      lockoutThreshold: options.lockoutThreshold || 5,
      lockoutDuration: options.lockoutDuration || 15 * 60, // 15分钟
      maxDevices: options.maxDevices || 5,
      userRepository: options.userRepository,
      sessionRepository: options.sessionRepository
    };

    // 验证必需配置
    if (!this.options.jwtSecret) {
      throw new Error('JWT密钥未提供');
    }

    if (!this.options.userRepository) {
      throw new Error('用户数据仓库未提供');
    }

    if (!this.options.sessionRepository) {
      throw new Error('会话数据仓库未提供');
    }

    // 初始化失败尝试计数器
    this.failedAttempts = new Map();

    // 定期清理过期的失败尝试计数
    setInterval(() => this.cleanupFailedAttempts(), 10 * 60 * 1000); // 每10分钟清理一次
  }

  /**
   * 生成密码哈希
   * 
   * @param {string} password 明文密码
   * @returns {Promise<string>} 哈希后的密码
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.options.saltRounds);
    } catch (error) {
      logger.error('密码哈希生成失败', { error: error.message });
      throw new Error('密码处理失败');
    }
  }

  /**
   * 验证密码
   * 
   * @param {string} password 明文密码
   * @param {string} hash 哈希后的密码
   * @returns {Promise<boolean>} 密码是否匹配
   */
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('密码验证失败', { error: error.message });
      return false;
    }
  }

  /**
   * 验证密码是否符合策略
   * 
   * @param {string} password 密码
   * @returns {Object} 验证结果
   */
  validatePassword(password) {
    const result = {
      isValid: true,
      errors: []
    };

    const policy = this.options.passwordPolicy;

    if (password.length < policy.minLength) {
      result.isValid = false;
      result.errors.push(`密码长度必须至少为${policy.minLength}个字符`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      result.isValid = false;
      result.errors.push('密码必须包含至少一个大写字母');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      result.isValid = false;
      result.errors.push('密码必须包含至少一个小写字母');
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      result.isValid = false;
      result.errors.push('密码必须包含至少一个数字');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      result.isValid = false;
      result.errors.push('密码必须包含至少一个特殊字符');
    }

    return result;
  }

  /**
   * 生成安全的随机令牌
   * 
   * @param {number} length 令牌长度（字节）
   * @returns {string} 生成的令牌（十六进制）
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成JWT令牌
   * 
   * @param {Object} payload 令牌载荷
   * @param {Object} options 令牌选项
   * @returns {string} JWT令牌
   */
  generateJWT(payload, options = {}) {
    const tokenOptions = {
      expiresIn: this.options.jwtExpiresIn,
      issuer: this.options.issuer,
      ...options
    };

    return jwt.sign(payload, this.options.jwtSecret, tokenOptions);
  }

  /**
   * 验证JWT令牌
   * 
   * @param {string} token JWT令牌
   * @returns {Object|null} 解码后的载荷或null（如果无效）
   */
  verifyJWT(token) {
    try {
      return jwt.verify(token, this.options.jwtSecret, {
        issuer: this.options.issuer
      });
    } catch (error) {
      logger.warn('JWT验证失败', { error: error.message });
      return null;
    }
  }

  /**
   * 生成刷新令牌
   * 
   * @param {Object} user 用户对象
   * @param {string} deviceId 设备ID
   * @returns {Promise<Object>} 刷新令牌信息
   */
  async generateRefreshToken(user, deviceId) {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.options.refreshTokenExpiresIn * 1000);

    const tokenData = {
      token,
      userId: user.id,
      deviceId,
      expiresAt,
      createdAt: new Date()
    };

    await this.options.sessionRepository.saveRefreshToken(tokenData);

    return {
      token,
      expiresAt
    };
  }

  /**
   * 验证刷新令牌
   * 
   * @param {string} token 刷新令牌
   * @param {string} deviceId 设备ID
   * @returns {Promise<Object|null>} 用户对象或null（如果无效）
   */
  async verifyRefreshToken(token, deviceId) {
    try {
      const tokenData = await this.options.sessionRepository.findRefreshToken(token);
      
      if (!tokenData) {
        return null;
      }

      // 检查令牌是否过期
      if (new Date() > new Date(tokenData.expiresAt)) {
        await this.options.sessionRepository.deleteRefreshToken(token);
        return null;
      }

      // 检查设备ID是否匹配
      if (tokenData.deviceId !== deviceId) {
        logger.security('刷新令牌设备ID不匹配', {
          token: token.substring(0, 8) + '...',
          expectedDeviceId: tokenData.deviceId,
          actualDeviceId: deviceId
        });
        return null;
      }

      // 获取用户
      const user = await this.options.userRepository.findUserById(tokenData.userId);
      return user;
    } catch (error) {
      logger.error('刷新令牌验证失败', { error: error.message });
      return null;
    }
  }

  /**
   * 吊销刷新令牌
   * 
   * @param {string} token 刷新令牌
   * @returns {Promise<boolean>} 是否成功吊销
   */
  async revokeRefreshToken(token) {
    try {
      await this.options.sessionRepository.deleteRefreshToken(token);
      return true;
    } catch (error) {
      logger.error('刷新令牌吊销失败', { error: error.message });
      return false;
    }
  }

  /**
   * 吊销用户的所有会话
   * 
   * @param {string} userId 用户ID
   * @returns {Promise<boolean>} 是否成功吊销
   */
  async revokeAllUserSessions(userId) {
    try {
      await this.options.sessionRepository.deleteUserSessions(userId);
      return true;
    } catch (error) {
      logger.error('用户会话吊销失败', { userId, error: error.message });
      return false;
    }
  }

  /**
   * 生成OTP密钥
   * 
   * @returns {string} OTP密钥
   */
  generateOTPSecret() {
    return authenticator.generateSecret();
  }

  /**
   * 生成OTP验证器URL
   * 
   * @param {string} username 用户名
   * @param {string} secret OTP密钥
   * @returns {string} OTP验证器URL
   */
  generateOTPAuthURL(username, secret) {
    return authenticator.keyuri(username, this.options.otpIssuer, secret);
  }

  /**
   * 生成OTP二维码
   * 
   * @param {string} otpAuthUrl OTP验证器URL
   * @returns {Promise<string>} 二维码数据URL
   */
  async generateOTPQRCode(otpAuthUrl) {
    try {
      return await QRCode.toDataURL(otpAuthUrl);
    } catch (error) {
      logger.error('OTP二维码生成失败', { error: error.message });
      throw new Error('OTP二维码生成失败');
    }
  }

  /**
   * 验证OTP令牌
   * 
   * @param {string} token OTP令牌
   * @param {string} secret OTP密钥
   * @returns {boolean} 令牌是否有效
   */
  verifyOTP(token, secret) {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      logger.warn('OTP验证失败', { error: error.message });
      return false;
    }
  }

  /**
   * 记录失败的尝试
   * 
   * @param {string} identifier 标识符（用户名或ID）
   * @returns {number} 当前失败尝试次数
   */
  recordFailedAttempt(identifier) {
    const key = identifier.toLowerCase();
    const now = Date.now();
    const attempts = this.failedAttempts.get(key) || { count: 0, lastAttempt: 0 };
    
    // 如果最后一次尝试已过期，重置计数
    if (now - attempts.lastAttempt > this.options.lockoutDuration * 1000) {
      attempts.count = 0;
    }
    
    attempts.count += 1;
    attempts.lastAttempt = now;
    
    this.failedAttempts.set(key, attempts);
    
    logger.warn('登录失败', { identifier: key, attemptCount: attempts.count });
    
    return attempts.count;
  }

  /**
   * 重置失败尝试计数
   * 
   * @param {string} identifier 标识符（用户名或ID）
   */
  resetFailedAttempts(identifier) {
    const key = identifier.toLowerCase();
    this.failedAttempts.delete(key);
  }

  /**
   * 检查账户是否已锁定
   * 
   * @param {string} identifier 标识符（用户名或ID）
   * @returns {boolean} 账户是否锁定
   */
  isAccountLocked(identifier) {
    const key = identifier.toLowerCase();
    const attempts = this.failedAttempts.get(key);
    
    if (!attempts) {
      return false;
    }
    
    const now = Date.now();
    const lockoutExpiry = attempts.lastAttempt + (this.options.lockoutDuration * 1000);
    
    // 如果锁定已过期，重置计数
    if (now > lockoutExpiry && attempts.count >= this.options.lockoutThreshold) {
      this.resetFailedAttempts(key);
      return false;
    }
    
    return attempts.count >= this.options.lockoutThreshold;
  }

  /**
   * 获取账户锁定剩余时间
   * 
   * @param {string} identifier 标识符（用户名或ID）
   * @returns {number} 剩余锁定时间（秒）
   */
  getLockoutRemainingTime(identifier) {
    const key = identifier.toLowerCase();
    const attempts = this.failedAttempts.get(key);
    
    if (!attempts || attempts.count < this.options.lockoutThreshold) {
      return 0;
    }
    
    const now = Date.now();
    const lockoutExpiry = attempts.lastAttempt + (this.options.lockoutDuration * 1000);
    const remainingMs = Math.max(0, lockoutExpiry - now);
    
    return Math.ceil(remainingMs / 1000);
  }

  /**
   * 清理过期的失败尝试计数
   */
  cleanupFailedAttempts() {
    const now = Date.now();
    const expiryTime = this.options.lockoutDuration * 1000;
    
    for (const [key, attempts] of this.failedAttempts.entries()) {
      if (now - attempts.lastAttempt > expiryTime) {
        this.failedAttempts.delete(key);
      }
    }
  }

  /**
   * 用户登录
   * 
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {string} deviceId 设备ID
   * @param {string} otpToken OTP令牌（如果启用了MFA）
   * @returns {Promise<Object>} 登录结果
   */
  async login(username, password, deviceId, otpToken = null) {
    try {
      // 检查账户锁定
      if (this.isAccountLocked(username)) {
        const remainingTime = this.getLockoutRemainingTime(username);
        logger.security('尝试登录已锁定账户', { username, remainingTime });
        
        return {
          success: false,
          message: `账户已临时锁定，请在${Math.ceil(remainingTime / 60)}分钟后重试`,
          remainingTime
        };
      }

      // 获取用户
      const user = await this.options.userRepository.findUserByUsername(username);
      
      if (!user) {
        // 记录失败尝试
        this.recordFailedAttempt(username);
        return { success: false, message: '用户名或密码不正确' };
      }

      // 检查用户状态
      if (user.status === 'disabled') {
        logger.security('尝试登录已禁用账户', { username, userId: user.id });
        return { success: false, message: '账户已被禁用，请联系管理员' };
      }

      // 验证密码
      const passwordValid = await this.verifyPassword(password, user.password);
      
      if (!passwordValid) {
        // 记录失败尝试
        const attempts = this.recordFailedAttempt(username);
        
        // 检查是否需要锁定账户
        if (attempts >= this.options.lockoutThreshold) {
          const lockoutMinutes = Math.ceil(this.options.lockoutDuration / 60);
          logger.security('账户已锁定', { username, userId: user.id, lockoutMinutes });
          
          return {
            success: false,
            message: `由于多次登录失败，账户已临时锁定${lockoutMinutes}分钟`,
            locked: true,
            remainingTime: this.options.lockoutDuration
          };
        }
        
        return {
          success: false,
          message: '用户名或密码不正确',
          remainingAttempts: this.options.lockoutThreshold - attempts
        };
      }

      // 重置失败尝试计数
      this.resetFailedAttempts(username);

      // 如果用户启用了MFA，验证OTP
      if (user.mfaEnabled) {
        // 检查是否提供了OTP令牌
        if (!otpToken) {
          return {
            success: false,
            message: '需要提供OTP令牌',
            requireMFA: true
          };
        }

        // 验证OTP令牌
        const otpValid = this.verifyOTP(otpToken, user.mfaSecret);
        
        if (!otpValid) {
          logger.security('MFA验证失败', { username, userId: user.id });
          return {
            success: false,
            message: 'OTP令牌无效',
            requireMFA: true
          };
        }
      }

      // 检查设备限制
      const userDevices = await this.options.sessionRepository.getUserDevices(user.id);
      
      if (userDevices.length >= this.options.maxDevices && !userDevices.includes(deviceId)) {
        return {
          success: false,
          message: `已达到最大设备数限制 (${this.options.maxDevices})，请先从其他设备登出`,
          tooManyDevices: true,
          devices: userDevices.length
        };
      }

      // 生成JWT
      const payload = {
        id: user.id,
        username: user.username,
        roles: user.roles || [],
        deviceId
      };
      
      const accessToken = this.generateJWT(payload);
      
      // 生成刷新令牌
      const refreshToken = await this.generateRefreshToken(user, deviceId);

      // 记录活动
      await this.options.userRepository.updateLastLogin(user.id);
      
      logger.info('用户登录成功', { 
        userId: user.id, 
        username: user.username, 
        deviceId,
        withMFA: user.mfaEnabled
      });

      // 返回登录结果
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles || [],
          mfaEnabled: user.mfaEnabled,
          lastLogin: new Date()
        },
        tokens: {
          accessToken,
          refreshToken: refreshToken.token,
          expiresIn: this.options.jwtExpiresIn,
          refreshExpiresAt: refreshToken.expiresAt
        }
      };
    } catch (error) {
      logger.error('登录处理失败', { username, error: error.message });
      throw new Error('登录处理失败');
    }
  }

  /**
   * 使用刷新令牌获取新的访问令牌
   * 
   * @param {string} refreshToken 刷新令牌
   * @param {string} deviceId 设备ID
   * @returns {Promise<Object>} 刷新结果
   */
  async refreshAccessToken(refreshToken, deviceId) {
    try {
      // 验证刷新令牌
      const user = await this.verifyRefreshToken(refreshToken, deviceId);
      
      if (!user) {
        return { success: false, message: '无效或过期的刷新令牌' };
      }

      // 生成新的访问令牌
      const payload = {
        id: user.id,
        username: user.username,
        roles: user.roles || [],
        deviceId
      };
      
      const accessToken = this.generateJWT(payload);
      
      logger.debug('访问令牌刷新成功', { userId: user.id, deviceId });
      
      return {
        success: true,
        accessToken,
        expiresIn: this.options.jwtExpiresIn
      };
    } catch (error) {
      logger.error('访问令牌刷新失败', { error: error.message });
      return { success: false, message: '令牌刷新失败' };
    }
  }

  /**
   * 用户登出
   * 
   * @param {string} userId 用户ID
   * @param {string} refreshToken 刷新令牌
   * @param {boolean} allDevices 是否登出所有设备
   * @returns {Promise<Object>} 登出结果
   */
  async logout(userId, refreshToken, allDevices = false) {
    try {
      if (allDevices) {
        // 吊销所有会话
        await this.revokeAllUserSessions(userId);
        logger.info('用户从所有设备登出', { userId });
      } else {
        // 仅吊销当前会话
        await this.revokeRefreshToken(refreshToken);
        logger.info('用户登出', { userId });
      }
      
      return { success: true };
    } catch (error) {
      logger.error('登出处理失败', { userId, error: error.message });
      return { success: false, message: '登出处理失败' };
    }
  }

  /**
   * 为用户启用MFA
   * 
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} MFA设置结果
   */
  async enableMFA(userId) {
    try {
      // 获取用户
      const user = await this.options.userRepository.findUserById(userId);
      
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // 生成OTP密钥
      const secret = this.generateOTPSecret();
      
      // 生成OTP验证器URL
      const otpAuthUrl = this.generateOTPAuthURL(user.username, secret);
      
      // 生成QR码
      const qrCode = await this.generateOTPQRCode(otpAuthUrl);
      
      // 存储临时密钥（实际应用中应该存储在用户会话中，直到验证完成）
      // 这里简化处理，直接返回密钥
      
      return {
        success: true,
        secret,
        otpAuthUrl,
        qrCode
      };
    } catch (error) {
      logger.error('MFA启用失败', { userId, error: error.message });
      return { success: false, message: 'MFA启用失败' };
    }
  }

  /**
   * 验证并确认MFA设置
   * 
   * @param {string} userId 用户ID
   * @param {string} secret OTP密钥
   * @param {string} token OTP令牌
   * @returns {Promise<Object>} 验证结果
   */
  async verifyAndConfirmMFA(userId, secret, token) {
    try {
      // 验证OTP令牌
      const isValid = this.verifyOTP(token, secret);
      
      if (!isValid) {
        return { success: false, message: 'OTP令牌无效' };
      }

      // 更新用户MFA状态
      await this.options.userRepository.updateUserMFA(userId, true, secret);
      
      logger.info('MFA已成功启用', { userId });
      
      return { success: true };
    } catch (error) {
      logger.error('MFA确认失败', { userId, error: error.message });
      return { success: false, message: 'MFA确认失败' };
    }
  }

  /**
   * 禁用用户的MFA
   * 
   * @param {string} userId 用户ID
   * @param {string} password 密码（再次验证）
   * @returns {Promise<Object>} 操作结果
   */
  async disableMFA(userId, password) {
    try {
      // 获取用户
      const user = await this.options.userRepository.findUserById(userId);
      
      if (!user) {
        return { success: false, message: '用户不存在' };
      }

      // 验证密码
      const isPasswordValid = await this.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        return { success: false, message: '密码不正确' };
      }

      // 禁用MFA
      await this.options.userRepository.updateUserMFA(userId, false, null);
      
      // 吊销所有会话，强制用户重新登录
      await this.revokeAllUserSessions(userId);
      
      logger.info('MFA已禁用', { userId });
      
      return { success: true };
    } catch (error) {
      logger.error('MFA禁用失败', { userId, error: error.message });
      return { success: false, message: 'MFA禁用失败' };
    }
  }

  /**
   * 创建Express中间件，用于JWT验证
   * 
   * @param {Object} options 中间件选项
   * @returns {Function} Express中间件
   */
  createJwtMiddleware(options = {}) {
    return (req, res, next) => {
      // 从请求头获取令牌
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: '未提供授权令牌'
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      // 验证令牌
      const decoded = this.verifyJWT(token);
      
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: '无效或过期的令牌'
        });
      }
      
      // 添加用户信息到请求对象
      req.user = decoded;
      
      // 验证角色（如果指定了）
      if (options.roles && options.roles.length > 0) {
        const userRoles = decoded.roles || [];
        const hasRequiredRole = options.roles.some(role => userRoles.includes(role));
        
        if (!hasRequiredRole) {
          return res.status(403).json({
            success: false,
            message: '权限不足'
          });
        }
      }
      
      next();
    };
  }
}

module.exports = {
  EnhancedAuthService
}; 