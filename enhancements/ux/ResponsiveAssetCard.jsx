import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, shortenAddress } from '../../utils/formatters';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Link } from 'react-router-dom';

/**
 * ResponsiveAssetCard provides an enhanced user experience for displaying 
 * tokenized real estate assets with optimized layouts for both mobile and desktop.
 * 
 * Features:
 * - Responsive design with different layouts for mobile/desktop
 * - Smooth animations and transitions
 * - Loading states and progressive image loading
 * - Interactive elements for improved engagement
 * - Accessibility optimizations
 * - Detailed asset information display
 */

const ResponsiveAssetCard = ({ 
  asset, 
  isFeatured = false,
  showDetailedInfo = true,
  onClick,
  className = '',
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };
  
  // Image error fallback
  const handleImageError = (e) => {
    e.target.src = '/images/asset-placeholder.jpg';
  };
  
  // Calculate returns or relevant metrics
  const calculateROI = () => {
    return ((asset.projectedAnnualIncome / asset.tokenPrice) * 100).toFixed(2);
  };
  
  // Motion variants for animations
  const cardVariants = {
    hover: {
      y: -8,
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
      transition: { duration: 0.3 }
    },
    initial: {
      y: 0,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      transition: { duration: 0.3 }
    }
  };
  
  const imageVariants = {
    hover: { scale: 1.05, transition: { duration: 0.5 } },
    initial: { scale: 1, transition: { duration: 0.5 } }
  };
  
  return (
    <motion.div
      className={`asset-card ${isFeatured ? 'featured' : ''} ${className}`}
      variants={cardVariants}
      initial="initial"
      animate={isHovered ? "hover" : "initial"}
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      <Link 
        to={`/asset/${asset.id}`}
        className="asset-card-link"
        aria-label={`View details for ${asset.name}`}
      >
        <div className="asset-card-media">
          {!isImageLoaded && (
            <div className="asset-card-skeleton" aria-hidden="true">
              <div className="skeleton-pulse"></div>
            </div>
          )}
          
          <motion.div 
            className="asset-card-image-container"
            variants={imageVariants}
            style={{ opacity: isImageLoaded ? 1 : 0 }}
          >
            <img
              src={asset.imageUrl}
              alt={asset.name}
              className="asset-card-image"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          </motion.div>
          
          {asset.tokensSold / asset.totalTokens >= 0.8 && (
            <div className="asset-tag high-demand">High Demand</div>
          )}
          
          {asset.isNew && (
            <div className="asset-tag new">New</div>
          )}
        </div>
        
        <div className="asset-card-content">
          <div className="asset-card-header">
            <h3 className="asset-title">{asset.name}</h3>
            <p className="asset-location">
              <span className="location-icon" aria-hidden="true">📍</span>
              {asset.location}
            </p>
          </div>
          
          {showDetailedInfo && (
            <div className="asset-card-details">
              <div className="asset-detail">
                <span className="detail-label">Price</span>
                <span className="detail-value">{formatCurrency(asset.tokenPrice)}</span>
              </div>
              
              <div className="asset-detail">
                <span className="detail-label">Est. ROI</span>
                <span className="detail-value highlight">{calculateROI()}%</span>
              </div>
              
              <div className="asset-detail">
                <span className="detail-label">Type</span>
                <span className="detail-value">{asset.propertyType}</span>
              </div>
              
              <div className="asset-detail">
                <span className="detail-label">Size</span>
                <span className="detail-value">{asset.propertySize} sqft</span>
              </div>
            </div>
          )}
          
          <div className="asset-card-progress">
            <div 
              className="progress-bar" 
              style={{ 
                '--progress': `${(asset.tokensSold / asset.totalTokens) * 100}%` 
              }}
              role="progressbar"
              aria-valuenow={(asset.tokensSold / asset.totalTokens) * 100}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span className="visually-hidden">
                {Math.round((asset.tokensSold / asset.totalTokens) * 100)}% funded
              </span>
            </div>
            <div className="progress-label">
              {Math.round((asset.tokensSold / asset.totalTokens) * 100)}% funded
            </div>
          </div>
          
          <div className="asset-card-footer">
            <div className="asset-owner">
              <img 
                src={asset.ownerAvatar || '/images/default-avatar.png'} 
                alt="" 
                className="owner-avatar"
              />
              <span className="owner-address" title={asset.ownerAddress}>
                {shortenAddress(asset.ownerAddress)}
              </span>
            </div>
            
            <button 
              className="view-details-button"
              aria-label="View asset details"
            >
              View Details
            </button>
          </div>
        </div>
      </Link>
      
      <style jsx>{`
        .asset-card {
          border-radius: 12px;
          overflow: hidden;
          background-color: white;
          width: 100%;
          max-width: ${isMobile ? '100%' : '360px'};
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .asset-card.featured {
          border: 2px solid #3498db;
        }
        
        .asset-card-link {
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .asset-card-media {
          position: relative;
          padding-top: 56.25%; /* 16:9 aspect ratio */
          overflow: hidden;
        }
        
        .asset-card-skeleton {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .skeleton-pulse {
          width: 40%;
          height: 40%;
          border-radius: 50%;
          background: linear-gradient(90deg, #f0f0f0, #e0e0e0, #f0f0f0);
          background-size: 200% 100%;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .asset-card-image-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .asset-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        
        .asset-tag {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: white;
        }
        
        .asset-tag.high-demand {
          background-color: #e74c3c;
        }
        
        .asset-tag.new {
          background-color: #2ecc71;
          right: ${asset.tokensSold / asset.totalTokens >= 0.8 ? '110px' : '12px'};
        }
        
        .asset-card-content {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .asset-card-header {
          margin-bottom: 12px;
        }
        
        .asset-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .asset-location {
          font-size: 14px;
          color: #666;
          display: flex;
          align-items: center;
          margin: 0;
        }
        
        .location-icon {
          margin-right: 4px;
          font-size: 12px;
        }
        
        .asset-card-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .asset-detail {
          display: flex;
          flex-direction: column;
        }
        
        .detail-label {
          font-size: 12px;
          color: #888;
        }
        
        .detail-value {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        
        .detail-value.highlight {
          color: #27ae60;
        }
        
        .asset-card-progress {
          margin-bottom: 16px;
        }
        
        .progress-bar {
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        
        .progress-bar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: var(--progress);
          background-color: #3498db;
          border-radius: 4px;
        }
        
        .progress-label {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
          text-align: right;
        }
        
        .asset-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #f0f0f0;
        }
        
        .asset-owner {
          display: flex;
          align-items: center;
        }
        
        .owner-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          margin-right: 8px;
        }
        
        .owner-address {
          font-size: 14px;
          color: #666;
        }
        
        .view-details-button {
          background-color: transparent;
          color: #3498db;
          border: 1px solid #3498db;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .view-details-button:hover {
          background-color: #3498db;
          color: white;
        }
        
        .visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .asset-card {
            max-width: 100%;
          }
          
          .asset-card-details {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .asset-title {
            font-size: 16px;
          }
          
          .detail-label {
            font-size: 11px;
          }
          
          .detail-value {
            font-size: 13px;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default ResponsiveAssetCard; 