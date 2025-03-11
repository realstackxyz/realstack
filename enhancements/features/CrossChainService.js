/**
 * CrossChainService.js
 * 
 * This service provides cross-chain compatibility for the RealStack platform,
 * allowing assets to be tokenized and traded across multiple blockchain networks.
 * 
 * Features:
 * - Multi-chain asset representation
 * - Cross-chain token transfers
 * - Bridge integration for asset portability
 * - Unified interface for blockchain interactions
 * - Chain-specific transaction handling
 */

import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import axios from 'axios';
import { CHAIN_IDS, getChainConfig } from '../config/chains';

class CrossChainService {
  constructor() {
    this.supportedChains = {
      SOLANA: {
        name: 'Solana',
        id: CHAIN_IDS.SOLANA,
        nativeToken: 'SOL',
        decimals: 9,
        isEnabled: true,
      },
      ETHEREUM: {
        name: 'Ethereum',
        id: CHAIN_IDS.ETHEREUM,
        nativeToken: 'ETH',
        decimals: 18,
        isEnabled: true,
      },
      POLYGON: {
        name: 'Polygon',
        id: CHAIN_IDS.POLYGON,
        nativeToken: 'MATIC',
        decimals: 18,
        isEnabled: true,
      },
      AVALANCHE: {
        name: 'Avalanche',
        id: CHAIN_IDS.AVALANCHE,
        nativeToken: 'AVAX',
        decimals: 18,
        isEnabled: true,
      },
      // Add more chains as needed
    };
    
    // Initialize chain-specific providers and connections
    this.providers = {};
    this.connections = {};
    this.initializeProviders();
    
    // Bridge contracts
    this.bridgeContracts = {};
    this.initializeBridges();
  }

  /**
   * Initialize blockchain providers and connections
   * @private
   */
  initializeProviders() {
    // Initialize Ethereum-compatible providers
    for (const chain of ['ETHEREUM', 'POLYGON', 'AVALANCHE']) {
      const chainConfig = getChainConfig(this.supportedChains[chain].id);
      if (chainConfig && this.supportedChains[chain].isEnabled) {
        this.providers[chain] = new ethers.providers.JsonRpcProvider(
          chainConfig.rpcUrl
        );
      }
    }
    
    // Initialize Solana connection
    const solanaConfig = getChainConfig(this.supportedChains.SOLANA.id);
    if (solanaConfig && this.supportedChains.SOLANA.isEnabled) {
      this.connections.SOLANA = new Connection(solanaConfig.rpcUrl);
    }
  }

  /**
   * Initialize bridge contracts
   * @private
   */
  initializeBridges() {
    // Setup bridge contracts for each chain pair
    // This is a simplified implementation - real bridges would be more complex
    for (const sourceChain in this.supportedChains) {
      if (!this.bridgeContracts[sourceChain]) {
        this.bridgeContracts[sourceChain] = {};
      }
      
      for (const targetChain in this.supportedChains) {
        if (sourceChain !== targetChain) {
          const chainConfig = getChainConfig(this.supportedChains[sourceChain].id);
          
          if (chainConfig && chainConfig.bridges && chainConfig.bridges[targetChain]) {
            const bridgeAddress = chainConfig.bridges[targetChain].address;
            const bridgeAbi = chainConfig.bridges[targetChain].abi;
            
            if (this.isEVMChain(sourceChain)) {
              this.bridgeContracts[sourceChain][targetChain] = new ethers.Contract(
                bridgeAddress,
                bridgeAbi,
                this.providers[sourceChain]
              );
            }
            // For Solana bridges, we'll just store the program ID
            else if (sourceChain === 'SOLANA') {
              this.bridgeContracts[sourceChain][targetChain] = bridgeAddress;
            }
          }
        }
      }
    }
  }

  /**
   * Check if a chain is EVM-compatible
   * @param {string} chain - Chain identifier
   * @returns {boolean} - Whether the chain is EVM-compatible
   */
  isEVMChain(chain) {
    return ['ETHEREUM', 'POLYGON', 'AVALANCHE'].includes(chain);
  }

  /**
   * Get list of supported chains
   * @returns {Array} - List of supported chains
   */
  getSupportedChains() {
    return Object.values(this.supportedChains)
      .filter(chain => chain.isEnabled)
      .map(({ name, id, nativeToken }) => ({ name, id, nativeToken }));
  }

  /**
   * Get assets for a specific wallet across all chains
   * @param {Object} walletAddresses - Wallet addresses for different chains
   * @returns {Promise<Array>} - Assets across all chains
   */
  async getAssetsAcrossChains(walletAddresses) {
    const allAssets = [];
    const promises = [];

    for (const chain in walletAddresses) {
      if (this.supportedChains[chain] && this.supportedChains[chain].isEnabled) {
        const address = walletAddresses[chain];
        promises.push(
          this.getChainAssets(chain, address)
            .then(assets => {
              allAssets.push(...assets.map(asset => ({ ...asset, chain })));
            })
            .catch(error => {
              console.error(`Error fetching assets for ${chain}:`, error);
              return []; // Continue with other chains on error
            })
        );
      }
    }

    await Promise.all(promises);
    return allAssets;
  }

  /**
   * Get assets for a specific chain
   * @param {string} chain - Chain identifier
   * @param {string} address - Wallet address on the chain
   * @returns {Promise<Array>} - Assets on the chain
   */
  async getChainAssets(chain, address) {
    if (!this.supportedChains[chain] || !this.supportedChains[chain].isEnabled) {
      throw new Error(`Chain ${chain} is not supported or not enabled`);
    }

    if (this.isEVMChain(chain)) {
      return this.getEVMAssets(chain, address);
    } else if (chain === 'SOLANA') {
      return this.getSolanaAssets(address);
    }
    
    return [];
  }

  /**
   * Get assets for EVM-compatible chains
   * @param {string} chain - Chain identifier
   * @param {string} address - Wallet address
   * @returns {Promise<Array>} - Assets on the chain
   * @private
   */
  async getEVMAssets(chain, address) {
    const chainConfig = getChainConfig(this.supportedChains[chain].id);
    const realStackContractAddress = chainConfig.realStackContract;
    const realStackAbi = chainConfig.realStackAbi;
    
    const contract = new ethers.Contract(
      realStackContractAddress,
      realStackAbi,
      this.providers[chain]
    );
    
    try {
      // Get token IDs owned by address
      const balance = await contract.balanceOf(address);
      const assets = [];
      
      for (let i = 0; i < balance.toNumber(); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(address, i);
        const tokenURI = await contract.tokenURI(tokenId);
        
        // Fetch metadata from URI
        const metadata = await this.fetchMetadata(tokenURI);
        
        assets.push({
          id: tokenId.toString(),
          contract: realStackContractAddress,
          name: metadata.name || `Asset #${tokenId}`,
          description: metadata.description || '',
          image: metadata.image || '',
          properties: metadata.properties || {},
          chainId: this.supportedChains[chain].id,
        });
      }
      
      return assets;
    } catch (error) {
      console.error(`Error fetching EVM assets for ${chain}:`, error);
      throw error;
    }
  }

  /**
   * Get assets for Solana chain
   * @param {string} address - Wallet address
   * @returns {Promise<Array>} - Assets on Solana
   * @private
   */
  async getSolanaAssets(address) {
    try {
      const publicKey = new PublicKey(address);
      const solanaConfig = getChainConfig(this.supportedChains.SOLANA.id);
      const programId = new PublicKey(solanaConfig.programId);
      
      // Get token accounts
      const tokenAccounts = await this.connections.SOLANA.getParsedTokenAccountsByOwner(
        publicKey,
        { programId }
      );
      
      const assets = [];
      
      for (const { account } of tokenAccounts.value) {
        const { mint, amount } = account.data.parsed.info;
        
        if (amount > 0) {
          // Check if this is a RealStack NFT by fetching metadata
          try {
            const metadataPDA = await this.getMetadataPDA(mint);
            const metadataAccount = await this.connections.SOLANA.getAccountInfo(metadataPDA);
            
            if (metadataAccount) {
              const metadata = this.decodeMetadata(metadataAccount.data);
              const externalMetadata = await this.fetchMetadata(metadata.data.uri);
              
              assets.push({
                id: mint,
                contract: solanaConfig.programId,
                name: metadata.data.name,
                description: externalMetadata.description || '',
                image: externalMetadata.image || '',
                properties: externalMetadata.properties || {},
                chainId: this.supportedChains.SOLANA.id,
              });
            }
          } catch (error) {
            console.warn(`Token ${mint} is not a RealStack NFT:`, error);
            // Skip non-RealStack tokens
          }
        }
      }
      
      return assets;
    } catch (error) {
      console.error('Error fetching Solana assets:', error);
      throw error;
    }
  }

  /**
   * Get Metaplex metadata PDA
   * @param {string} mint - Mint address
   * @returns {Promise<PublicKey>} - Metadata PDA
   * @private
   */
  async getMetadataPDA(mint) {
    // This is a simplified version - real implementation would use Metaplex libraries
    // Return a mock PDA for demonstration
    return new PublicKey(mint);
  }

  /**
   * Decode Metaplex metadata
   * @param {Buffer} data - Metadata account data
   * @returns {Object} - Decoded metadata
   * @private
   */
  decodeMetadata(data) {
    // This is a simplified version - real implementation would use Metaplex libraries
    // Return mock metadata for demonstration
    return {
      data: {
        name: 'RealStack Asset',
        uri: 'https://api.realstack.com/metadata/sample',
      }
    };
  }

  /**
   * Fetch metadata from URI
   * @param {string} uri - Metadata URI
   * @returns {Promise<Object>} - Metadata
   * @private
   */
  async fetchMetadata(uri) {
    try {
      const response = await axios.get(uri);
      return response.data;
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return {};
    }
  }

  /**
   * Bridge an asset from one chain to another
   * @param {string} sourceChain - Source chain identifier
   * @param {string} targetChain - Target chain identifier
   * @param {string} sourceAddress - Source wallet address
   * @param {string} targetAddress - Target wallet address
   * @param {string} assetId - Asset ID on source chain
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Bridge transaction result
   */
  async bridgeAsset(sourceChain, targetChain, sourceAddress, targetAddress, assetId, options = {}) {
    if (!this.supportedChains[sourceChain] || !this.supportedChains[sourceChain].isEnabled) {
      throw new Error(`Source chain ${sourceChain} is not supported or not enabled`);
    }
    
    if (!this.supportedChains[targetChain] || !this.supportedChains[targetChain].isEnabled) {
      throw new Error(`Target chain ${targetChain} is not supported or not enabled`);
    }
    
    const bridgeContract = this.bridgeContracts[sourceChain]?.[targetChain];
    if (!bridgeContract) {
      throw new Error(`No bridge available from ${sourceChain} to ${targetChain}`);
    }
    
    if (this.isEVMChain(sourceChain)) {
      return this.bridgeEVMAsset(sourceChain, targetChain, sourceAddress, targetAddress, assetId, options);
    } else if (sourceChain === 'SOLANA') {
      return this.bridgeSolanaAsset(targetChain, sourceAddress, targetAddress, assetId, options);
    }
    
    throw new Error(`Unsupported source chain type: ${sourceChain}`);
  }

  /**
   * Bridge an asset from an EVM chain
   * @param {string} sourceChain - Source chain identifier
   * @param {string} targetChain - Target chain identifier
   * @param {string} sourceAddress - Source wallet address
   * @param {string} targetAddress - Target wallet address
   * @param {string} assetId - Asset ID on source chain
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Bridge transaction result
   * @private
   */
  async bridgeEVMAsset(sourceChain, targetChain, sourceAddress, targetAddress, assetId, options = {}) {
    try {
      const bridgeContract = this.bridgeContracts[sourceChain][targetChain];
      const chainConfig = getChainConfig(this.supportedChains[sourceChain].id);
      const realStackContract = new ethers.Contract(
        chainConfig.realStackContract,
        chainConfig.realStackAbi,
        this.providers[sourceChain]
      );
      
      // Check if the bridge has approval
      const isApproved = await realStackContract.isApprovedForAll(
        sourceAddress,
        bridgeContract.address
      );
      
      if (!isApproved) {
        throw new Error(`Bridge contract needs approval for assets from ${sourceAddress}`);
      }
      
      // Format target address for the target chain
      const formattedTargetAddress = this.formatAddressForChain(targetAddress, targetChain);
      
      // Estimate gas
      const gasLimit = await bridgeContract.estimateGas.bridgeAsset(
        assetId,
        formattedTargetAddress,
        options.data || '0x'
      );
      
      // Prepare transaction for signature (to be signed by wallet)
      const tx = {
        to: bridgeContract.address,
        data: bridgeContract.interface.encodeFunctionData('bridgeAsset', [
          assetId,
          formattedTargetAddress,
          options.data || '0x'
        ]),
        gasLimit: gasLimit.mul(120).div(100), // Add 20% buffer
      };
      
      return {
        transaction: tx,
        chain: sourceChain,
        status: 'ready',
        message: `Ready to bridge asset ${assetId} from ${sourceChain} to ${targetChain}`,
      };
    } catch (error) {
      console.error(`Error preparing EVM bridge transaction:`, error);
      throw error;
    }
  }

  /**
   * Bridge an asset from Solana
   * @param {string} targetChain - Target chain identifier
   * @param {string} sourceAddress - Source wallet address
   * @param {string} targetAddress - Target wallet address
   * @param {string} assetId - Asset ID on Solana
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Bridge transaction result
   * @private
   */
  async bridgeSolanaAsset(targetChain, sourceAddress, targetAddress, assetId, options = {}) {
    try {
      const solanaConfig = getChainConfig(this.supportedChains.SOLANA.id);
      const bridgeProgramId = this.bridgeContracts.SOLANA[targetChain];
      
      // Format target address for the target chain
      const formattedTargetAddress = this.formatAddressForChain(targetAddress, targetChain);
      
      // Prepare transaction (simplified - real implementation would be more complex)
      const sourcePublicKey = new PublicKey(sourceAddress);
      const mintPublicKey = new PublicKey(assetId);
      
      // Get associated token account
      const associatedTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connections.SOLANA,
        null, // Needs actual payer object
        mintPublicKey,
        sourcePublicKey
      );
      
      // This is a simplified transaction - real bridge would be more complex
      const transaction = new Transaction().add(
        // Mock instructions - would use actual bridge program instructions
        // e.g. bridgeProgramInstruction(bridgeProgramId, mintPublicKey, associatedTokenAccount, formattedTargetAddress)
      );
      
      return {
        transaction,
        chain: 'SOLANA',
        status: 'ready',
        message: `Ready to bridge asset ${assetId} from SOLANA to ${targetChain}`,
      };
    } catch (error) {
      console.error(`Error preparing Solana bridge transaction:`, error);
      throw error;
    }
  }

  /**
   * Format address for target chain
   * @param {string} address - Original address
   * @param {string} targetChain - Target chain
   * @returns {string} - Formatted address
   * @private
   */
  formatAddressForChain(address, targetChain) {
    // For EVM chains, return as is
    if (this.isEVMChain(targetChain)) {
      return address;
    }
    
    // For Solana, convert to bytes if needed
    if (targetChain === 'SOLANA') {
      // Check if already a valid Solana address
      try {
        new PublicKey(address);
        return address;
      } catch (error) {
        // Convert from EVM address format
        // This is a simplified conversion - real implementation would be more complex
        return address;
      }
    }
    
    return address;
  }

  /**
   * Get transaction status on a specific chain
   * @param {string} chain - Chain identifier
   * @param {string} txHash - Transaction hash/signature
   * @returns {Promise<Object>} - Transaction status
   */
  async getTransactionStatus(chain, txHash) {
    if (!this.supportedChains[chain] || !this.supportedChains[chain].isEnabled) {
      throw new Error(`Chain ${chain} is not supported or not enabled`);
    }
    
    if (this.isEVMChain(chain)) {
      return this.getEVMTransactionStatus(chain, txHash);
    } else if (chain === 'SOLANA') {
      return this.getSolanaTransactionStatus(txHash);
    }
    
    throw new Error(`Unsupported chain type: ${chain}`);
  }

  /**
   * Get transaction status on EVM chain
   * @param {string} chain - Chain identifier
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} - Transaction status
   * @private
   */
  async getEVMTransactionStatus(chain, txHash) {
    try {
      const receipt = await this.providers[chain].getTransactionReceipt(txHash);
      
      if (!receipt) {
        return {
          status: 'pending',
          confirmations: 0,
          message: 'Transaction is pending',
        };
      }
      
      const confirmations = await this.providers[chain].getBlockNumber() - receipt.blockNumber;
      
      return {
        status: receipt.status ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        message: receipt.status 
          ? `Transaction confirmed with ${confirmations} confirmations` 
          : 'Transaction failed',
      };
    } catch (error) {
      console.error(`Error getting EVM transaction status:`, error);
      throw error;
    }
  }

  /**
   * Get transaction status on Solana
   * @param {string} signature - Transaction signature
   * @returns {Promise<Object>} - Transaction status
   * @private
   */
  async getSolanaTransactionStatus(signature) {
    try {
      const status = await this.connections.SOLANA.getSignatureStatus(signature);
      
      if (!status.value) {
        return {
          status: 'not_found',
          confirmations: 0,
          message: 'Transaction not found',
        };
      }
      
      if (status.value.err) {
        return {
          status: 'failed',
          confirmations: status.value.confirmations || 0,
          message: 'Transaction failed',
          error: status.value.err,
        };
      }
      
      const confirmations = status.value.confirmations || 0;
      const isConfirmed = confirmations > 0;
      
      return {
        status: isConfirmed ? 'confirmed' : 'pending',
        confirmations,
        message: isConfirmed 
          ? `Transaction confirmed with ${confirmations} confirmations` 
          : 'Transaction is pending',
      };
    } catch (error) {
      console.error(`Error getting Solana transaction status:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const crossChainService = new CrossChainService();
export default crossChainService; 