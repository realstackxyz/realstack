import React, { useCallback, useMemo } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import styled from 'styled-components';

// Import wallet adapter ui styles
import '@solana/wallet-adapter-react-ui/styles.css';

const WalletConnect = () => {
  const { publicKey, connected, disconnect } = useWallet();

  // Format public key for display
  const formattedAddress = useMemo(() => {
    if (!publicKey) return '';
    const address = publicKey.toString();
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [publicKey]);

  // Handle disconnect button click
  const handleDisconnect = useCallback(async () => {
    if (disconnect) {
      await disconnect();
    }
  }, [disconnect]);

  return (
    <WalletContainer>
      {connected ? (
        <ConnectedContainer>
          <AddressDisplay>
            <AddressText>{formattedAddress}</AddressText>
          </AddressDisplay>
          <DisconnectButton onClick={handleDisconnect}>
            Disconnect
          </DisconnectButton>
        </ConnectedContainer>
      ) : (
        <StyledWalletMultiButton />
      )}
    </WalletContainer>
  );
};

// Styled Components
const WalletContainer = styled.div`
  display: flex;
  align-items: center;
`;

const StyledWalletMultiButton = styled(WalletMultiButton)`
  background-color: #4e44ce;
  transition: background-color 0.2s ease;
  border-radius: 8px;
  
  &:hover {
    background-color: #3d35a1;
  }
`;

const ConnectedContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AddressDisplay = styled.div`
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AddressText = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: #333;
`;

const DisconnectButton = styled.button`
  background-color: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #e9e9e9;
    color: #333;
  }
`;

export default WalletConnect; 