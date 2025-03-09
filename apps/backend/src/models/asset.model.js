const mongoose = require('mongoose');

// Verification schema as a subdocument
const verificationSchema = new mongoose.Schema({
  verifier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['physical', 'document', 'third-party', 'legal', 'other']
  },
  details: {
    type: String,
    required: true
  },
  documents: [{
    type: String // URL or file path to verification documents
  }],
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const assetSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
    maxlength: [100, 'Asset name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Asset description is required'],
    maxlength: [2000, 'Asset description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Asset category is required'],
    enum: {
      values: ['real-estate', 'collectible', 'business', 'vehicle', 'art', 'intellectual-property', 'other'],
      message: 'Please select a valid category'
    }
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Location (for physical assets)
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    }
  },
  
  // Financial Information
  assetValue: {
    type: Number,
    required: [true, 'Asset value is required'],
    min: [0, 'Asset value cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SOL']
  },
  
  // Ownership Information
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Asset owner is required']
  },
  ownership: {
    type: {
      type: String,
      enum: ['individual', 'joint', 'corporate', 'trust', 'other'],
      default: 'individual'
    },
    details: String
  },
  
  // Asset Status
  status: {
    type: String,
    enum: {
      values: ['pending', 'verified', 'rejected', 'tokenized', 'delisted'],
      message: 'Please select a valid status'
    },
    default: 'pending'
  },
  
  // Media and Documentation
  images: [{
    type: String,
    validate: {
      validator: function(url) {
        // Basic URL validation
        return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(url);
      },
      message: prop => `${prop.value} is not a valid URL`
    }
  }],
  documents: [{
    type: {
      type: String,
      enum: ['title', 'deed', 'certificate', 'valuation', 'inspection', 'other'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    description: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Verification Information
  verifications: [verificationSchema],
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Tokenization Information
  tokenized: {
    type: Boolean,
    default: false
  },
  tokenizedAt: Date,
  
  // Time tracking
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for token
assetSchema.virtual('token', {
  ref: 'AssetToken',
  localField: '_id',
  foreignField: 'asset',
  justOne: true
});

// Index for faster querying
assetSchema.index({ name: 'text', description: 'text' });
assetSchema.index({ category: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ 'location.country': 1, 'location.state': 1, 'location.city': 1 });
assetSchema.index({ tokenized: 1 });

// Add text search capabilities
assetSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  subcategory: 'text',
  'location.city': 'text',
  'location.country': 'text'
});

const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset; 