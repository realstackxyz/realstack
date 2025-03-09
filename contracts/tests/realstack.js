const anchor = require('@project-serum/anchor');
const { PublicKey, SystemProgram, Keypair } = anchor.web3;
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } = require('@solana/spl-token');
const { assert } = require('chai');

describe('RealStack', () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Realstack;
  
  // Generate new keypairs for testing
  const realTokenAccount = Keypair.generate();
  const assetTokenAccount = Keypair.generate();
  const mintKeypair = Keypair.generate();
  const assetMintKeypair = Keypair.generate();
  
  it('Initializes the REAL token', async () => {
    // Prepare token parameters
    const name = "REAL Token";
    const symbol = "REAL";
    const uri = "https://realstack.finance/metadata/real-token.json";
    const totalSupply = 100_000_000; // 100 million tokens
    
    // Execute the initialize instruction
    await program.methods
      .initialize(name, symbol, uri, new anchor.BN(totalSupply))
      .accounts({
        realToken: realTokenAccount.publicKey,
        mint: mintKeypair.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([realTokenAccount, mintKeypair])
      .rpc();
    
    // Fetch the created token account
    const tokenAccount = await program.account.realToken.fetch(realTokenAccount.publicKey);
    
    // Assert the token was initialized correctly
    assert.equal(tokenAccount.name, name);
    assert.equal(tokenAccount.symbol, symbol);
    assert.equal(tokenAccount.uri, uri);
    assert.equal(tokenAccount.totalSupply.toString(), totalSupply.toString());
    assert.equal(tokenAccount.authority.toString(), provider.wallet.publicKey.toString());
    assert.equal(tokenAccount.isInitialized, true);
    assert.equal(tokenAccount.mint.toString(), mintKeypair.publicKey.toString());
  });
  
  it('Creates an asset token', async () => {
    // Prepare asset parameters
    const name = "Premium Office Building";
    const symbol = "POB";
    const category = "real-estate";
    const description = "A premium office building in downtown Manhattan with 10 floors and 50,000 sq ft.";
    const uri = "https://realstack.finance/metadata/assets/office-building-123.json";
    const valuation = 10_000_000; // $10 million
    const totalShares = 10_000; // 10,000 shares
    const sharePrice = 1_000; // $1,000 per share
    
    // Execute the create_asset_token instruction
    await program.methods
      .createAssetToken(name, symbol, category, description, uri, 
        new anchor.BN(valuation), new anchor.BN(totalShares), new anchor.BN(sharePrice))
      .accounts({
        authority: provider.wallet.publicKey,
        assetToken: assetTokenAccount.publicKey,
        mint: assetMintKeypair.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([assetTokenAccount, assetMintKeypair])
      .rpc();
    
    // Fetch the created asset account
    const assetAccount = await program.account.assetToken.fetch(assetTokenAccount.publicKey);
    
    // Assert the asset was created correctly
    assert.equal(assetAccount.name, name);
    assert.equal(assetAccount.symbol, symbol);
    assert.equal(assetAccount.category, category);
    assert.equal(assetAccount.description, description);
    assert.equal(assetAccount.uri, uri);
    assert.equal(assetAccount.valuation.toString(), valuation.toString());
    assert.equal(assetAccount.totalShares.toString(), totalShares.toString());
    assert.equal(assetAccount.initialSharePrice.toString(), sharePrice.toString());
    assert.equal(assetAccount.currentSharePrice.toString(), sharePrice.toString());
    assert.equal(assetAccount.isVerified, false);
    assert.equal(assetAccount.isTradable, false);
    assert.equal(assetAccount.authority.toString(), provider.wallet.publicKey.toString());
    assert.equal(assetAccount.mint.toString(), assetMintKeypair.publicKey.toString());
  });
  
  it('Updates asset valuation', async () => {
    // New values for the update
    const newValuation = 12_000_000; // $12 million
    const newSharePrice = 1_200; // $1,200 per share
    
    // Execute the update_asset_valuation instruction
    await program.methods
      .updateAssetValuation(new anchor.BN(newValuation), new anchor.BN(newSharePrice))
      .accounts({
        authority: provider.wallet.publicKey,
        assetToken: assetTokenAccount.publicKey,
      })
      .rpc();
    
    // Fetch the updated asset account
    const assetAccount = await program.account.assetToken.fetch(assetTokenAccount.publicKey);
    
    // Assert the asset was updated correctly
    assert.equal(assetAccount.valuation.toString(), newValuation.toString());
    assert.equal(assetAccount.currentSharePrice.toString(), newSharePrice.toString());
  });
  
  // More tests for other functions would follow here
}); 