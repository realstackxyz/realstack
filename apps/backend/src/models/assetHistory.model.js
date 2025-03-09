const mongoose = require('mongoose');

/**
 * Asset History Schema
 * Tracks the valuation history of assets over time
 */
const assetHistorySchema = new mongoose.Schema({
  // Asset reference
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: [true, 'Asset reference is required'],
    index: true
  },
  
  // Valuation details
  assetValue: {
    type: Number,
    required: [true, 'Asset value is required'],
    min: [0, 'Asset value cannot be negative']
  },
  
  // Previous value (if this is an update)
  previousValue: {
    type: Number,
    min: [0, 'Previous value cannot be negative']
  },
  
  // Valuation change percentage (calculated)
  changePercentage: {
    type: Number,
    default: 0
  },
  
  // Method used for valuation
  valuationMethod: {
    type: String,
    required: [true, 'Valuation method is required'],
    enum: {
      values: [
        'Initial Submission',
        'Professional Appraisal',
        'Market Analysis',
        'Income Approach',
        'Comparative Method',
        'Manual Update',
        'Verification Update',
        'Automated Valuation',
        'Other'
      ],
      message: 'Please select a valid valuation method'
    }
  },
  
  // Who performed the valuation
  valuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Valuer reference is required']
  },
  
  // Additional information
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // Supporting documents
  documents: [{
    documentType: {
      type: String,
      enum: ['appraisal', 'valuation', 'inspection', 'survey', 'other']
    },
    url: String,
    name: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Verification status
  verified: {
    type: Boolean,
    default: false
  },
  
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  verifiedAt: Date
}, {
  timestamps: true
});

// Pre-save hook to calculate change percentage
assetHistorySchema.pre('save', function(next) {
  if (this.previousValue && this.previousValue > 0) {
    this.changePercentage = ((this.assetValue - this.previousValue) / this.previousValue) * 100;
  }
  next();
});

// Index for faster queries
assetHistorySchema.index({ asset: 1, createdAt: -1 });
assetHistorySchema.index({ valuedBy: 1 });
assetHistorySchema.index({ verified: 1 });

// Virtual for formatted change percentage
assetHistorySchema.virtual('formattedChange').get(function() {
  if (this.changePercentage > 0) {
    return `+${this.changePercentage.toFixed(2)}%`;
  } else {
    return `${this.changePercentage.toFixed(2)}%`;
  }
});

// Create model from schema
const AssetHistory = mongoose.model('AssetHistory', assetHistorySchema);

module.exports = AssetHistory; 