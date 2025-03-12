#!/usr/bin/env node

// Script to assist with listing the REAL token on pump.fun platform
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');
const open = require('open');
const chalk = require('chalk');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user for input
const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Function to prompt user for confirmation
const confirm = async (message) => {
  const answer = await prompt(`${message} (y/n): `);
  return answer.toLowerCase() === 'y';
};

// Function to validate Solana address
const isValidSolanaAddress = (address) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

// Function to load deployment info
const loadDeploymentInfo = async () => {
  try {
    const deploymentFilePath = path.join(process.cwd(), 'deployment_info.json');
    if (fs.existsSync(deploymentFilePath)) {
      const data = fs.readFileSync(deploymentFilePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading deployment info:', error.message);
    return null;
  }
};

// Main function to run the script
async function main() {
  console.log(chalk.cyan('========================================'));
  console.log(chalk.cyan('   REAL Token pump.fun Listing Guide   '));
  console.log(chalk.cyan('========================================\n'));

  // Load deployment info if available
  const deploymentInfo = await loadDeploymentInfo();
  if (deploymentInfo) {
    console.log(chalk.green('✓ Deployment information found:'));
    console.log(`  - Token Name: ${deploymentInfo.tokenName}`);
    console.log(`  - Token Symbol: ${deploymentInfo.tokenSymbol}`);
    console.log(`  - Mint Address: ${deploymentInfo.mintAddress}`);
    console.log(`  - Decimals: ${deploymentInfo.decimals}`);
    console.log(`  - Network: ${deploymentInfo.network}\n`);
  } else {
    console.log(chalk.yellow('⚠ No deployment information found.'));
    console.log(chalk.yellow('  You will need to enter token information manually.\n'));
  }

  // Confirm network
  let network = deploymentInfo?.network || 'mainnet-beta';
  const networkAnswer = await prompt(`Which network is your token on? (devnet/mainnet-beta) [${network}]: `);
  if (networkAnswer) {
    network = networkAnswer;
  }

  if (network !== 'mainnet-beta') {
    console.log(chalk.red('⚠ Warning: pump.fun only supports mainnet tokens. This guide will continue, but please be aware of this limitation.'));
    const continueWithNonMainnet = await confirm('Continue anyway?');
    if (!continueWithNonMainnet) {
      console.log('Process cancelled.');
      rl.close();
      return;
    }
  }

  // Get token mint address
  let mintAddress = deploymentInfo?.mintAddress || '';
  if (!mintAddress) {
    mintAddress = await prompt('Enter your token mint address: ');
    while (!isValidSolanaAddress(mintAddress)) {
      console.log(chalk.red('Invalid Solana address. Please try again.'));
      mintAddress = await prompt('Enter your token mint address: ');
    }
  } else {
    const confirmMintAddress = await confirm(`Is ${mintAddress} the correct mint address?`);
    if (!confirmMintAddress) {
      mintAddress = await prompt('Enter the correct token mint address: ');
      while (!isValidSolanaAddress(mintAddress)) {
        console.log(chalk.red('Invalid Solana address. Please try again.'));
        mintAddress = await prompt('Enter your token mint address: ');
      }
    }
  }

  // Verify token on Solana
  console.log(chalk.cyan('\nVerifying token on Solana...'));
  try {
    const connection = new Connection(
      network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
    
    if (!mintInfo.value) {
      console.log(chalk.red('❌ Token mint not found on the specified network.'));
      rl.close();
      return;
    }
    
    const parsedInfo = mintInfo.value.data.parsed;
    if (parsedInfo.type !== 'mint') {
      console.log(chalk.red('❌ The provided address is not a token mint.'));
      rl.close();
      return;
    }
    
    console.log(chalk.green('✓ Token verified on Solana!'));
    console.log(`  - Mint Address: ${mintAddress}`);
    console.log(`  - Decimals: ${parsedInfo.info.decimals}`);
    console.log(`  - Supply: ${parsedInfo.info.supply / Math.pow(10, parsedInfo.info.decimals)}`);
    
    // Use the token decimals from on-chain data
    const decimals = parsedInfo.info.decimals;
    
  } catch (error) {
    console.log(chalk.red(`❌ Error verifying token: ${error.message}`));
    const continueAnyway = await confirm('Continue with the guide anyway?');
    if (!continueAnyway) {
      rl.close();
      return;
    }
  }

  // Token details for pump.fun
  console.log(chalk.cyan('\n== pump.fun Listing Information =='));
  
  // Token name
  let tokenName = deploymentInfo?.tokenName || '';
  if (!tokenName) {
    tokenName = await prompt('Enter token name: ');
  } else {
    const confirmName = await confirm(`Use "${tokenName}" as the token name?`);
    if (!confirmName) {
      tokenName = await prompt('Enter token name: ');
    }
  }
  
  // Token symbol
  let tokenSymbol = deploymentInfo?.tokenSymbol || '';
  if (!tokenSymbol) {
    tokenSymbol = await prompt('Enter token symbol: ');
  } else {
    const confirmSymbol = await confirm(`Use "${tokenSymbol}" as the token symbol?`);
    if (!confirmSymbol) {
      tokenSymbol = await prompt('Enter token symbol: ');
    }
  }
  
  // Description
  console.log(chalk.yellow('\nTip: A clear and compelling description improves your token listing quality.'));
  const description = await prompt('Enter token description: ');
  
  // Website
  const website = await prompt('Enter project website URL (optional): ');
  
  // Social Media
  const twitter = await prompt('Enter Twitter handle (optional): ');
  const telegram = await prompt('Enter Telegram link (optional): ');
  const github = await prompt('Enter GitHub repository URL (optional): ');
  
  // Logo
  console.log(chalk.yellow('\nTip: A token logo is required for pump.fun listings.'));
  console.log('The logo should be:');
  console.log('  - Square image (1:1 ratio)');
  console.log('  - At least 200x200 pixels');
  console.log('  - PNG or JPG format with transparent background preferred');
  const logoReady = await confirm('Do you have a token logo ready?');
  
  console.log(chalk.cyan('\n== Launch Parameters =='));
  
  // Initial token liquidity
  console.log(chalk.yellow('\nTip: Higher initial liquidity improves trading stability.'));
  const initialLiquidity = await prompt('How much SOL will you provide as initial liquidity? ');
  
  // Initial price
  console.log(chalk.yellow('\nTip: Set a realistic initial price based on your project valuation and token supply.'));
  const initialPrice = await prompt(`What will be the initial token price in SOL? `);
  
  // Summary and next steps
  console.log(chalk.cyan('\n== Listing Summary =='));
  console.log(`Token Name: ${tokenName}`);
  console.log(`Token Symbol: ${tokenSymbol}`);
  console.log(`Mint Address: ${mintAddress}`);
  console.log(`Description: ${description}`);
  console.log(`Website: ${website || 'Not provided'}`);
  console.log(`Twitter: ${twitter || 'Not provided'}`);
  console.log(`Telegram: ${telegram || 'Not provided'}`);
  console.log(`GitHub: ${github || 'Not provided'}`);
  console.log(`Logo: ${logoReady ? 'Ready' : 'Not ready'}`);
  console.log(`Initial Liquidity: ${initialLiquidity} SOL`);
  console.log(`Initial Price: ${initialPrice} SOL`);
  
  console.log(chalk.cyan('\n== Next Steps =='));
  console.log('1. Go to pump.fun and connect your wallet');
  console.log('2. Click on "Launch a token" and enter the information above');
  console.log('3. Upload your token logo');
  console.log('4. Provide liquidity by depositing SOL');
  console.log('5. Review and confirm your listing');
  
  const openPumpFun = await confirm('\nWould you like to open pump.fun now?');
  if (openPumpFun) {
    console.log('Opening pump.fun in your default browser...');
    await open('https://pump.fun/launch');
  }
  
  // Save listing info to a file
  const saveListingInfo = await confirm('\nWould you like to save this listing information to a file for reference?');
  if (saveListingInfo) {
    const listingInfo = {
      tokenName,
      tokenSymbol,
      mintAddress,
      description,
      website: website || null,
      twitter: twitter || null,
      telegram: telegram || null,
      github: github || null,
      logoReady,
      initialLiquidity,
      initialPrice,
      preparedAt: new Date().toISOString()
    };
    
    const listingInfoFilePath = path.join(process.cwd(), 'pump_fun_listing_info.json');
    fs.writeFileSync(listingInfoFilePath, JSON.stringify(listingInfo, null, 2));
    console.log(chalk.green(`\nListing information saved to: ${listingInfoFilePath}`));
  }
  
  console.log(chalk.green('\nThank you for using the REAL Token pump.fun Listing Guide!'));
  console.log('Good luck with your token launch! 🚀');
  
  rl.close();
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  rl.close();
}); 