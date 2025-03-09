import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

// Components
import AssetCard from '../components/AssetCard';
import Pagination from '../components/Pagination';
import FilterPanel from '../components/FilterPanel';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

// Configuration
import { API_URL } from '../config/constants';

const AssetMarketplace = () => {
  // State
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    minValue: '',
    maxValue: '',
    status: 'tokenized',
    searchQuery: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });

  // Solana wallet connection
  const { connection } = useConnection();
  const wallet = useWallet();

  // Fetch assets based on filters and pagination
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query string from filters
        const queryParams = new URLSearchParams();
        queryParams.append('page', pagination.page);
        queryParams.append('limit', pagination.limit);
        
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.minValue) queryParams.append('minValue', filters.minValue);
        if (filters.maxValue) queryParams.append('maxValue', filters.maxValue);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.searchQuery) queryParams.append('search', filters.searchQuery);

        // Fetch assets from API
        const response = await axios.get(`${API_URL}/api/assets?${queryParams.toString()}`);
        
        // Update state with response data
        setAssets(response.data.data.assets);
        setPagination({
          ...pagination,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        });
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('Failed to load assets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [filters, pagination.page, pagination.limit]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
    // Reset to first page when filters change
    setPagination({ ...pagination, page: 1 });
  };

  // Handle pagination change
  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
    // Scroll to top when page changes
    window.scrollTo(0, 0);
  };

  // Handle search
  const handleSearch = (searchQuery) => {
    setFilters({ ...filters, searchQuery });
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <MarketplaceContainer>
      <MarketplaceHeader>
        <h1>Asset Marketplace</h1>
        <p>Discover and invest in tokenized real-world assets</p>
      </MarketplaceHeader>

      <FilterContainer>
        <FilterPanel 
          filters={filters} 
          onFilterChange={handleFilterChange} 
          onSearch={handleSearch}
        />
      </FilterContainer>

      {loading ? (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <ResultsInfo>
            <span>Showing {assets.length} of {pagination.total} assets</span>
            {wallet.connected && (
              <Button as={Link} to="/dashboard">
                View My Portfolio
              </Button>
            )}
          </ResultsInfo>

          {assets.length === 0 ? (
            <NoAssetsMessage>
              <h3>No assets found matching your criteria</h3>
              <p>Try adjusting your filters or check back later for new listings</p>
            </NoAssetsMessage>
          ) : (
            <AssetsGrid>
              {assets.map((asset) => (
                <AssetCard 
                  key={asset._id} 
                  asset={asset} 
                  isConnected={wallet.connected}
                />
              ))}
            </AssetsGrid>
          )}

          {assets.length > 0 && pagination.totalPages > 1 && (
            <PaginationContainer>
              <Pagination 
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </PaginationContainer>
          )}
        </>
      )}
    </MarketplaceContainer>
  );
};

// Styled Components
const MarketplaceContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const MarketplaceHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2.5rem;
    color: #333;
    margin-bottom: 0.5rem;
  }

  p {
    font-size: 1.2rem;
    color: #666;
  }
`;

const FilterContainer = styled.div`
  margin-bottom: 2rem;
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const ResultsInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: #666;
`;

const AssetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

const NoAssetsMessage = styled.div`
  text-align: center;
  padding: 3rem 0;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 2rem;

  h3 {
    color: #333;
    margin-bottom: 0.5rem;
  }

  p {
    color: #666;
  }
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
`;

const Button = styled.button`
  background-color: #4e44ce;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3d35a1;
  }
`;

export default AssetMarketplace; 