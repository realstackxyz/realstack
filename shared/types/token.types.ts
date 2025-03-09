/**
 * Type definitions for token-related data structures
 */

export interface TokenInfo {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
  logo?: string;
  description?: string;
  isActive: boolean;
}

export interface TokenBalance {
  mint: string;
  owner: string;
  balance: number;
  decimals: number;
}

export interface TokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  delegate?: string;
  delegatedAmount?: number;
  isNative?: boolean;
  isInitialized: boolean;
}

export interface TokenDistribution {
  communityAllocation: number;
  assetReserveAllocation: number;
  developmentAllocation: number;
  liquidityAllocation: number;
  teamAllocation: number;
}

export interface TokenTransaction {
  signature: string;
  blockTime: number;
  slot: number;
  fee: number;
  status: 'confirmed' | 'finalized' | 'failed';
  confirmations: number;
  source: string;
  destination: string;
  amount: number;
  mint: string;
  type: 'transfer' | 'mint' | 'burn' | 'swap' | 'other';
}

export enum StakingPeriod {
  THIRTY_DAYS = '30days',
  NINETY_DAYS = '90days',
  ONE_EIGHTY_DAYS = '180days',
  THREE_SIXTY_FIVE_DAYS = '365days'
}

export interface StakingOption {
  id: string;
  period: StakingPeriod;
  apy: number;
  minAmount: number;
  maxAmount?: number;
  earlyWithdrawalPenalty: number;
  isActive: boolean;
}

export interface StakingPosition {
  id: string;
  user: string;
  stakingOptionId: string;
  amount: number;
  startDate: Date;
  endDate: Date;
  accruedRewards: number;
  status: 'active' | 'completed' | 'withdrawn';
  transactions: {
    stake?: string;
    unstake?: string;
    reward?: string[];
  };
}

export interface VestingSchedule {
  id: string;
  recipient: string;
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  vestingType: 'linear' | 'cliff' | 'hybrid';
  cliffPeriod?: number;
  cliffAmount?: number;
  releaseFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  released: number;
  remaining: number;
  nextReleaseDate?: Date;
  nextReleaseAmount?: number;
}

export interface FeeConfig {
  transactionFeeBps: number;
  feeRecipient: string;
  feesEnabled: boolean;
}

export interface TokenMetrics {
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  fullyDilutedMarketCap?: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  holders: number;
}

export interface TokenPair {
  pairAddress: string;
  baseToken: {
    mint: string;
    symbol: string;
  };
  quoteToken: {
    mint: string;
    symbol: string;
  };
  liquidity: number;
  volume24h: number;
  fee: number;
}

export interface TokenSwap {
  id: string;
  user: string;
  inputToken: {
    mint: string;
    symbol: string;
    amount: number;
  };
  outputToken: {
    mint: string;
    symbol: string;
    amount: number;
  };
  exchangeRate: number;
  fee: number;
  timestamp: Date;
  transactionSignature: string;
  status: 'pending' | 'completed' | 'failed';
} 