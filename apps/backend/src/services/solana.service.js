const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction 
} = require('@solana/web3.js');
const { 
  Token, 
  TOKEN_PROGRAM_ID, 
  MintLayout, 
  AccountLayout, 
  ASSOCIATED_TOKEN_PROGRAM_ID 
} = require('@solana/spl-token');
const bs58 = require('bs58');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Load environment variables and configuration
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const RPC_URL = 
  SOLANA_NETWORK === 'mainnet-beta' 
    ? process.env.MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com' 
    : SOLANA_NETWORK === 'testnet' 
    ? process.env.TESTNET_RPC_URL || 'https://api.testnet.solana.com' 
    : process.env.DEVNET_RPC_URL || 'https://api.devnet.solana.com';

// Load payer keypair
let payerKeypair;
try {
  const keyPairPath = process.env.KEYPAIR_PATH || path.join(__dirname, '../../keypair/keypair.json');
  const keyData = JSON.parse(fs.readFileSync(keyPairPath, 'utf-8'));
  payerKeypair = Keypair.fromSecretKey(new Uint8Array(keyData));
} catch (error) {
  logger.error('Failed to load keypair:', error);
  // Generate a temporary keypair for development purposes
  if (SOLANA_NETWORK !== 'mainnet-beta') {
    payerKeypair = Keypair.generate();
    logger.warn('Using generated keypair for development. DO NOT use in production.');
  } else {
    logger.error('Critical: No valid keypair found for mainnet.');
    process.exit(1);
  }
}

// Create connection to Solana network
const connection = new Connection(RPC_URL, 'confirmed');

/**
 * Get the SOL balance of a wallet
 * @param {string} walletAddress - Solana wallet address
 * @returns {Promise<number>} - Balance in SOL
 */
const getWalletBalance = async (walletAddress) => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / 10 ** 9; // Convert lamports to SOL
  } catch (error) {
    logger.error('Error getting wallet balance:', error);
    throw new Error(`Failed to get wallet balance: ${error.message}`);
  }
};

/**
 * Get the token balance for a specific mint
 * @param {string} walletAddress - Solana wallet address
 * @param {string} tokenMintAddress - Token mint address
 * @returns {Promise<number>} - Token balance
 */
const getTokenBalance = async (walletAddress, tokenMintAddress) => {
  try {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMintAddress);
    
    // Get the associated token account address
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      mint: mint
    });
    
    if (tokenAccounts.value.length === 0) {
      return 0;
    }
    
    // Sum all balances if there are multiple accounts
    let totalBalance = 0;
    for (const tokenAccount of tokenAccounts.value) {
      const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
      totalBalance += balance;
    }
    
    return totalBalance;
  } catch (error) {
    logger.error('Error getting token balance:', error);
    throw new Error(`Failed to get token balance: ${error.message}`);
  }
};

/**
 * Get data for a specific token mint
 * @param {string} tokenMintAddress - Token mint address
 * @returns {Promise<Object>} - Token data
 */
const getTokenData = async (tokenMintAddress) => {
  try {
    const mint = new PublicKey(tokenMintAddress);
    const mintInfo = await connection.getParsedAccountInfo(mint);
    
    if (!mintInfo.value) {
      throw new Error('Token mint not found');
    }
    
    const data = mintInfo.value.data.parsed;
    
    // Get token supply
    const tokenSupply = await connection.getTokenSupply(mint);
    
    // Get token largest accounts (holders)
    const largestAccounts = await connection.getTokenLargestAccounts(mint);
    
    return {
      address: tokenMintAddress,
      decimals: data.info.decimals,
      freezeAuthority: data.info.freezeAuthority,
      mintAuthority: data.info.mintAuthority,
      isInitialized: data.info.isInitialized,
      supply: tokenSupply.value.uiAmount,
      largestHolders: largestAccounts.value.map(account => ({
        address: account.address.toString(),
        amount: account.uiAmount,
      }))
    };
  } catch (error) {
    logger.error('Error getting token data:', error);
    throw new Error(`Failed to get token data: ${error.message}`);
  }
};

/**
 * Create a new asset token on Solana
 * @param {Object} asset - Asset information
 * @param {number} totalShares - Total number of token shares to mint
 * @param {string} tokenSymbol - Token symbol
 * @param {string} tokenName - Token name
 * @returns {Promise<Object>} - Token creation result
 */
const createAssetToken = async (asset, totalShares, tokenSymbol, tokenName) => {
  try {
    // Create mint account
    const mintAccount = Keypair.generate();
    
    // Find minimum lamports required
    const lamports = await connection.getMinimumBalanceForRentExemption(MintLayout.span);
    
    // Create transaction
    const transaction = new Transaction();
    
    // Add instruction to create account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payerKeypair.publicKey,
        newAccountPubkey: mintAccount.publicKey,
        lamports,
        space: MintLayout.span,
        programId: TOKEN_PROGRAM_ID
      })
    );
    
    // Add instruction to initialize mint
    transaction.add(
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mintAccount.publicKey,
        9, // Decimals (standard for Solana tokens)
        payerKeypair.publicKey,
        payerKeypair.publicKey
      )
    );
    
    // Calculate total supply with decimals
    const mintAmount = totalShares * (10 ** 9);
    
    // Create associated token account for receiver (asset owner)
    const ownerPublicKey = new PublicKey(asset.owner.walletAddress);
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintAccount.publicKey,
      ownerPublicKey
    );
    
    // Add instruction to create associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payerKeypair.publicKey,
        associatedTokenAddress,
        ownerPublicKey,
        mintAccount.publicKey
      )
    );
    
    // Add instruction to mint tokens
    transaction.add(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mintAccount.publicKey,
        associatedTokenAddress,
        payerKeypair.publicKey,
        [],
        mintAmount
      )
    );
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payerKeypair, mintAccount],
      { commitment: 'confirmed' }
    );
    
    logger.info(`Asset token created: ${mintAccount.publicKey.toString()}`);
    logger.info(`Transaction signature: ${signature}`);
    
    return {
      tokenMint: mintAccount.publicKey.toString(),
      tokenSymbol,
      tokenName,
      totalShares,
      decimals: 9,
      transactionSignature: signature
    };
  } catch (error) {
    logger.error('Error creating asset token:', error);
    throw new Error(`Failed to create asset token: ${error.message}`);
  }
};

/**
 * Helper function to get associated token address
 * @param {PublicKey} mint - Token mint public key
 * @param {PublicKey} owner - Token owner public key
 * @returns {Promise<PublicKey>} - Associated token address
 */
const getAssociatedTokenAddress = async (mint, owner) => {
  return (await PublicKey.findProgramAddress(
    [
      owner.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  ))[0];
};

/**
 * Helper function to create associated token account instruction
 * @param {PublicKey} payer - Payer account
 * @param {PublicKey} associatedToken - Associated token account
 * @param {PublicKey} owner - Token owner
 * @param {PublicKey} mint - Token mint
 * @returns {TransactionInstruction} - Create associated token account instruction
 */
const createAssociatedTokenAccountInstruction = (
  payer,
  associatedToken,
  owner,
  mint
) => {
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedToken, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
};

/**
 * Get transaction details
 * @param {string} signature - Transaction signature
 * @returns {Promise<Object>} - Transaction details
 */
const getTransactionDetails = async (signature) => {
  try {
    const transaction = await connection.getTransaction(signature);
    return transaction;
  } catch (error) {
    logger.error('Error getting transaction details:', error);
    throw new Error(`Failed to get transaction details: ${error.message}`);
  }
};

/**
 * Get list of token accounts by owner
 * @param {string} walletAddress - Solana wallet address
 * @returns {Promise<Array>} - List of token accounts
 */
const getTokenAccounts = async (walletAddress) => {
  try {
    const wallet = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID
    });
    
    return tokenAccounts.value.map(account => {
      const { mint, tokenAmount } = account.account.data.parsed.info;
      return {
        mint,
        balance: tokenAmount.uiAmount,
        decimals: tokenAmount.decimals,
        address: account.pubkey.toString()
      };
    });
  } catch (error) {
    logger.error('Error getting token accounts:', error);
    throw new Error(`Failed to get token accounts: ${error.message}`);
  }
};

module.exports = {
  getWalletBalance,
  getTokenBalance,
  getTokenData,
  createAssetToken,
  getTransactionDetails,
  getTokenAccounts
}; 