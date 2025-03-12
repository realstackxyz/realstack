/**
 * RealStack 数据加密服务
 * 
 * 提供敏感数据的加密和解密功能，包括：
 * - 对称加密（AES）
 * - 非对称加密（RSA）
 * - 字段级加密
 * - 密钥管理
 * - 数据签名与验证
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { createLogger } = require('../utils/logger');

// 创建日志记录器
const logger = createLogger({
  service: 'data_encryption',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * 数据加密服务
 */
class DataEncryptionService {
  /**
   * 创建数据加密服务
   * 
   * @param {Object} options 配置选项
   * @param {string} options.encryptionKey 对称加密密钥（如果未提供，将使用环境变量或生成一个新的）
   * @param {string} options.algorithm 对称加密算法
   * @param {number} options.keySize 对称加密密钥大小（位）
   * @param {string} options.keysDir 非对称密钥存储目录
   * @param {boolean} options.useHardwareSecure 是否使用硬件安全模块（如可用）
   */
  constructor(options = {}) {
    this.options = {
      encryptionKey: options.encryptionKey || process.env.ENCRYPTION_KEY,
      algorithm: options.algorithm || 'aes-256-gcm',
      keySize: options.keySize || 32, // 256位
      ivSize: options.ivSize || 16, // 128位
      keysDir: options.keysDir || 'keys',
      rsaKeySize: options.rsaKeySize || 2048,
      useHardwareSecure: options.useHardwareSecure || false,
      ...options
    };

    // 确保有可用的对称加密密钥
    if (!this.options.encryptionKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须提供加密密钥');
      } else {
        // 在开发环境生成一个临时密钥
        this.options.encryptionKey = crypto.randomBytes(this.options.keySize).toString('hex');
        logger.warn('未提供加密密钥，已生成临时密钥（仅用于开发环境）');
      }
    }

    // 确保密钥目录存在
    this.ensureKeysDir();
  }

  /**
   * 确保密钥目录存在
   */
  async ensureKeysDir() {
    try {
      const keysPath = path.resolve(this.options.keysDir);
      await fs.mkdir(keysPath, { recursive: true });
    } catch (error) {
      logger.error('创建密钥目录失败', { error: error.message });
    }
  }

  /**
   * 获取标准化的加密密钥
   * 
   * @param {string} key 加密密钥（十六进制格式）
   * @returns {Buffer} 标准化的密钥Buffer
   */
  getNormalizedKey(key = null) {
    const hexKey = key || this.options.encryptionKey;
    // 如果密钥是十六进制字符串，转换为Buffer
    if (typeof hexKey === 'string') {
      // 确保密钥长度正确
      const keyBuffer = Buffer.from(hexKey, 'hex');
      if (keyBuffer.length !== this.options.keySize) {
        // 如果长度不匹配，使用标准化函数调整密钥长度
        return crypto.scryptSync(hexKey, 'salt', this.options.keySize);
      }
      return keyBuffer;
    }
    // 如果已经是Buffer，直接返回
    return hexKey;
  }

  /**
   * 使用AES-GCM算法加密数据
   * 
   * @param {string|Buffer|Object} data 要加密的数据
   * @param {string} key 可选的加密密钥
   * @returns {Object} 加密结果，包含iv、认证标签和密文
   */
  encrypt(data, key = null) {
    try {
      // 预处理数据
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

      // 随机生成初始化向量(IV)
      const iv = crypto.randomBytes(this.options.ivSize);
      
      // 获取标准化密钥
      const normalizedKey = this.getNormalizedKey(key);
      
      // 创建加密器
      const cipher = crypto.createCipheriv(this.options.algorithm, normalizedKey, iv);
      
      // 加密数据
      const encrypted = Buffer.concat([
        cipher.update(dataToEncrypt),
        cipher.final()
      ]);
      
      // 获取认证标签（仅适用于GCM模式）
      const authTag = cipher.getAuthTag ? cipher.getAuthTag() : null;
      
      // 返回加密结果
      return {
        iv: iv.toString('hex'),
        authTag: authTag ? authTag.toString('hex') : null,
        encrypted: encrypted.toString('hex'),
        dataType
      };
    } catch (error) {
      logger.error('数据加密失败', { error: error.message });
      throw new Error(`数据加密失败: ${error.message}`);
    }
  }

  /**
   * 使用AES-GCM算法解密数据
   * 
   * @param {Object} encryptedData 加密的数据对象
   * @param {string} key 可选的解密密钥
   * @returns {string|Buffer|Object} 解密后的数据
   */
  decrypt(encryptedData, key = null) {
    try {
      // 验证加密数据格式
      if (!encryptedData.iv || !encryptedData.encrypted) {
        throw new Error('无效的加密数据格式');
      }
      
      // 将十六进制字符串转换回Buffer
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const encrypted = Buffer.from(encryptedData.encrypted, 'hex');
      const authTag = encryptedData.authTag ? Buffer.from(encryptedData.authTag, 'hex') : null;
      
      // 获取标准化密钥
      const normalizedKey = this.getNormalizedKey(key);
      
      // 创建解密器
      const decipher = crypto.createDecipheriv(this.options.algorithm, normalizedKey, iv);
      
      // 设置认证标签（如果有）
      if (authTag && decipher.setAuthTag) {
        decipher.setAuthTag(authTag);
      }
      
      // 解密数据
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      // 根据原始数据类型返回适当的格式
      if (encryptedData.dataType === 'buffer') {
        return decrypted;
      } else if (encryptedData.dataType === 'object') {
        return JSON.parse(decrypted.toString('utf8'));
      } else {
        return decrypted.toString('utf8');
      }
    } catch (error) {
      logger.error('数据解密失败', { error: error.message });
      throw new Error(`数据解密失败: ${error.message}`);
    }
  }

  /**
   * 生成RSA密钥对
   * 
   * @param {string} keyName 密钥名称
   * @param {number} keySize 密钥大小（位）
   * @returns {Promise<Object>} 生成的密钥对信息
   */
  async generateRSAKeyPair(keyName, keySize = null) {
    try {
      const rsaKeySize = keySize || this.options.rsaKeySize;
      
      logger.info('正在生成RSA密钥对', { keyName, keySize: rsaKeySize });
      
      // 生成密钥对
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
      
      // 保存密钥到文件
      const publicKeyPath = path.join(this.options.keysDir, `${keyName}.public.pem`);
      const privateKeyPath = path.join(this.options.keysDir, `${keyName}.private.pem`);
      
      await Promise.all([
        fs.writeFile(publicKeyPath, publicKey, 'utf8'),
        fs.writeFile(privateKeyPath, privateKey, 'utf8')
      ]);
      
      logger.info('RSA密钥对已生成并保存', { keyName, publicKeyPath, privateKeyPath });
      
      return {
        keyName,
        publicKey,
        privateKey,
        publicKeyPath,
        privateKeyPath
      };
    } catch (error) {
      logger.error('RSA密钥对生成失败', { keyName, error: error.message });
      throw new Error(`RSA密钥对生成失败: ${error.message}`);
    }
  }

  /**
   * 加载RSA密钥对
   * 
   * @param {string} keyName 密钥名称
   * @returns {Promise<Object>} 加载的密钥对
   */
  async loadRSAKeyPair(keyName) {
    try {
      const publicKeyPath = path.join(this.options.keysDir, `${keyName}.public.pem`);
      const privateKeyPath = path.join(this.options.keysDir, `${keyName}.private.pem`);
      
      // 并行读取密钥文件
      const [publicKey, privateKey] = await Promise.all([
        fs.readFile(publicKeyPath, 'utf8'),
        fs.readFile(privateKeyPath, 'utf8').catch(() => null) // 私钥可能不可用
      ]);
      
      return {
        keyName,
        publicKey,
        privateKey,
        publicKeyPath,
        privateKeyPath
      };
    } catch (error) {
      logger.error('加载RSA密钥对失败', { keyName, error: error.message });
      throw new Error(`加载RSA密钥对失败: ${error.message}`);
    }
  }

  /**
   * 使用RSA公钥加密数据
   * 
   * @param {string|Buffer} data 要加密的数据
   * @param {string|Object} publicKey 公钥或密钥名称
   * @returns {Promise<string>} 加密后的数据（Base64编码）
   */
  async encryptWithRSA(data, publicKey) {
    try {
      // 预处理数据
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      
      // 获取公钥
      let publicKeyPem;
      if (typeof publicKey === 'string' && !publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
        // 如果是密钥名称，加载密钥
        const keyPair = await this.loadRSAKeyPair(publicKey);
        publicKeyPem = keyPair.publicKey;
      } else if (typeof publicKey === 'object' && publicKey.publicKey) {
        publicKeyPem = publicKey.publicKey;
      } else {
        publicKeyPem = publicKey;
      }
      
      // 执行加密
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        dataBuffer
      );
      
      // 返回Base64编码的密文
      return encrypted.toString('base64');
    } catch (error) {
      logger.error('RSA加密失败', { error: error.message });
      throw new Error(`RSA加密失败: ${error.message}`);
    }
  }

  /**
   * 使用RSA私钥解密数据
   * 
   * @param {string} encryptedData 加密的数据（Base64编码）
   * @param {string|Object} privateKey 私钥或密钥名称
   * @returns {Promise<string>} 解密后的数据
   */
  async decryptWithRSA(encryptedData, privateKey) {
    try {
      // 将Base64编码的密文转换为Buffer
      const encryptedBuffer = Buffer.from(encryptedData, 'base64');
      
      // 获取私钥
      let privateKeyPem;
      if (typeof privateKey === 'string' && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // 如果是密钥名称，加载密钥
        const keyPair = await this.loadRSAKeyPair(privateKey);
        if (!keyPair.privateKey) {
          throw new Error(`私钥不可用: ${privateKey}`);
        }
        privateKeyPem = keyPair.privateKey;
      } else if (typeof privateKey === 'object' && privateKey.privateKey) {
        privateKeyPem = privateKey.privateKey;
      } else {
        privateKeyPem = privateKey;
      }
      
      // 执行解密
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        encryptedBuffer
      );
      
      // 返回解密后的数据
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('RSA解密失败', { error: error.message });
      throw new Error(`RSA解密失败: ${error.message}`);
    }
  }

  /**
   * 使用RSA私钥签名数据
   * 
   * @param {string|Buffer} data 要签名的数据
   * @param {string|Object} privateKey 私钥或密钥名称
   * @returns {Promise<string>} 签名（Base64编码）
   */
  async signWithRSA(data, privateKey) {
    try {
      // 预处理数据
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      
      // 获取私钥
      let privateKeyPem;
      if (typeof privateKey === 'string' && !privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // 如果是密钥名称，加载密钥
        const keyPair = await this.loadRSAKeyPair(privateKey);
        if (!keyPair.privateKey) {
          throw new Error(`私钥不可用: ${privateKey}`);
        }
        privateKeyPem = keyPair.privateKey;
      } else if (typeof privateKey === 'object' && privateKey.privateKey) {
        privateKeyPem = privateKey.privateKey;
      } else {
        privateKeyPem = privateKey;
      }
      
      // 创建签名者
      const signer = crypto.createSign('SHA256');
      signer.update(dataBuffer);
      
      // 计算签名
      const signature = signer.sign(privateKeyPem, 'base64');
      
      return signature;
    } catch (error) {
      logger.error('RSA签名失败', { error: error.message });
      throw new Error(`RSA签名失败: ${error.message}`);
    }
  }

  /**
   * 使用RSA公钥验证签名
   * 
   * @param {string|Buffer} data 原始数据
   * @param {string} signature 签名（Base64编码）
   * @param {string|Object} publicKey 公钥或密钥名称
   * @returns {Promise<boolean>} 签名是否有效
   */
  async verifyWithRSA(data, signature, publicKey) {
    try {
      // 预处理数据
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      
      // 获取公钥
      let publicKeyPem;
      if (typeof publicKey === 'string' && !publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
        // 如果是密钥名称，加载密钥
        const keyPair = await this.loadRSAKeyPair(publicKey);
        publicKeyPem = keyPair.publicKey;
      } else if (typeof publicKey === 'object' && publicKey.publicKey) {
        publicKeyPem = publicKey.publicKey;
      } else {
        publicKeyPem = publicKey;
      }
      
      // 创建验证者
      const verifier = crypto.createVerify('SHA256');
      verifier.update(dataBuffer);
      
      // 验证签名
      return verifier.verify(publicKeyPem, signature, 'base64');
    } catch (error) {
      logger.error('RSA签名验证失败', { error: error.message });
      return false;
    }
  }

  /**
   * 字段级加密，对对象中的指定字段进行加密
   * 
   * @param {Object} data 要加密的对象
   * @param {Array<string>} fields 要加密的字段
   * @param {string} key 可选的加密密钥
   * @returns {Object} 部分字段被加密的对象
   */
  encryptFields(data, fields, key = null) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('数据必须是对象');
      }
      
      // 创建结果对象的副本
      const result = { ...data };
      
      // 加密指定字段
      for (const field of fields) {
        if (field in result && result[field] !== undefined && result[field] !== null) {
          // 标记加密的字段
          const encryptedData = this.encrypt(result[field], key);
          result[field] = {
            __encrypted: true,
            ...encryptedData
          };
        }
      }
      
      return result;
    } catch (error) {
      logger.error('字段加密失败', { error: error.message });
      throw new Error(`字段加密失败: ${error.message}`);
    }
  }

  /**
   * 字段级解密，对对象中的加密字段进行解密
   * 
   * @param {Object} data 含有加密字段的对象
   * @param {string} key 可选的解密密钥
   * @returns {Object} 解密后的对象
   */
  decryptFields(data, key = null) {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error('数据必须是对象');
      }
      
      // 创建结果对象的副本
      const result = { ...data };
      
      // 解密所有标记为加密的字段
      for (const field in result) {
        if (
          result[field] && 
          typeof result[field] === 'object' && 
          result[field].__encrypted === true
        ) {
          try {
            result[field] = this.decrypt(result[field], key);
          } catch (decryptError) {
            logger.warn(`解密字段 "${field}" 失败`, { error: decryptError.message });
            // 保留加密数据，但标记解密失败
            result[field].__decryptFailed = true;
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('字段解密失败', { error: error.message });
      throw new Error(`字段解密失败: ${error.message}`);
    }
  }

  /**
   * 生成密钥派生密钥
   * 
   * @param {string} password 密码
   * @param {string} salt 盐（如果未提供，将生成新的）
   * @param {number} keyLen 密钥长度
   * @returns {Object} 派生的密钥和盐
   */
  deriveKey(password, salt = null, keyLen = null) {
    try {
      const saltValue = salt || crypto.randomBytes(16).toString('hex');
      const keyLength = keyLen || this.options.keySize;
      
      // 使用PBKDF2派生密钥
      const derivedKey = crypto.pbkdf2Sync(
        password,
        saltValue,
        100000, // 迭代次数
        keyLength,
        'sha512'
      );
      
      return {
        key: derivedKey.toString('hex'),
        salt: saltValue
      };
    } catch (error) {
      logger.error('密钥派生失败', { error: error.message });
      throw new Error(`密钥派生失败: ${error.message}`);
    }
  }

  /**
   * 生成安全的随机密钥
   * 
   * @param {number} length 密钥长度（字节）
   * @returns {string} 十六进制格式的密钥
   */
  generateSecureKey(length = null) {
    const keyLength = length || this.options.keySize;
    return crypto.randomBytes(keyLength).toString('hex');
  }

  /**
   * 生成哈希
   * 
   * @param {string|Buffer} data 要哈希的数据
   * @param {string} algorithm 哈希算法
   * @returns {string} 十六进制格式的哈希
   */
  createHash(data, algorithm = 'sha256') {
    try {
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      return crypto.createHash(algorithm).update(dataBuffer).digest('hex');
    } catch (error) {
      logger.error('哈希创建失败', { algorithm, error: error.message });
      throw new Error(`哈希创建失败: ${error.message}`);
    }
  }

  /**
   * 创建HMAC
   * 
   * @param {string|Buffer} data 要认证的数据
   * @param {string} key 密钥
   * @param {string} algorithm HMAC算法
   * @returns {string} 十六进制格式的HMAC
   */
  createHMAC(data, key, algorithm = 'sha256') {
    try {
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
      const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(String(key), 'utf8');
      
      return crypto.createHmac(algorithm, keyBuffer).update(dataBuffer).digest('hex');
    } catch (error) {
      logger.error('HMAC创建失败', { algorithm, error: error.message });
      throw new Error(`HMAC创建失败: ${error.message}`);
    }
  }

  /**
   * 使用密码加密敏感配置
   * 
   * @param {Object} config 配置对象
   * @param {string} password 密码
   * @returns {Object} 加密的配置
   */
  encryptConfig(config, password) {
    try {
      // 派生密钥
      const { key, salt } = this.deriveKey(password);
      
      // 加密配置
      const encryptedData = this.encrypt(config, key);
      
      // 返回包含盐和加密数据的对象
      return {
        salt,
        ...encryptedData
      };
    } catch (error) {
      logger.error('配置加密失败', { error: error.message });
      throw new Error(`配置加密失败: ${error.message}`);
    }
  }

  /**
   * 使用密码解密敏感配置
   * 
   * @param {Object} encryptedConfig 加密的配置
   * @param {string} password 密码
   * @returns {Object} 解密的配置
   */
  decryptConfig(encryptedConfig, password) {
    try {
      // 确保有盐
      if (!encryptedConfig.salt) {
        throw new Error('加密配置缺少盐');
      }
      
      // 派生密钥
      const { key } = this.deriveKey(password, encryptedConfig.salt);
      
      // 解密配置
      return this.decrypt(encryptedConfig, key);
    } catch (error) {
      logger.error('配置解密失败', { error: error.message });
      throw new Error(`配置解密失败: ${error.message}`);
    }
  }
}

// 导出
module.exports = {
  DataEncryptionService
}; 