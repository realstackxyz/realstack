/**
 * Configuration constants for the RealStack frontend application
 */

// API Configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Solana Network Configuration
export const SOLANA_NETWORK = process.env.REACT_APP_SOLANA_NETWORK || 'devnet';
export const SOLANA_RPC_URL = 
  SOLANA_NETWORK === 'mainnet-beta' 
    ? 'https://api.mainnet-beta.solana.com'
    : SOLANA_NETWORK === 'testnet'
    ? 'https://api.testnet.solana.com'
    : 'https://api.devnet.solana.com';

// Token Configuration
export const REAL_TOKEN_ADDRESS = process.env.REACT_APP_REAL_TOKEN_ADDRESS || '';
export const REAL_TOKEN_DECIMALS = 9;

// Asset Categories
export const ASSET_CATEGORIES = [
  {
    id: 'real-estate',
    name: 'Real Estate',
    icon: 'building',
    description: 'Commercial properties, residential units, and land investments'
  },
  {
    id: 'business',
    name: 'Business',
    icon: 'briefcase',
    description: 'Small business equity, revenue shares, and franchise opportunities'
  },
  {
    id: 'collectible',
    name: 'Collectibles',
    icon: 'gem',
    description: 'High-value art, rare items, and premium collectibles'
  },
  {
    id: 'vehicle',
    name: 'Vehicles',
    icon: 'car',
    description: 'Exotic cars, boats, and other high-value vehicles'
  },
  {
    id: 'art',
    name: 'Art',
    icon: 'palette',
    description: 'Fine art, sculptures, and premium artistic creations'
  },
  {
    id: 'intellectual-property',
    name: 'Intellectual Property',
    icon: 'lightbulb',
    description: 'Patents, copyrights, licenses, and royalty streams'
  }
];

// Asset Status Labels
export const ASSET_STATUS = {
  'pending': {
    label: 'Pending',
    color: '#faad14',
    backgroundColor: '#fff7e6'
  },
  'verified': {
    label: 'Verified',
    color: '#52c41a',
    backgroundColor: '#e6f9e6'
  },
  'rejected': {
    label: 'Rejected',
    color: '#f5222d',
    backgroundColor: '#fff1f0'
  },
  'tokenized': {
    label: 'Tokenized',
    color: '#0070f3',
    backgroundColor: '#e6f7ff'
  },
  'delisted': {
    label: 'Delisted',
    color: '#722ed1',
    backgroundColor: '#f9f0ff'
  }
};

// Pagination Settings
export const DEFAULT_PAGE_SIZE = 12;
export const PAGE_SIZE_OPTIONS = [12, 24, 48];

// Feature Flags
export const FEATURES = {
  governance: true,
  marketplace: true,
  assetCreation: false, // Only available to admins
  analytics: true
};

// Date Format Options
export const DATE_FORMAT = {
  standard: 'MM/DD/YYYY',
  detailed: 'MMM DD, YYYY'
};

// Contact Information
export const CONTACT_INFO = {
  email: 'info@realstack.finance',
  twitter: '@RealStack_Finance',
  discord: 'https://discord.gg/realstack'
};

// Support Links
export const SUPPORT_LINKS = {
  documentation: '/docs',
  faq: '/faq',
  support: '/support',
  terms: '/terms',
  privacy: '/privacy'
}; 