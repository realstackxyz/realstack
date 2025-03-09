import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Components
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import AssetCard from '../components/AssetCard';

// Configuration
import { API_URL } from '../config/constants';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

const DashboardPage = () => {
  // Get wallet connection status
  const { publicKey, connected } = useWallet();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portfolio, setPortfolio] = useState({
    totalValue: 0,
    realBalance: 0,
    assetHoldings: [],
    transactions: []
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if not connected
  if (!connected) {
    return <Navigate to="/" replace />;
  }

  // Fetch portfolio data when wallet is connected
  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!publicKey) return;

      try {
        setLoading(true);
        setError(null);
        
        // Fetch user portfolio data
        const response = await axios.get(`${API_URL}/api/user/portfolio`, {
          params: { wallet: publicKey.toString() }
        });
        
        setPortfolio(response.data.data);
      } catch (err) {
        console.error('Error fetching portfolio data:', err);
        setError('Failed to load your portfolio data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, [publicKey]);

  // Prepare chart data for asset allocation
  const assetAllocationData = {
    labels: portfolio.assetHoldings.map(asset => asset.name),
    datasets: [
      {
        data: portfolio.assetHoldings.map(asset => asset.value),
        backgroundColor: [
          '#4e44ce',
          '#18a0fb',
          '#6fcf97',
          '#bb6bd9',
          '#f2994a',
          '#2d9cdb',
          '#56ccf2',
          '#f2c94c'
        ],
        borderWidth: 0
      }
    ]
  };

  // Prepare chart data for portfolio value history
  const portfolioHistoryData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Portfolio Value (SOL)',
        data: [10, 12, 15, 14, 20, 25],
        borderColor: '#4e44ce',
        backgroundColor: 'rgba(78, 68, 206, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Portfolio history chart options
  const historyChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>My Dashboard</Title>
        <WalletAddress>{publicKey && publicKey.toString()}</WalletAddress>
      </DashboardHeader>

      {loading ? (
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <OverviewCards>
            <OverviewCard>
              <CardTitle>Total Portfolio Value</CardTitle>
              <CardValue>{portfolio.totalValue.toFixed(2)} SOL</CardValue>
              <CardDescription>Total value of assets and tokens</CardDescription>
            </OverviewCard>
            
            <OverviewCard>
              <CardTitle>REAL Token Balance</CardTitle>
              <CardValue>{portfolio.realBalance.toFixed(2)} REAL</CardValue>
              <CardDescription>
                <Link to="/token">View token details →</Link>
              </CardDescription>
            </OverviewCard>
            
            <OverviewCard>
              <CardTitle>Asset Holdings</CardTitle>
              <CardValue>{portfolio.assetHoldings.length}</CardValue>
              <CardDescription>Number of tokenized assets owned</CardDescription>
            </OverviewCard>
          </OverviewCards>
          
          <TabsContainer>
            <Tab 
              isActive={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </Tab>
            <Tab 
              isActive={activeTab === 'assets'} 
              onClick={() => setActiveTab('assets')}
            >
              My Assets
            </Tab>
            <Tab 
              isActive={activeTab === 'transactions'} 
              onClick={() => setActiveTab('transactions')}
            >
              Transactions
            </Tab>
          </TabsContainer>
          
          {activeTab === 'overview' && (
            <OverviewTab>
              <ChartSection>
                <ChartCard>
                  <ChartTitle>Asset Allocation</ChartTitle>
                  <ChartContainer>
                    {portfolio.assetHoldings.length > 0 ? (
                      <Doughnut data={assetAllocationData} />
                    ) : (
                      <EmptyState>No assets in your portfolio yet</EmptyState>
                    )}
                  </ChartContainer>
                </ChartCard>
                
                <ChartCard>
                  <ChartTitle>Portfolio Value History</ChartTitle>
                  <ChartContainer>
                    <Line data={portfolioHistoryData} options={historyChartOptions} />
                  </ChartContainer>
                </ChartCard>
              </ChartSection>
              
              <RecentTransactionsSection>
                <SectionTitle>Recent Transactions</SectionTitle>
                {portfolio.transactions.length > 0 ? (
                  <TransactionsList>
                    {portfolio.transactions.slice(0, 5).map((tx, index) => (
                      <TransactionItem key={index}>
                        <TransactionType type={tx.type}>{tx.type}</TransactionType>
                        <TransactionAsset>{tx.assetName}</TransactionAsset>
                        <TransactionValue>
                          {tx.type === 'buy' ? '-' : '+'}{tx.amount.toFixed(2)} SOL
                        </TransactionValue>
                        <TransactionDate>
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </TransactionDate>
                      </TransactionItem>
                    ))}
                  </TransactionsList>
                ) : (
                  <EmptyState>No transactions yet</EmptyState>
                )}
                
                {portfolio.transactions.length > 5 && (
                  <ViewAllLink onClick={() => setActiveTab('transactions')}>
                    View all transactions
                  </ViewAllLink>
                )}
              </RecentTransactionsSection>
            </OverviewTab>
          )}
          
          {activeTab === 'assets' && (
            <AssetsTab>
              <SectionTitle>My Asset Holdings</SectionTitle>
              {portfolio.assetHoldings.length > 0 ? (
                <AssetsGrid>
                  {portfolio.assetHoldings.map((asset, index) => (
                    <AssetCard 
                      key={index}
                      asset={asset}
                      isConnected={true}
                    />
                  ))}
                </AssetsGrid>
              ) : (
                <EmptyState>
                  <p>You don't own any tokenized assets yet.</p>
                  <PrimaryButton as={Link} to="/marketplace">
                    Explore Assets
                  </PrimaryButton>
                </EmptyState>
              )}
            </AssetsTab>
          )}
          
          {activeTab === 'transactions' && (
            <TransactionsTab>
              <SectionTitle>Transaction History</SectionTitle>
              {portfolio.transactions.length > 0 ? (
                <TransactionsList>
                  {portfolio.transactions.map((tx, index) => (
                    <TransactionItem key={index}>
                      <TransactionType type={tx.type}>{tx.type}</TransactionType>
                      <TransactionAsset>{tx.assetName}</TransactionAsset>
                      <TransactionValue>
                        {tx.type === 'buy' ? '-' : '+'}{tx.amount.toFixed(2)} SOL
                      </TransactionValue>
                      <TransactionDate>
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </TransactionDate>
                    </TransactionItem>
                  ))}
                </TransactionsList>
              ) : (
                <EmptyState>No transactions yet</EmptyState>
              )}
            </TransactionsTab>
          )}
        </>
      )}
    </DashboardContainer>
  );
};

// Styled Components
const DashboardContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const DashboardHeader = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #333;
`;

const WalletAddress = styled.div`
  font-size: 0.9rem;
  color: #666;
  font-family: monospace;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
`;

const OverviewCards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const OverviewCard = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 500;
  color: #666;
  margin-bottom: 0.5rem;
`;

const CardValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const CardDescription = styled.div`
  font-size: 0.9rem;
  color: #888;
  
  a {
    color: #4e44ce;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 2rem;
`;

const Tab = styled.button`
  background: none;
  border: none;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  position: relative;
  color: ${props => props.isActive ? '#4e44ce' : '#666'};
  font-weight: ${props => props.isActive ? '600' : '400'};
  
  &:after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 3px;
    background-color: #4e44ce;
    opacity: ${props => props.isActive ? '1' : '0'};
    transition: opacity 0.2s;
  }
  
  &:hover {
    color: #4e44ce;
  }
`;

const OverviewTab = styled.div``;

const ChartSection = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const ChartTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
`;

const ChartContainer = styled.div`
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RecentTransactionsSection = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1.5rem;
`;

const TransactionsList = styled.div`
  display: flex;
  flex-direction: column;
`;

const TransactionItem = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 0.5rem;
  }
`;

const TransactionType = styled.div`
  background-color: ${props => props.type === 'buy' ? '#e6f7ff' : '#f6ffed'};
  color: ${props => props.type === 'buy' ? '#1890ff' : '#52c41a'};
  padding: 0.25rem 0.75rem;
  border-radius: 30px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
`;

const TransactionAsset = styled.div`
  font-weight: 500;
  color: #333;
`;

const TransactionValue = styled.div`
  font-weight: 500;
  color: #333;
  
  @media (max-width: 768px) {
    text-align: right;
  }
`;

const TransactionDate = styled.div`
  color: #888;
  font-size: 0.9rem;
  
  @media (max-width: 768px) {
    text-align: right;
  }
`;

const ViewAllLink = styled.button`
  background: none;
  border: none;
  color: #4e44ce;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 0;
  text-align: center;
  display: block;
  margin: 1rem auto 0;
  
  &:hover {
    text-decoration: underline;
  }
`;

const AssetsTab = styled.div``;

const AssetsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  
  p {
    margin-bottom: 1.5rem;
  }
`;

const PrimaryButton = styled(Link)`
  background-color: #4e44ce;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #3d35a1;
  }
`;

const TransactionsTab = styled.div``;

export default DashboardPage; 