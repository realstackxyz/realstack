const mongoose = require('mongoose');

/**
 * Asset Token Schema
 * Represents the on-chain token representation of a real-world asset
 */
const assetTokenSchema = new mongoose.Schema({
  // Asset reference
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Asset reference is required']
  },
  
  // Token details
  tokenMint: {
    type: String,
    required: [true, 'Token mint address is required'],
    trim: true,
    unique: true
  },
  tokenSymbol: {
    type: String,
    required: [true, 'Token symbol is required'],
    trim: true,
    maxlength: [10, 'Token symbol cannot exceed 10 characters']
  },
  tokenName: {
    type: String,
    required: [true, 'Token name is required'],
    trim: true,
    maxlength: [100, 'Token name cannot exceed 100 characters']
  },
  
  // Token economics
  totalShares: {
    type: Number,
    required: [true, 'Total shares is required'],
    min: [1, 'Total shares must be at least 1']
  },
  sharePrice: {
    type: Number,
    required: [true, 'Share price is required'],
    min: [0, 'Share price cannot be negative']
  },
  
  // Marketplace details
  isActive: {
    type: Boolean,
    default: true
  },
  isListed: {
    type: Boolean,
    default: true
  },
  
  // Token creation details
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator reference is required']
  },
  transactionSignature: {
    type: String,
    required: [true, 'Transaction signature is required']
  },
  
  // Token URI for metadata
  metadataUri: {
    type: String,
    trim: true
  },
  
  // Liquidity details
  liquidityPool: {
    address: String,
    initialSolAmount: Number,
    initialTokenAmount: Number,
    creationTimestamp: Date
  },
  
  // Token distribution
  distribution: {
    ownerAllocation: {
      type: Number,
      default: 0
    },
    publicAllocation: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    liquidityAllocation: {
      type: Number,
      default: 0
    }
  },
  
  // Income distribution
  incomeSettings: {
    distributionFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'custom'],
      default: 'monthly'
    },
    lastDistribution: Date,
    nextDistribution: Date,
    totalDistributed: {
      type: Number,
      default: 0
    }
  },
  
  // Token governance
  governance: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    minProposalThreshold: {
      type: Number,
      default: 0
    },
    votingPeriod: {
      type: Number,
      default: 3 * 24 * 60 * 60 * 1000 // 3 days in milliseconds
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
assetTokenSchema.index({ tokenMint: 1 }, { unique: true });
assetTokenSchema.index({ asset: 1 }, { unique: true });
assetTokenSchema.index({ isActive: 1, isListed: 1 });
assetTokenSchema.index({ createdAt: -1 });

// Virtual for token holders
assetTokenSchema.virtual('holders', {
  ref: 'TokenHolder',
  localField: '_id',
  foreignField: 'assetToken'
});

// Virtual for token transactions
assetTokenSchema.virtual('transactions', {
  ref: 'TokenTransaction',
  localField: '_id',
  foreignField: 'assetToken'
});

// Method to calculate current market cap
assetTokenSchema.methods.calculateMarketCap = function() {
  return this.totalShares * this.sharePrice;
};

// Method to update share price
assetTokenSchema.methods.updateSharePrice = function(newPrice) {
  this.sharePrice = newPrice;
  return this.save();
};

// Method to disable token
assetTokenSchema.methods.disable = function() {
  this.isActive = false;
  this.isListed = false;
  return this.save();
};

// Create model from schema
const AssetToken = mongoose.model('AssetToken', assetTokenSchema);

module.exports = AssetToken; 