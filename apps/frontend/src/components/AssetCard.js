import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { formatCurrency } from '../utils/formatting';

const AssetCard = ({ asset, isConnected }) => {
  // Fallback image if asset has no images
  const assetImage = asset.images && asset.images.length > 0
    ? asset.images[0]
    : '/assets/images/placeholder-asset.jpg';
  
  // Format asset value based on currency
  const formattedValue = formatCurrency(asset.assetValue, asset.currency);
  
  // Calculate price per token if asset is tokenized and has token data
  const pricePerToken = asset.token 
    ? formatCurrency(asset.token.sharePrice, asset.currency)
    : null;

  return (
    <CardContainer to={`/assets/${asset._id}`}>
      <ImageContainer>
        <img src={assetImage} alt={asset.name} />
        <CategoryBadge>{getCategoryLabel(asset.category)}</CategoryBadge>
      </ImageContainer>
      
      <CardContent>
        <AssetName>{asset.name}</AssetName>
        <Location>
          {asset.location && (
            <>
              {asset.location.city}{asset.location.state ? `, ${asset.location.state}` : ''}
              {asset.location.country && ` • ${asset.location.country}`}
            </>
          )}
        </Location>
        
        <ValueSection>
          <TotalValue>
            <Label>Asset Value</Label>
            <Value>{formattedValue}</Value>
          </TotalValue>
          
          {asset.tokenized && pricePerToken && (
            <TokenValue>
              <Label>Price Per Token</Label>
              <Value>{pricePerToken}</Value>
            </TokenValue>
          )}
        </ValueSection>
        
        <TagsSection>
          <StatusTag status={asset.status}>
            {getStatusLabel(asset.status)}
          </StatusTag>
          
          {asset.subcategory && (
            <Tag>{asset.subcategory}</Tag>
          )}
        </TagsSection>
      </CardContent>
      
      <CardFooter>
        <ViewButton>View Details</ViewButton>
        
        {asset.tokenized && isConnected && (
          <BuyButton>Invest Now</BuyButton>
        )}
      </CardFooter>
    </CardContainer>
  );
};

// Helper functions
const getCategoryLabel = (category) => {
  const labels = {
    'real-estate': 'Real Estate',
    'collectible': 'Collectible',
    'business': 'Business',
    'vehicle': 'Vehicle',
    'art': 'Art',
    'intellectual-property': 'IP',
    'other': 'Other'
  };
  
  return labels[category] || category;
};

const getStatusLabel = (status) => {
  const labels = {
    'pending': 'Pending',
    'verified': 'Verified',
    'rejected': 'Rejected',
    'tokenized': 'Tokenized',
    'delisted': 'Delisted'
  };
  
  return labels[status] || status;
};

// Styled Components
const CardContainer = styled(Link)`
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  text-decoration: none;
  color: inherit;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  height: 200px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }
  
  ${CardContainer}:hover img {
    transform: scale(1.05);
  }
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

const CardContent = styled.div`
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const AssetName = styled.h3`
  font-size: 1.1rem;
  margin: 0 0 0.25rem 0;
  color: #333;
  font-weight: 600;
`;

const Location = styled.p`
  font-size: 0.85rem;
  color: #666;
  margin: 0 0 1rem 0;
`;

const ValueSection = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const TotalValue = styled.div`
  flex: 1;
`;

const TokenValue = styled.div`
  flex: 1;
  text-align: right;
`;

const Label = styled.div`
  font-size: 0.75rem;
  color: #777;
  margin-bottom: 0.25rem;
`;

const Value = styled.div`
  font-weight: 600;
  color: #333;
  font-size: 1rem;
`;

const TagsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
`;

const Tag = styled.span`
  background-color: #f0f0f0;
  padding: 4px 10px;
  border-radius: 30px;
  font-size: 0.7rem;
  color: #666;
`;

const StatusTag = styled.span`
  background-color: ${({ status }) => {
    switch (status) {
      case 'tokenized': return '#e6f7ff';
      case 'verified': return '#e6f9e6';
      case 'pending': return '#fff7e6';
      case 'rejected': return '#fff1f0';
      case 'delisted': return '#f9f0ff';
      default: return '#f0f0f0';
    }
  }};
  
  color: ${({ status }) => {
    switch (status) {
      case 'tokenized': return '#0070f3';
      case 'verified': return '#52c41a';
      case 'pending': return '#faad14';
      case 'rejected': return '#f5222d';
      case 'delisted': return '#722ed1';
      default: return '#666666';
    }
  }};
  
  padding: 4px 10px;
  border-radius: 30px;
  font-size: 0.7rem;
  font-weight: 500;
`;

const CardFooter = styled.div`
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid #f0f0f0;
`;

const ViewButton = styled.button`
  flex: 1;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #e5e5e5;
  }
`;

const BuyButton = styled.button`
  flex: 1;
  background-color: #4e44ce;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3d35a1;
  }
`;

export default AssetCard; 