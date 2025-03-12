/**
 * RealStack 区块链交易安全库
 * 
 * 提供安全的区块链交易处理功能，包括：
 * - 交易签名生成与验证
 * - 防重放攻击保护
 * - 交易参数验证
 * - 交易费用保护
 * - 智能合约调用安全检查
 */

const crypto = require('crypto');
const { createLogger } = require('../utils/logger');
const ethers = require('ethers'); // 使用ethers.js库处理以太坊交易

// 创建日志记录器
const logger = createLogger({
  service: 'blockchain_security',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * 区块链交易安全服务
 */
class SecureTransactionService {
  /**
   * 创建区块链交易安全服务
   * 
   * @param {Object} options 配置选项
   * @param {Object} options.provider 区块链提供者配置
   * @param {number} options.defaultGasLimit 默认Gas限制
   * @param {number} options.maxGasPrice 最大Gas价格
   * @param {Array} options.trustedContracts 受信任的合约地址列表
   * @param {number} options.nonceValidityWindow Nonce有效窗口（秒）
   * @param {number} options.minConfirmations 最小确认数
   * @param {function} options.transactionRepository 交易存储库
   */
  constructor(options = {}) {
    this.options = {
      provider: options.provider || {
        network: process.env.BLOCKCHAIN_NETWORK || 'mainnet',
        url: process.env.BLOCKCHAIN_PROVIDER_URL
      },
      defaultGasLimit: options.defaultGasLimit || 250000,
      maxGasPrice: options.maxGasPrice || 500, // Gwei
      trustedContracts: options.trustedContracts || [],
      nonceValidityWindow: options.nonceValidityWindow || 300, // 5分钟
      minConfirmations: options.minConfirmations || 3,
      transactionRepository: options.transactionRepository,
      ...options
    };

    // 初始化区块链提供者
    this.initProvider();

    // 初始化已处理的交易ID集合，用于防止重放攻击
    this.processedTransactionIds = new Set();

    // 定期清理过期的交易ID
    setInterval(() => this.cleanupProcessedTransactionIds(), 60 * 60 * 1000); // 每小时清理一次
  }

  /**
   * 初始化区块链提供者
   */
  initProvider() {
    try {
      if (this.options.provider.url) {
        this.provider = new ethers.providers.JsonRpcProvider(
          this.options.provider.url
        );
      } else {
        this.provider = new ethers.providers.getDefaultProvider(
          this.options.provider.network
        );
      }

      logger.info('区块链提供者初始化成功', {
        network: this.options.provider.network
      });
    } catch (error) {
      logger.error('区块链提供者初始化失败', {
        error: error.message,
        network: this.options.provider.network,
        url: this.options.provider.url
      });
      throw new Error('区块链提供者初始化失败');
    }
  }

  /**
   * 创建交易ID
   * 
   * @param {Object} transaction 交易数据
   * @returns {string} 唯一交易ID
   */
  createTransactionId(transaction) {
    const data = JSON.stringify({
      from: transaction.from,
      to: transaction.to,
      value: transaction.value?.toString() || '0',
      nonce: transaction.nonce,
      data: transaction.data || '0x',
      timestamp: transaction.timestamp || Date.now()
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 检查交易是否已处理（防重放攻击）
   * 
   * @param {string} transactionId 交易ID
   * @returns {boolean} 交易是否已处理
   */
  isTransactionProcessed(transactionId) {
    return this.processedTransactionIds.has(transactionId);
  }

  /**
   * 将交易标记为已处理
   * 
   * @param {string} transactionId 交易ID
   * @param {Object} transaction 交易数据
   */
  markTransactionAsProcessed(transactionId, transaction) {
    this.processedTransactionIds.add(transactionId);

    // 如果配置了交易存储库，保存交易记录
    if (this.options.transactionRepository) {
      this.options.transactionRepository.saveTransaction({
        id: transactionId,
        transaction: transaction,
        timestamp: Date.now(),
        status: 'processed'
      }).catch(error => {
        logger.error('保存交易记录失败', {
          transactionId,
          error: error.message
        });
      });
    }
  }

  /**
   * 清理过期的已处理交易ID
   */
  cleanupProcessedTransactionIds() {
    // 如果有交易存储库，则不需要手动清理
    if (this.options.transactionRepository) {
      return;
    }

    // 清理内存中的集合（简化实现，实际应用应该更复杂）
    if (this.processedTransactionIds.size > 10000) {
      logger.info('清理过期的已处理交易ID');
      this.processedTransactionIds.clear();
    }
  }

  /**
   * 创建并签名交易
   * 
   * @param {Object} params 交易参数
   * @param {string} params.from 发送者地址
   * @param {string} params.to 接收者地址
   * @param {string} params.value 交易金额（以wei为单位）
   * @param {string} params.data 交易数据
   * @param {number} params.gasLimit Gas限制
   * @param {number} params.gasPrice Gas价格（以Gwei为单位）
   * @param {string} privateKey 私钥
   * @returns {Promise<Object>} 签名后的交易
   */
  async createAndSignTransaction(params, privateKey) {
    try {
      // 参数验证
      this.validateTransactionParams(params);

      // 获取当前网络状态
      const [gasPrice, nonce, feeData] = await Promise.all([
        params.gasPrice ? Promise.resolve(ethers.utils.parseUnits(params.gasPrice.toString(), 'gwei')) : this.provider.getGasPrice(),
        this.provider.getTransactionCount(params.from, 'pending'),
        this.provider.getFeeData()
      ]);

      // 确保Gas价格在合理范围内
      const maxGasPrice = ethers.utils.parseUnits(this.options.maxGasPrice.toString(), 'gwei');
      const safeGasPrice = gasPrice.gt(maxGasPrice) ? maxGasPrice : gasPrice;
      
      // 使用EIP-1559费用模型（如果支持）
      const txParams = {
        from: params.from,
        to: params.to,
        value: params.value ? ethers.utils.parseEther(params.value.toString()) : 0,
        nonce: params.nonce || nonce,
        gasLimit: params.gasLimit || this.options.defaultGasLimit,
        data: params.data || '0x',
      };

      // 添加EIP-1559费用参数（如果支持）
      if (feeData && feeData.maxFeePerGas) {
        txParams.maxFeePerGas = feeData.maxFeePerGas;
        txParams.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else {
        txParams.gasPrice = safeGasPrice;
      }

      // 创建钱包实例并签名交易
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const signedTx = await wallet.signTransaction(txParams);

      logger.debug('交易创建并签名成功', {
        from: params.from,
        to: params.to,
        value: params.value,
        nonce: txParams.nonce
      });

      return {
        signedTransaction: signedTx,
        transactionParams: txParams,
        transactionId: this.createTransactionId({
          ...params,
          nonce: txParams.nonce,
          timestamp: Date.now()
        })
      };
    } catch (error) {
      logger.error('交易创建或签名失败', {
        error: error.message,
        from: params.from,
        to: params.to
      });
      throw new Error(`交易创建或签名失败: ${error.message}`);
    }
  }

  /**
   * 验证交易参数
   * 
   * @param {Object} params 交易参数
   * @throws {Error} 如果参数无效
   */
  validateTransactionParams(params) {
    // 验证发送者地址
    if (!params.from || !ethers.utils.isAddress(params.from)) {
      throw new Error('无效的发送者地址');
    }

    // 验证接收者地址
    if (!params.to || !ethers.utils.isAddress(params.to)) {
      throw new Error('无效的接收者地址');
    }

    // 验证交易金额
    if (params.value && (isNaN(params.value) || parseFloat(params.value) < 0)) {
      throw new Error('无效的交易金额');
    }

    // 验证Gas限制
    if (params.gasLimit && (isNaN(params.gasLimit) || parseInt(params.gasLimit) <= 0)) {
      throw new Error('无效的Gas限制');
    }

    // 验证Gas价格
    if (params.gasPrice && (isNaN(params.gasPrice) || parseFloat(params.gasPrice) <= 0)) {
      throw new Error('无效的Gas价格');
    }

    // 验证合约地址（如果提供了合约地址）
    if (params.contractAddress && !ethers.utils.isAddress(params.contractAddress)) {
      throw new Error('无效的合约地址');
    }
  }

  /**
   * 发送已签名的交易
   * 
   * @param {string} signedTransaction 已签名的交易
   * @param {string} transactionId 交易ID
   * @returns {Promise<Object>} 交易结果
   */
  async sendSignedTransaction(signedTransaction, transactionId) {
    try {
      // 检查交易是否已处理（防重放攻击）
      if (this.isTransactionProcessed(transactionId)) {
        logger.warn('尝试重放交易', { transactionId });
        throw new Error('交易已处理，可能是重放攻击');
      }

      // 解析交易以获取详细信息
      const tx = ethers.utils.parseTransaction(signedTransaction);

      // 发送交易
      const txResponse = await this.provider.sendTransaction(signedTransaction);
      
      // 标记为已处理
      this.markTransactionAsProcessed(transactionId, {
        hash: txResponse.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        nonce: tx.nonce,
        timestamp: Date.now()
      });

      logger.info('交易已发送', {
        hash: txResponse.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.utils.formatEther(tx.value),
        nonce: tx.nonce
      });

      return {
        success: true,
        transactionHash: txResponse.hash,
        transaction: {
          from: tx.from,
          to: tx.to,
          value: tx.value.toString(),
          nonce: tx.nonce
        }
      };
    } catch (error) {
      logger.error('发送交易失败', {
        error: error.message,
        transactionId
      });
      throw new Error(`发送交易失败: ${error.message}`);
    }
  }

  /**
   * 等待交易确认
   * 
   * @param {string} transactionHash 交易哈希
   * @param {number} confirmations 确认数
   * @returns {Promise<Object>} 交易回执
   */
  async waitForTransaction(transactionHash, confirmations = null) {
    try {
      const requiredConfirmations = confirmations || this.options.minConfirmations;
      
      logger.debug('等待交易确认', {
        hash: transactionHash,
        requiredConfirmations
      });
      
      const receipt = await this.provider.waitForTransaction(
        transactionHash,
        requiredConfirmations
      );
      
      logger.info('交易已确认', {
        hash: transactionHash,
        blockNumber: receipt.blockNumber,
        confirmations: requiredConfirmations,
        status: receipt.status ? '成功' : '失败'
      });
      
      return receipt;
    } catch (error) {
      logger.error('等待交易确认失败', {
        error: error.message,
        hash: transactionHash
      });
      throw new Error(`等待交易确认失败: ${error.message}`);
    }
  }

  /**
   * 验证交易回执
   * 
   * @param {Object} receipt 交易回执
   * @returns {boolean} 交易是否成功
   */
  validateTransactionReceipt(receipt) {
    // 检查交易状态（1表示成功，0表示失败）
    if (receipt.status !== 1) {
      logger.warn('交易执行失败', {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      });
      return false;
    }
    
    return true;
  }

  /**
   * 安全调用智能合约
   * 
   * @param {Object} params 调用参数
   * @param {string} params.contractAddress 合约地址
   * @param {string} params.abi 合约ABI
   * @param {string} params.method 方法名
   * @param {Array} params.args 方法参数
   * @param {string} params.from 调用者地址
   * @param {string} privateKey 私钥
   * @returns {Promise<Object>} 调用结果
   */
  async callContract(params, privateKey) {
    try {
      // 验证合约地址
      if (!ethers.utils.isAddress(params.contractAddress)) {
        throw new Error('无效的合约地址');
      }

      // 验证合约是否在受信任列表中
      const isTrustedContract = this.options.trustedContracts.some(
        contract => contract.toLowerCase() === params.contractAddress.toLowerCase()
      );

      if (!isTrustedContract) {
        logger.warn('尝试调用不受信任的合约', {
          contractAddress: params.contractAddress,
          method: params.method,
          caller: params.from
        });
        // 在非生产环境可以选择阻止不受信任的合约调用
        if (process.env.NODE_ENV === 'production') {
          throw new Error('不受信任的合约地址');
        }
      }

      // 创建合约实例
      const contract = new ethers.Contract(
        params.contractAddress,
        params.abi,
        this.provider
      );

      // 创建钱包实例
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const contractWithSigner = contract.connect(wallet);

      // 准备交易参数
      const overrides = {};
      if (params.value) {
        overrides.value = ethers.utils.parseEther(params.value.toString());
      }
      if (params.gasLimit) {
        overrides.gasLimit = params.gasLimit;
      }
      if (params.gasPrice) {
        overrides.gasPrice = ethers.utils.parseUnits(params.gasPrice.toString(), 'gwei');
      }

      // 动态调用合约方法
      if (!contractWithSigner[params.method]) {
        throw new Error(`合约方法不存在: ${params.method}`);
      }

      // 生成唯一交易ID
      const transactionId = this.createTransactionId({
        from: params.from,
        to: params.contractAddress,
        value: params.value || '0',
        data: contract.interface.encodeFunctionData(params.method, params.args),
        timestamp: Date.now()
      });

      // 检查交易是否已处理（防重放攻击）
      if (this.isTransactionProcessed(transactionId)) {
        throw new Error('合约调用已处理，可能是重放攻击');
      }

      // 调用合约方法
      const tx = await contractWithSigner[params.method](...params.args, overrides);
      
      // 标记为已处理
      this.markTransactionAsProcessed(transactionId, {
        hash: tx.hash,
        from: params.from,
        to: params.contractAddress,
        method: params.method,
        args: params.args,
        value: params.value || '0',
        timestamp: Date.now()
      });

      logger.info('合约方法调用已发送', {
        hash: tx.hash,
        contract: params.contractAddress,
        method: params.method,
        from: params.from
      });

      // 等待交易确认
      const receipt = await this.waitForTransaction(tx.hash);
      
      // 验证交易回执
      const isSuccess = this.validateTransactionReceipt(receipt);
      
      if (!isSuccess) {
        throw new Error('合约方法执行失败');
      }

      // 尝试解析事件日志
      const events = [];
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          events.push({
            name: parsedLog.name,
            args: parsedLog.args
          });
        } catch (error) {
          // 忽略无法解析的日志
        }
      }

      return {
        success: true,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        events
      };
    } catch (error) {
      logger.error('合约调用失败', {
        error: error.message,
        contract: params.contractAddress,
        method: params.method
      });
      throw new Error(`合约调用失败: ${error.message}`);
    }
  }

  /**
   * 安全查询智能合约（不发送交易）
   * 
   * @param {Object} params 查询参数
   * @param {string} params.contractAddress 合约地址
   * @param {string} params.abi 合约ABI
   * @param {string} params.method 方法名
   * @param {Array} params.args 方法参数
   * @returns {Promise<any>} 查询结果
   */
  async queryContract(params) {
    try {
      // 验证合约地址
      if (!ethers.utils.isAddress(params.contractAddress)) {
        throw new Error('无效的合约地址');
      }

      // 创建合约实例
      const contract = new ethers.Contract(
        params.contractAddress,
        params.abi,
        this.provider
      );

      // 检查方法是否存在
      if (!contract[params.method]) {
        throw new Error(`合约方法不存在: ${params.method}`);
      }

      // 调用合约方法
      const result = await contract[params.method](...(params.args || []));

      logger.debug('合约查询成功', {
        contract: params.contractAddress,
        method: params.method
      });

      return result;
    } catch (error) {
      logger.error('合约查询失败', {
        error: error.message,
        contract: params.contractAddress,
        method: params.method
      });
      throw new Error(`合约查询失败: ${error.message}`);
    }
  }

  /**
   * 验证交易参数是否安全
   * 
   * @param {Object} transaction 交易对象
   * @returns {Object} 验证结果
   */
  validateTransactionSecurity(transaction) {
    const issues = [];
    let score = 100; // 安全评分，初始为100分

    // 检查接收地址
    if (!transaction.to) {
      issues.push('缺少接收地址');
      score -= 20;
    } else if (ethers.utils.isAddress(transaction.to)) {
      // 检查是否是已知的危险地址
      // 这里应该有一个危险地址黑名单检查
    }

    // 检查交易金额
    if (transaction.value) {
      const valueInEther = ethers.utils.formatEther(transaction.value);
      if (parseFloat(valueInEther) > 10) {
        issues.push(`大额交易 (${valueInEther} ETH)`);
        score -= 10;
      }
    }

    // 检查交易数据
    if (transaction.data && transaction.data !== '0x') {
      // 检查数据是否符合已知的危险模式
      const dataStr = transaction.data.toString().toLowerCase();
      
      // 检查是否包含可疑的转账函数签名
      if (dataStr.includes('a9059cbb')) { // ERC20 transfer函数签名
        issues.push('包含代币转账操作');
        score -= 5;
      }
      
      // 检查是否包含可疑的授权函数签名
      if (dataStr.includes('095ea7b3')) { // ERC20 approve函数签名
        issues.push('包含代币授权操作');
        score -= 15;
      }
      
      // 检查是否包含可疑的多签钱包函数
      if (dataStr.includes('c6427474')) { // 可能的多签执行函数
        issues.push('包含多签钱包操作');
        score -= 10;
      }
    }

    // 根据评分确定风险级别
    let riskLevel = 'low';
    if (score < 50) {
      riskLevel = 'high';
    } else if (score < 80) {
      riskLevel = 'medium';
    }

    return {
      isSecure: issues.length === 0,
      score,
      riskLevel,
      issues
    };
  }

  /**
   * 验证交易签名
   * 
   * @param {Object} params 验证参数
   * @param {string} params.message 消息
   * @param {string} params.signature 签名
   * @param {string} params.address 地址
   * @returns {boolean} 签名是否有效
   */
  verifySignature(params) {
    try {
      // 使用ethers.js验证签名
      const signerAddress = ethers.utils.verifyMessage(params.message, params.signature);
      
      // 验证签名者地址是否匹配
      const isValid = signerAddress.toLowerCase() === params.address.toLowerCase();
      
      if (!isValid) {
        logger.warn('签名验证失败', {
          expected: params.address,
          actual: signerAddress,
          message: params.message
        });
      }
      
      return isValid;
    } catch (error) {
      logger.error('签名验证过程失败', {
        error: error.message,
        address: params.address
      });
      return false;
    }
  }

  /**
   * 创建安全的签名消息
   * 
   * @param {Object} data 要签名的数据
   * @param {number} expiresIn 过期时间（秒）
   * @returns {Object} 消息对象
   */
  createSignatureMessage(data, expiresIn = 300) {
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + expiresIn;
    
    const message = {
      data,
      meta: {
        timestamp,
        expiresAt,
        nonce: crypto.randomBytes(16).toString('hex')
      }
    };
    
    return {
      message,
      messageString: JSON.stringify(message)
    };
  }

  /**
   * 签名消息
   * 
   * @param {string} message 消息
   * @param {string} privateKey 私钥
   * @returns {string} 签名
   */
  signMessage(message, privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet.signMessage(message);
    } catch (error) {
      logger.error('消息签名失败', { error: error.message });
      throw new Error(`消息签名失败: ${error.message}`);
    }
  }

  /**
   * 验证签名消息是否有效且未过期
   * 
   * @param {string} messageString 消息字符串
   * @param {string} signature 签名
   * @param {string} expectedAddress 预期地址
   * @returns {Object} 验证结果
   */
  verifySignedMessage(messageString, signature, expectedAddress) {
    try {
      // 解析消息
      const message = JSON.parse(messageString);
      
      // 验证消息格式
      if (!message.meta || !message.meta.timestamp || !message.meta.expiresAt || !message.meta.nonce) {
        return {
          isValid: false,
          reason: '无效的消息格式'
        };
      }
      
      // 检查是否过期
      const now = Math.floor(Date.now() / 1000);
      if (now > message.meta.expiresAt) {
        return {
          isValid: false,
          reason: '消息已过期',
          expired: true
        };
      }
      
      // 验证签名
      const signerAddress = ethers.utils.verifyMessage(messageString, signature);
      const isValid = signerAddress.toLowerCase() === expectedAddress.toLowerCase();
      
      if (!isValid) {
        logger.warn('签名验证失败', {
          expected: expectedAddress,
          actual: signerAddress
        });
        
        return {
          isValid: false,
          reason: '签名不匹配'
        };
      }
      
      return {
        isValid: true,
        message: message
      };
    } catch (error) {
      logger.error('签名消息验证失败', {
        error: error.message
      });
      
      return {
        isValid: false,
        reason: `验证失败: ${error.message}`
      };
    }
  }
}

/**
 * 创建加密助手，用于加密和解密私钥
 */
class PrivateKeyEncryption {
  /**
   * 使用密码加密私钥
   * 
   * @param {string} privateKey 私钥
   * @param {string} password 密码
   * @returns {string} 加密后的私钥
   */
  static encryptPrivateKey(privateKey, password) {
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet.encrypt(password);
    } catch (error) {
      logger.error('私钥加密失败', { error: error.message });
      throw new Error(`私钥加密失败: ${error.message}`);
    }
  }

  /**
   * 使用密码解密私钥
   * 
   * @param {string} encryptedPrivateKey 加密后的私钥
   * @param {string} password 密码
   * @returns {Promise<string>} 解密后的私钥
   */
  static async decryptPrivateKey(encryptedPrivateKey, password) {
    try {
      const wallet = await ethers.Wallet.fromEncryptedJson(encryptedPrivateKey, password);
      return wallet.privateKey;
    } catch (error) {
      logger.error('私钥解密失败', { error: error.message });
      throw new Error(`私钥解密失败: ${error.message}`);
    }
  }
}

module.exports = {
  SecureTransactionService,
  PrivateKeyEncryption
}; 