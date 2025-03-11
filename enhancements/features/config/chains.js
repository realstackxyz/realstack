/**
 * Chain Configuration
 * 
 * This file defines configuration for all blockchain networks
 * supported by the RealStack platform.
 */

// Chain IDs for supported networks
export const CHAIN_IDS = {
  SOLANA: 'solana',
  ETHEREUM: 1,        // Mainnet
  POLYGON: 137,       // Mainnet
  AVALANCHE: 43114,   // C-Chain
  
  // Testnets
  ETHEREUM_GOERLI: 5,
  POLYGON_MUMBAI: 80001,
  AVALANCHE_FUJI: 43113,
  SOLANA_DEVNET: 'solana-devnet',
  SOLANA_TESTNET: 'solana-testnet',
};

// Network configurations
const CHAIN_CONFIGS = {
  // Solana
  [CHAIN_IDS.SOLANA]: {
    name: 'Solana',
    nativeToken: 'SOL',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://explorer.solana.com',
    programId: 'RS1STACKNFT1111111111111111111111111111111',
    bridges: {
      ETHEREUM: {
        address: 'WormholeRSBridgeSOLToETH111111111111111',
        programId: 'WormholeBridge1111111111111111111111111',
      },
      POLYGON: {
        address: 'WormholeRSBridgeSOLToPOLY111111111111111',
        programId: 'WormholeBridge1111111111111111111111111',
      },
      AVALANCHE: {
        address: 'WormholeRSBridgeSOLToAVAX111111111111111',
        programId: 'WormholeBridge1111111111111111111111111',
      },
    },
  },
  [CHAIN_IDS.SOLANA_DEVNET]: {
    name: 'Solana Devnet',
    nativeToken: 'SOL',
    rpcUrl: 'https://api.devnet.solana.com',
    explorerUrl: 'https://explorer.solana.com/?cluster=devnet',
    programId: 'RS1STACKNFT1TESTNETDev111111111111111111',
    isTestnet: true,
  },
  [CHAIN_IDS.SOLANA_TESTNET]: {
    name: 'Solana Testnet',
    nativeToken: 'SOL',
    rpcUrl: 'https://api.testnet.solana.com',
    explorerUrl: 'https://explorer.solana.com/?cluster=testnet',
    programId: 'RS1STACKNFT1TESTNET11111111111111111111',
    isTestnet: true,
  },
  
  // Ethereum
  [CHAIN_IDS.ETHEREUM]: {
    name: 'Ethereum',
    nativeToken: 'ETH',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://etherscan.io',
    realStackContract: '0xRS1StackEthereum11111111111111111111',
    realStackAbi: [], // To be filled with actual ABI
    bridges: {
      SOLANA: {
        address: '0xWormholeRSBridgeETHToSOL111111111111',
        abi: [], // To be filled with actual ABI
      },
      POLYGON: {
        address: '0xRSBridgeETHToPolygon1111111111111111',
        abi: [], // To be filled with actual ABI
      },
      AVALANCHE: {
        address: '0xRSBridgeETHToAvalanche11111111111111',
        abi: [], // To be filled with actual ABI
      },
    },
  },
  [CHAIN_IDS.ETHEREUM_GOERLI]: {
    name: 'Ethereum Goerli',
    nativeToken: 'ETH',
    rpcUrl: 'https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://goerli.etherscan.io',
    realStackContract: '0xRS1StackEthereumGoerli111111111111',
    realStackAbi: [], // To be filled with actual ABI
    isTestnet: true,
  },
  
  // Polygon
  [CHAIN_IDS.POLYGON]: {
    name: 'Polygon',
    nativeToken: 'MATIC',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://polygonscan.com',
    realStackContract: '0xRS1StackPolygon11111111111111111111',
    realStackAbi: [], // To be filled with actual ABI
    bridges: {
      SOLANA: {
        address: '0xWormholeRSBridgePOLYToSOL111111111111',
        abi: [], // To be filled with actual ABI
      },
      ETHEREUM: {
        address: '0xRSBridgePolygonToETH1111111111111111',
        abi: [], // To be filled with actual ABI
      },
      AVALANCHE: {
        address: '0xRSBridgePolygonToAvalanche1111111111',
        abi: [], // To be filled with actual ABI
      },
    },
  },
  [CHAIN_IDS.POLYGON_MUMBAI]: {
    name: 'Polygon Mumbai',
    nativeToken: 'MATIC',
    rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/YOUR_API_KEY',
    explorerUrl: 'https://mumbai.polygonscan.com',
    realStackContract: '0xRS1StackPolygonMumbai111111111111',
    realStackAbi: [], // To be filled with actual ABI
    isTestnet: true,
  },
  
  // Avalanche
  [CHAIN_IDS.AVALANCHE]: {
    name: 'Avalanche',
    nativeToken: 'AVAX',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    realStackContract: '0xRS1StackAvalanche1111111111111111111',
    realStackAbi: [], // To be filled with actual ABI
    bridges: {
      SOLANA: {
        address: '0xWormholeRSBridgeAVAXToSOL111111111111',
        abi: [], // To be filled with actual ABI
      },
      ETHEREUM: {
        address: '0xRSBridgeAvalancheToETH111111111111111',
        abi: [], // To be filled with actual ABI
      },
      POLYGON: {
        address: '0xRSBridgeAvalancheToPolygon1111111111',
        abi: [], // To be filled with actual ABI
      },
    },
  },
  [CHAIN_IDS.AVALANCHE_FUJI]: {
    name: 'Avalanche Fuji',
    nativeToken: 'AVAX',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorerUrl: 'https://testnet.snowtrace.io',
    realStackContract: '0xRS1StackAvalancheFuji11111111111111',
    realStackAbi: [], // To be filled with actual ABI
    isTestnet: true,
  },
};

// ERC721 ABI for RealStack NFTs
const ERC721_ABI = [
  // This is a simplified ABI - would be filled with the full ABI
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "uint256", "name": "index", "type": "uint256"}],
    "name": "tokenOfOwnerByIndex",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "tokenURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "operator", "type": "address"}],
    "name": "isApprovedForAll",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "operator", "type": "address"}, {"internalType": "bool", "name": "approved", "type": "bool"}],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Add ABIs to all EVM chain configs
Object.values(CHAIN_CONFIGS)
  .filter(config => config.realStackAbi !== undefined)
  .forEach(config => {
    config.realStackAbi = ERC721_ABI;
  });

// Wormhole bridge ABI (simplified for example)
const BRIDGE_ABI = [
  // This is a simplified ABI - would be filled with the full ABI
  {
    "inputs": [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "string", "name": "targetAddress", "type": "string"},
      {"internalType": "bytes", "name": "additionalData", "type": "bytes"}
    ],
    "name": "bridgeAsset",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "estimateFee",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Add bridge ABIs to all configs
Object.values(CHAIN_CONFIGS)
  .filter(config => config.bridges)
  .forEach(config => {
    Object.values(config.bridges).forEach(bridge => {
      if (bridge.abi !== undefined) {
        bridge.abi = BRIDGE_ABI;
      }
    });
  });

/**
 * Get chain configuration by chain ID
 * @param {string|number} chainId - Chain ID
 * @returns {Object|null} - Chain configuration
 */
export const getChainConfig = (chainId) => {
  return CHAIN_CONFIGS[chainId] || null;
};

/**
 * Get icon URL for a chain
 * @param {string|number} chainId - Chain ID
 * @returns {string} - Icon URL
 */
export const getChainIcon = (chainId) => {
  const baseIconUrl = '/images/chains/';
  
  switch (chainId) {
    case CHAIN_IDS.SOLANA:
    case CHAIN_IDS.SOLANA_DEVNET:
    case CHAIN_IDS.SOLANA_TESTNET:
      return `${baseIconUrl}solana.svg`;
    case CHAIN_IDS.ETHEREUM:
    case CHAIN_IDS.ETHEREUM_GOERLI:
      return `${baseIconUrl}ethereum.svg`;
    case CHAIN_IDS.POLYGON:
    case CHAIN_IDS.POLYGON_MUMBAI:
      return `${baseIconUrl}polygon.svg`;
    case CHAIN_IDS.AVALANCHE:
    case CHAIN_IDS.AVALANCHE_FUJI:
      return `${baseIconUrl}avalanche.svg`;
    default:
      return `${baseIconUrl}default.svg`;
  }
};

/**
 * Get explorer URL for a transaction
 * @param {string|number} chainId - Chain ID
 * @param {string} txHash - Transaction hash
 * @returns {string} - Explorer URL
 */
export const getExplorerTxUrl = (chainId, txHash) => {
  const config = getChainConfig(chainId);
  if (!config || !config.explorerUrl) {
    return '';
  }
  
  if (chainId === CHAIN_IDS.SOLANA || chainId === CHAIN_IDS.SOLANA_DEVNET || chainId === CHAIN_IDS.SOLANA_TESTNET) {
    return `${config.explorerUrl}/tx/${txHash}`;
  } else {
    return `${config.explorerUrl}/tx/${txHash}`;
  }
};

/**
 * Get explorer URL for an address
 * @param {string|number} chainId - Chain ID
 * @param {string} address - Address
 * @returns {string} - Explorer URL
 */
export const getExplorerAddressUrl = (chainId, address) => {
  const config = getChainConfig(chainId);
  if (!config || !config.explorerUrl) {
    return '';
  }
  
  if (chainId === CHAIN_IDS.SOLANA || chainId === CHAIN_IDS.SOLANA_DEVNET || chainId === CHAIN_IDS.SOLANA_TESTNET) {
    return `${config.explorerUrl}/address/${address}`;
  } else {
    return `${config.explorerUrl}/address/${address}`;
  }
};

/**
 * Get native token symbol for a chain
 * @param {string|number} chainId - Chain ID
 * @returns {string} - Native token symbol
 */
export const getNativeTokenSymbol = (chainId) => {
  const config = getChainConfig(chainId);
  return config?.nativeToken || 'Unknown';
};

/**
 * Get chain name from chain ID
 * @param {string|number} chainId - Chain ID
 * @returns {string} - Chain name
 */
export const getChainName = (chainId) => {
  const config = getChainConfig(chainId);
  return config?.name || 'Unknown Chain';
};

/**
 * Check if a chain is a testnet
 * @param {string|number} chainId - Chain ID
 * @returns {boolean} - Whether the chain is a testnet
 */
export const isTestnet = (chainId) => {
  const config = getChainConfig(chainId);
  return config?.isTestnet || false;
};

export default {
  CHAIN_IDS,
  getChainConfig,
  getChainIcon,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getNativeTokenSymbol,
  getChainName,
  isTestnet,
}; 