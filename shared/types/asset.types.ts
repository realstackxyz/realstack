/**
 * Type definitions for asset-related data structures
 */

export enum AssetCategory {
  REAL_ESTATE = 'real-estate',
  ART = 'art',
  COLLECTIBLE = 'collectible',
  VEHICLE = 'vehicle',
  BUSINESS = 'business',
  INTELLECTUAL_PROPERTY = 'intellectual-property',
  COMMODITY = 'commodity',
  OTHER = 'other'
}

export enum AssetStatus {
  PENDING = 'pending',
  VERIFYING = 'verifying',
  VERIFIED = 'verified',
  TOKENIZING = 'tokenizing', 
  TOKENIZED = 'tokenized',
  REJECTED = 'rejected',
  DELISTED = 'delisted'
}

export enum AssetVerificationStatus {
  NOT_STARTED = 'not-started',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  NEEDS_UPDATE = 'needs-update'
}

export interface Location {
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  }
}

export interface AssetDocument {
  id: string;
  type: string;
  name: string;
  description?: string;
  url: string;
  mimeType: string;
  size: number;
  isPublic: boolean;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface AssetVerification {
  id: string;
  verifier: {
    id: string;
    name: string;
    credentials?: string;
  };
  method: 'physical' | 'digital' | 'documentary';
  details: string;
  date: Date;
  expiresAt?: Date;
  attachments?: string[];
}

export interface AssetOwner {
  id: string;
  name: string;
  type: 'individual' | 'entity';
  walletAddress?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}

export interface AssetValuation {
  id: string;
  value: number;
  currency: string;
  date: Date;
  method: string;
  appraiser?: {
    id: string;
    name: string;
    credentials?: string;
  };
  documents?: string[];
  notes?: string;
}

export interface Asset {
  id: string;
  name: string;
  description: string;
  category: AssetCategory;
  subcategory?: string;
  status: AssetStatus;
  assetValue: number;
  currency: string;
  location?: Location;
  owner: AssetOwner;
  images: string[];
  documents: AssetDocument[];
  verifications: AssetVerification[];
  valuations: AssetValuation[];
  verificationStatus: AssetVerificationStatus;
  tokenized: boolean;
  tokenizedAt?: Date;
  incomeGenerating: boolean;
  incomeFrequency?: 'monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'irregular';
  expectedYield?: number;
  customAttributes?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetToken {
  id: string;
  asset: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  totalShares: number;
  sharePrice: number;
  isActive: boolean;
  isListed: boolean;
  distribution?: {
    ownerAllocation: number;
    publicAllocation: number;
    platformFee: number;
    liquidityAllocation: number;
  };
  liquidityPool?: {
    address: string;
    initialSolAmount: number;
    initialTokenAmount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetIncomeDistribution {
  id: string;
  asset: string;
  assetToken: string;
  amount: number;
  currency: string;
  distributionDate: Date;
  recordDate: Date;
  payoutDate: Date;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  transactionSignature?: string;
  notes?: string;
}

export interface AssetTransaction {
  id: string;
  type: 'buy' | 'sell' | 'income' | 'fee' | 'other';
  assetId: string;
  assetName: string;
  shares: number;
  amount: number;
  price: number;
  currency: string;
  buyer?: string;
  seller?: string;
  timestamp: Date;
  txSignature: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface AssetSearchParams {
  category?: AssetCategory | AssetCategory[];
  status?: AssetStatus | AssetStatus[];
  minValue?: number;
  maxValue?: number;
  country?: string;
  tokenized?: boolean;
  incomeGenerating?: boolean;
  minYield?: number;
  keyword?: string;
  sortBy?: 'value' | 'date' | 'name' | 'yield';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface AssetPortfolio {
  totalValue: number;
  realBalance: number;
  assetHoldings: {
    id: string;
    name: string;
    category: AssetCategory;
    shares: number;
    sharePrice: number;
    value: number;
    purchaseDate: Date;
  }[];
  transactions: AssetTransaction[];
} 