import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

/**
 * Asset Card Image Component
 * Displays the main image and category badge for an asset
 */
const AssetImage = ({ 
  imageUrl, 
  category, 
  altText, 
  placeholderImage = '/assets/images/placeholder-asset.jpg' 
}) => {
  const { t } = useTranslation();
  
  // Use provided image URL or placeholder
  const imageSource = imageUrl || placeholderImage;
  
  // Get category display name
  const getCategoryLabel = (categoryKey) => {
    if (!categoryKey) return '';
    
    // Convert hyphenated format to underscore format
    const normalizedKey = categoryKey.replace(/-/g, '_');
    return t(`market.categories.${normalizedKey}`, { 
      defaultValue: categoryKey.replace(/-/g, ' ').replace(
        /\b\w/g, 
        (match) => match.toUpperCase()
      )
    });
  };
  
  return (
    <Container>
      <Image src={imageSource} alt={altText || t('asset.image.alt')} />
      {category && (
        <CategoryBadge>{getCategoryLabel(category)}</CategoryBadge>
      )}
    </Container>
  );
};

// Styled components
const Container = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden;
  
  &:hover img {
    transform: scale(1.05);
  }
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
`;

const CategoryBadge = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: 30px;
  font-weight: 500;
`;

// PropTypes
AssetImage.propTypes = {
  /** Image URL */
  imageUrl: PropTypes.string,
  /** Asset category */
  category: PropTypes.string,
  /** Image alt text */
  altText: PropTypes.string,
  /** Placeholder image URL */
  placeholderImage: PropTypes.string
};

export default AssetImage; 