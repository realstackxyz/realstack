#!/usr/bin/env node

// Script to deploy the REAL token on Solana blockchain
const { 
  Connection, 
  Keypair, 
  PublicKey, 
  sendAndConfirmTransaction, 
  Transaction, 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY 
} = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID, 
  createInitializeMintInstruction, 
  createMintToInstruction, 
  getMinimumBalanceForRentExemptMint, 
  MINT_SIZE, 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddress 
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bs58 = require('bs58');
const { program } = require('commander');

// Setup command-line arguments
program
  .option('-e, --env <string>', 'Solana environment (devnet, testnet, mainnet-beta)', 'devnet')
  .option('-k, --keypair <path>', 'Path to keypair file', path.join(process.env.HOME, '.config/solana/id.json'))
  .option('-d, --decimals <number>', 'Token decimals', '9')
  .option('-s, --supply <number>', 'Initial token supply (in tokens, not lamports)', '100000000')
  .option('-n, --name <string>', 'Token name', 'REAL Token')
  .option('-sym, --symbol <string>', 'Token symbol', 'REAL')
  .parse(process.argv);

const opts = program.opts();

// Read-line interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for confirmation
const confirm = async (message) => {
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
};

// Function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main deployment function
async function deployToken() {
  try {
    console.log('================================');
    console.log('RealStack Token Deployment Tool');
    console.log('================================');
    console.log(`\nEnvironment: ${opts.env}`);
    
    // Confirm deployment settings
    console.log('\nDeployment Settings:');
    console.log(`- Token Name: ${opts.name}`);
    console.log(`- Token Symbol: ${opts.symbol}`);
    console.log(`- Decimals: ${opts.decimals}`);
    console.log(`- Initial Supply: ${opts.supply} tokens`);
    
    const proceed = await confirm('\nDo you want to proceed with these settings?');
    if (!proceed) {
      console.log('Deployment cancelled by user');
      rl.close();
      return;
    }
    
    // Determine the RPC URL based on environment
    let rpcUrl;
    switch (opts.env) {
      case 'devnet':
        rpcUrl = 'https://api.devnet.solana.com';
        break;
      case 'testnet':
        rpcUrl = 'https://api.testnet.solana.com';
        break;
      case 'mainnet-beta':
        rpcUrl = 'https://api.mainnet-beta.solana.com';
        break;
      default:
        throw new Error(`Unknown environment: ${opts.env}`);
    }
    
    // Create connection to Solana network
    console.log(`\nConnecting to Solana ${opts.env}...`);
    const connection = new Connection(rpcUrl, 'confirmed');

    // Load wallet keypair
    let payer;
    try {
      const keypairData = fs.readFileSync(opts.keypair, 'utf-8');
      // Handle file formats (JSON or byte array)
      try {
        const keyParsed = JSON.parse(keypairData);
        payer = Keypair.fromSecretKey(new Uint8Array(keyParsed));
      } catch (e) {
        // If not JSON, try as base58 string
        payer = Keypair.fromSecretKey(bs58.decode(keypairData.trim()));
      }
    } catch (err) {
      console.error('Error loading keypair:', err);
      rl.close();
      return;
    }
    
    // Display wallet information
    console.log(`\nWallet loaded successfully: ${payer.publicKey.toString()}`);
    
    // Check wallet balance
    const balance = await connection.getBalance(payer.publicKey);
    const solBalance = balance / 1000000000; // Convert lamports to SOL
    console.log(`Wallet balance: ${solBalance} SOL`);
    
    if (solBalance < 0.5) {
      console.warn(`\nWARNING: Low wallet balance. You might need more SOL for the deployment.`);
      const continueWithLowBalance = await confirm('Continue anyway?');
      if (!continueWithLowBalance) {
        console.log('Deployment cancelled due to low balance');
        rl.close();
        return;
      }
    }
    
    // Create token mint
    console.log('\nCreating token mint...');
    const mintKeypair = Keypair.generate();
    console.log(`Token mint address: ${mintKeypair.publicKey.toString()}`);
    
    // Calculate rent for mint
    const rentForMint = await getMinimumBalanceForRentExemptMint(connection);
    
    // Create transactions
    const transaction = new Transaction();
    
    // Add instruction to create account for mint
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: rentForMint,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    
    // Add instruction to initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        parseInt(opts.decimals),
        payer.publicKey, // mint authority
        payer.publicKey, // freeze authority (same as mint authority)
        TOKEN_PROGRAM_ID
      )
    );
    
    // Create associated token account for the payer
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      payer.publicKey
    );
    
    console.log(`\nCreating associated token account: ${associatedTokenAccount.toString()}`);
    
    // Add instruction to create associated token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        associatedTokenAccount,
        payer.publicKey,
        mintKeypair.publicKey
      )
    );
    
    // Calculate initial token supply with decimals
    const initialSupply = BigInt(parseFloat(opts.supply) * (10 ** parseInt(opts.decimals)));
    
    // Add instruction to mint tokens to the associated token account
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAccount,
        payer.publicKey,
        initialSupply
      )
    );
    
    // Confirm final deployment
    console.log('\nReady to deploy token to the Solana network.');
    const finalConfirm = await confirm('Proceed with deployment?');
    if (!finalConfirm) {
      console.log('Deployment cancelled by user');
      rl.close();
      return;
    }
    
    console.log('\nSubmitting transaction...');
    
    // Sign and send the transaction
    const txSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, mintKeypair],
      { commitment: 'confirmed' }
    );
    
    console.log('\n=== Deployment Successful ===');
    console.log(`Transaction signature: ${txSignature}`);
    console.log(`Token Mint Address: ${mintKeypair.publicKey.toString()}`);
    console.log(`Token Owner: ${payer.publicKey.toString()}`);
    console.log(`Initial Supply: ${opts.supply} ${opts.symbol}`);
    
    // Save deployment information to file
    const deploymentInfo = {
      network: opts.env,
      tokenName: opts.name,
      tokenSymbol: opts.symbol,
      decimals: parseInt(opts.decimals),
      initialSupply: opts.supply,
      mintAddress: mintKeypair.publicKey.toString(),
      ownerAddress: payer.publicKey.toString(),
      txSignature: txSignature,
      deploymentTime: new Date().toISOString()
    };
    
    const deploymentFilePath = path.join(process.cwd(), 'deployment_info.json');
    fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment information saved to: ${deploymentFilePath}`);
    
    console.log('\nNext steps:');
    console.log('1. Set up token metadata (e.g., logo, website)');
    console.log('2. Create liquidity pools');
    console.log('3. Configure pump.fun listing');
    
  } catch (error) {
    console.error('\nError during deployment:');
    console.error(error);
  } finally {
    rl.close();
  }
}

// Run the deployment script
deployToken(); 