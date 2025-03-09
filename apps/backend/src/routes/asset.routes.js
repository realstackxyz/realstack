const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validationMiddleware = require('../middleware/validation.middleware');

/**
 * @route GET /api/assets
 * @description Get all assets with pagination
 * @access Public
 */
router.get('/', assetController.getAllAssets);

/**
 * @route GET /api/assets/:id
 * @description Get asset by ID
 * @access Public
 */
router.get('/:id', assetController.getAssetById);

/**
 * @route POST /api/assets
 * @description Create a new asset
 * @access Private
 */
router.post(
  '/',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin', 'asset_manager'),
  validationMiddleware.validateAssetCreation,
  assetController.createAsset
);

/**
 * @route PUT /api/assets/:id
 * @description Update an existing asset
 * @access Private
 */
router.put(
  '/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin', 'asset_manager'),
  validationMiddleware.validateAssetUpdate,
  assetController.updateAsset
);

/**
 * @route DELETE /api/assets/:id
 * @description Delete an asset
 * @access Private
 */
router.delete(
  '/:id',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  assetController.deleteAsset
);

/**
 * @route GET /api/assets/categories/:category
 * @description Get assets by category
 * @access Public
 */
router.get('/categories/:category', assetController.getAssetsByCategory);

/**
 * @route GET /api/assets/search
 * @description Search assets by query parameters
 * @access Public
 */
router.get('/search', assetController.searchAssets);

/**
 * @route POST /api/assets/:id/verify
 * @description Verify an asset
 * @access Private
 */
router.post(
  '/:id/verify',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin', 'verifier'),
  assetController.verifyAsset
);

/**
 * @route GET /api/assets/:id/history
 * @description Get asset valuation history
 * @access Public
 */
router.get('/:id/history', assetController.getAssetHistory);

/**
 * @route POST /api/assets/:id/tokenize
 * @description Tokenize an asset
 * @access Private
 */
router.post(
  '/:id/tokenize',
  authMiddleware.protect,
  authMiddleware.restrictTo('admin', 'asset_manager'),
  validationMiddleware.validateAssetTokenization,
  assetController.tokenizeAsset
);

/**
 * @route GET /api/assets/:id/token
 * @description Get tokenization details of an asset
 * @access Public
 */
router.get('/:id/token', assetController.getAssetTokenDetails);

module.exports = router; 