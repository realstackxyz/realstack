const Asset = require('../models/asset.model');
const AssetHistory = require('../models/assetHistory.model');
const AssetToken = require('../models/assetToken.model');
const solanaService = require('../services/solana.service');
const errorHandler = require('../utils/errorHandler');

/**
 * Get all assets with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getAllAssets = async (req, res, next) => {
  try {
    // Pagination settings
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.minValue) filter.assetValue = { $gte: parseFloat(req.query.minValue) };
    if (req.query.maxValue) {
      filter.assetValue = filter.assetValue || {};
      filter.assetValue.$lte = parseFloat(req.query.maxValue);
    }

    // Execute query
    const assets = await Asset.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Asset.countDocuments(filter);

    // Send response
    res.status(200).json({
      status: 'success',
      results: assets.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total
      },
      data: {
        assets
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to fetch assets', 500, error));
  }
};

/**
 * Get asset by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('verifications')
      .populate('owner', 'name email');

    if (!asset) {
      return next(errorHandler.createError('Asset not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        asset
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to fetch asset', 500, error));
  }
};

/**
 * Create a new asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.createAsset = async (req, res, next) => {
  try {
    // Set the owner to current user if not provided
    if (!req.body.owner) {
      req.body.owner = req.user.id;
    }

    // Create new asset
    const asset = await Asset.create(req.body);

    // Create initial asset history entry
    await AssetHistory.create({
      asset: asset._id,
      assetValue: asset.assetValue,
      valuationMethod: req.body.valuationMethod || 'Initial Submission',
      valuedBy: req.user.id
    });

    res.status(201).json({
      status: 'success',
      data: {
        asset
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to create asset', 500, error));
  }
};

/**
 * Update an existing asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.updateAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return next(errorHandler.createError('Asset not found', 404));
    }

    // Check if asset value is being updated
    const isValueUpdated = req.body.assetValue && 
      req.body.assetValue !== asset.assetValue;

    // Update asset
    const updatedAsset = await Asset.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Create asset history entry if value changed
    if (isValueUpdated) {
      await AssetHistory.create({
        asset: updatedAsset._id,
        assetValue: updatedAsset.assetValue,
        previousValue: asset.assetValue,
        valuationMethod: req.body.valuationMethod || 'Manual Update',
        valuedBy: req.user.id,
        notes: req.body.valuationNotes
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        asset: updatedAsset
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to update asset', 500, error));
  }
};

/**
 * Delete an asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.deleteAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return next(errorHandler.createError('Asset not found', 404));
    }

    // Check if asset is tokenized
    const assetToken = await AssetToken.findOne({ asset: req.params.id });
    if (assetToken && assetToken.isActive) {
      return next(errorHandler.createError('Cannot delete tokenized asset', 400));
    }

    // Delete asset history
    await AssetHistory.deleteMany({ asset: req.params.id });
    
    // Delete asset token if exists but not active
    if (assetToken) {
      await AssetToken.findByIdAndDelete(assetToken._id);
    }

    // Delete asset
    await Asset.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(errorHandler.createError('Failed to delete asset', 500, error));
  }
};

/**
 * Get assets by category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getAssetsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const assets = await Asset.find({ category });

    res.status(200).json({
      status: 'success',
      results: assets.length,
      data: {
        assets
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to fetch assets by category', 500, error));
  }
};

/**
 * Search assets by query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.searchAssets = async (req, res, next) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(field => delete queryObj[field]);

    // Text search
    if (queryObj.search) {
      queryObj.$text = { $search: queryObj.search };
      delete queryObj.search;
    }

    // Value range
    if (queryObj.minValue || queryObj.maxValue) {
      queryObj.assetValue = {};
      if (queryObj.minValue) {
        queryObj.assetValue.$gte = parseFloat(queryObj.minValue);
        delete queryObj.minValue;
      }
      if (queryObj.maxValue) {
        queryObj.assetValue.$lte = parseFloat(queryObj.maxValue);
        delete queryObj.maxValue;
      }
    }

    // Execute query
    let query = Asset.find(queryObj);

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    // Execute query
    const assets = await query;
    const total = await Asset.countDocuments(queryObj);

    res.status(200).json({
      status: 'success',
      results: assets.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total
      },
      data: {
        assets
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to search assets', 500, error));
  }
};

/**
 * Verify an asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.verifyAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return next(errorHandler.createError('Asset not found', 404));
    }

    // Update asset with verification data
    asset.status = 'verified';
    asset.verifiedAt = Date.now();
    asset.verifiedBy = req.user.id;
    
    // Add verification details
    asset.verifications.push({
      verifier: req.user.id,
      method: req.body.verificationMethod,
      details: req.body.verificationDetails,
      documents: req.body.verificationDocuments,
      date: Date.now()
    });

    // If value updated during verification
    if (req.body.updatedValue && req.body.updatedValue !== asset.assetValue) {
      const oldValue = asset.assetValue;
      asset.assetValue = req.body.updatedValue;
      
      // Create asset history entry
      await AssetHistory.create({
        asset: asset._id,
        assetValue: asset.assetValue,
        previousValue: oldValue,
        valuationMethod: 'Verification Update',
        valuedBy: req.user.id,
        notes: req.body.valuationNotes
      });
    }

    await asset.save();

    res.status(200).json({
      status: 'success',
      data: {
        asset
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to verify asset', 500, error));
  }
};

/**
 * Get asset valuation history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getAssetHistory = async (req, res, next) => {
  try {
    const history = await AssetHistory.find({ asset: req.params.id })
      .sort({ createdAt: -1 })
      .populate('valuedBy', 'name email');

    res.status(200).json({
      status: 'success',
      results: history.length,
      data: {
        history
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to fetch asset history', 500, error));
  }
};

/**
 * Tokenize an asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.tokenizeAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id);
    
    if (!asset) {
      return next(errorHandler.createError('Asset not found', 404));
    }

    // Check if asset is already tokenized
    const existingToken = await AssetToken.findOne({ asset: req.params.id, isActive: true });
    if (existingToken) {
      return next(errorHandler.createError('Asset is already tokenized', 400));
    }

    // Check if asset is verified
    if (asset.status !== 'verified') {
      return next(errorHandler.createError('Asset must be verified before tokenization', 400));
    }

    // Create token on Solana blockchain
    const tokenResult = await solanaService.createAssetToken(
      asset,
      req.body.totalShares,
      req.body.tokenSymbol || `${asset.name.substring(0, 3).toUpperCase()}_TKN`,
      req.body.tokenName || `${asset.name} Token`
    );

    // Create asset token record
    const assetToken = await AssetToken.create({
      asset: asset._id,
      tokenMint: tokenResult.tokenMint,
      tokenSymbol: tokenResult.tokenSymbol,
      tokenName: tokenResult.tokenName,
      totalShares: tokenResult.totalShares,
      sharePrice: asset.assetValue / tokenResult.totalShares,
      isActive: true,
      createdBy: req.user.id,
      transactionSignature: tokenResult.transactionSignature
    });

    // Update asset status
    asset.status = 'tokenized';
    asset.tokenized = true;
    asset.tokenizedAt = Date.now();
    await asset.save();

    res.status(201).json({
      status: 'success',
      data: {
        assetToken,
        transaction: tokenResult.transactionSignature
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to tokenize asset', 500, error));
  }
};

/**
 * Get tokenization details of an asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getAssetTokenDetails = async (req, res, next) => {
  try {
    const assetToken = await AssetToken.findOne({ 
      asset: req.params.id,
      isActive: true
    }).populate('asset');

    if (!assetToken) {
      return next(errorHandler.createError('Asset is not tokenized or token is inactive', 404));
    }

    // Get additional data from Solana blockchain
    const tokenData = await solanaService.getTokenData(assetToken.tokenMint);

    res.status(200).json({
      status: 'success',
      data: {
        assetToken,
        onChainData: tokenData
      }
    });
  } catch (error) {
    next(errorHandler.createError('Failed to fetch asset token details', 500, error));
  }
}; 