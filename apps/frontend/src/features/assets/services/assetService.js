import apiService from '../../../shared/services/api';

/**
 * Asset Service
 * Handles all API requests related to assets
 */
class AssetService {
  /**
   * Get list of assets
   * @param {Object} filters - Filter conditions
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise} - Assets list and pagination info
   */
  async getAssets(filters = {}, page = 1, limit = 12) {
    const params = {
      page,
      limit,
      ...filters
    };
    return apiService.get('/api/assets', params);
  }

  /**
   * Get asset details
   * @param {string} id - Asset ID
   * @returns {Promise} - Asset details
   */
  async getAssetById(id) {
    return apiService.get(`/api/assets/${id}`);
  }

  /**
   * Get asset categories
   * @returns {Promise} - Asset categories list
   */
  async getAssetCategories() {
    return apiService.get('/api/assets/categories');
  }

  /**
   * Create new asset
   * @param {Object} assetData - Asset data
   * @returns {Promise} - Created asset
   */
  async createAsset(assetData) {
    return apiService.post('/api/assets', assetData);
  }

  /**
   * Update asset
   * @param {string} id - Asset ID
   * @param {Object} assetData - Asset data
   * @returns {Promise} - Updated asset
   */
  async updateAsset(id, assetData) {
    return apiService.put(`/api/assets/${id}`, assetData);
  }

  /**
   * Delete asset
   * @param {string} id - Asset ID
   * @returns {Promise} - Delete result
   */
  async deleteAsset(id) {
    return apiService.delete(`/api/assets/${id}`);
  }

  /**
   * Upload asset image
   * @param {string} assetId - Asset ID
   * @param {File} imageFile - Image file
   * @returns {Promise} - Upload result
   */
  async uploadAssetImage(assetId, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return apiService.post(`/api/assets/${assetId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Get featured assets
   * @param {number} limit - Limit count
   * @returns {Promise} - Featured assets list
   */
  async getFeaturedAssets(limit = 6) {
    return apiService.get('/api/assets/featured', { limit });
  }

  /**
   * Purchase asset tokens
   * @param {string} assetId - Asset ID
   * @param {number} tokenAmount - Purchase amount
   * @returns {Promise} - Purchase result
   */
  async purchaseAssetTokens(assetId, tokenAmount) {
    return apiService.post(`/api/assets/${assetId}/purchase`, { tokenAmount });
  }
}

// Create asset service instance
const assetService = new AssetService();

export default assetService; 