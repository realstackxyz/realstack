/**
 * Global constants used across the RealStack platform
 */

// Environment
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_DEVELOPMENT = NODE_ENV === 'development';
const IS_TEST = NODE_ENV === 'test';

// API Configuration
const API_VERSION = 'v1';
const API_BASE_URL = IS_PRODUCTION 
  ? 'https://api.realstack.xyz' 
  : IS_DEVELOPMENT 
    ? 'http://localhost:3001' 
    : 'http://localhost:3001';

// Frontend Configuration
const FRONTEND_URL = IS_PRODUCTION 
  ? 'https://realstack.xyz' 
  : 'http://localhost:3000';

// Blockchain Configuration
const SOLANA_NETWORKS = {
  MAINNET: 'mainnet-beta',
  DEVNET: 'devnet',
  TESTNET: 'testnet',
  LOCALNET: 'localnet'
};

const SOLANA_CLUSTER_URLS = {
  [SOLANA_NETWORKS.MAINNET]: 'https://api.mainnet-beta.solana.com',
  [SOLANA_NETWORKS.DEVNET]: 'https://api.devnet.solana.com',
  [SOLANA_NETWORKS.TESTNET]: 'https://api.testnet.solana.com',
  [SOLANA_NETWORKS.LOCALNET]: 'http://localhost:8899'
};

const DEFAULT_SOLANA_NETWORK = IS_PRODUCTION 
  ? SOLANA_NETWORKS.MAINNET 
  : SOLANA_NETWORKS.DEVNET;

// Token Configuration
const TOKEN_DECIMALS = 9;
const MAX_TOKEN_SUPPLY = 100_000_000 * (10 ** TOKEN_DECIMALS);
const TRANSACTION_FEE_BPS = 25; // 0.25%
const MIN_TRANSACTION_AMOUNT = 0.000001;

// Asset Configuration
const ASSET_CATEGORIES = [
  { id: 'real-estate', name: 'Real Estate' },
  { id: 'art', name: 'Art' },
  { id: 'collectible', name: 'Collectible' },
  { id: 'vehicle', name: 'Vehicle' },
  { id: 'business', name: 'Business' },
  { id: 'intellectual-property', name: 'Intellectual Property' },
  { id: 'commodity', name: 'Commodity' },
  { id: 'other', name: 'Other' }
];

const ASSET_STATUSES = {
  PENDING: 'pending',
  VERIFYING: 'verifying',
  VERIFIED: 'verified',
  TOKENIZING: 'tokenizing',
  TOKENIZED: 'tokenized',
  REJECTED: 'rejected',
  DELISTED: 'delisted'
};

// Governance Configuration
const MIN_PROPOSAL_TOKENS = 10000;
const PROPOSAL_DISCUSSION_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const PROPOSAL_VOTING_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const PROPOSAL_EXECUTION_DELAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const EMERGENCY_PROPOSAL_VOTING_PERIOD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Authentication
const JWT_EXPIRATION = '1d';
const REFRESH_TOKEN_EXPIRATION = '7d';
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Pagination
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// File Upload
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Rate Limiting
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

// Cache Configuration
const CACHE_TTL = 60 * 5; // 5 minutes in seconds

// Error Messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action',
  INVALID_CREDENTIALS: 'Invalid username or password',
  RESOURCE_NOT_FOUND: 'The requested resource was not found',
  VALIDATION_ERROR: 'Validation error occurred',
  SERVER_ERROR: 'Internal server error occurred',
  ASSET_NOT_FOUND: 'The requested asset was not found',
  TOKEN_NOT_FOUND: 'The requested token was not found',
  INSUFFICIENT_FUNDS: 'Insufficient funds for this operation',
  BLOCKCHAIN_ERROR: 'Blockchain transaction error occurred'
};

module.exports = {
  NODE_ENV,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
  IS_TEST,
  API_VERSION,
  API_BASE_URL,
  FRONTEND_URL,
  SOLANA_NETWORKS,
  SOLANA_CLUSTER_URLS,
  DEFAULT_SOLANA_NETWORK,
  TOKEN_DECIMALS,
  MAX_TOKEN_SUPPLY,
  TRANSACTION_FEE_BPS,
  MIN_TRANSACTION_AMOUNT,
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  MIN_PROPOSAL_TOKENS,
  PROPOSAL_DISCUSSION_PERIOD,
  PROPOSAL_VOTING_PERIOD,
  PROPOSAL_EXECUTION_DELAY,
  EMERGENCY_PROPOSAL_VOTING_PERIOD,
  JWT_EXPIRATION,
  REFRESH_TOKEN_EXPIRATION,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  CACHE_TTL,
  ERROR_MESSAGES
}; 