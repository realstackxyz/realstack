use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::errors::*;

/// Asset Token data structure
#[account]
pub struct AssetToken {
    /// Authority that can update the asset
    pub authority: Pubkey,
    
    /// Token mint address for this asset
    pub mint: Pubkey,
    
    /// Asset name
    pub name: String,
    
    /// Asset symbol (typically 3-5 characters)
    pub symbol: String,
    
    /// Asset category
    pub category: String,
    
    /// Asset description
    pub description: String,
    
    /// URI to metadata and media
    pub uri: String,
    
    /// Current valuation of the asset in USD
    pub valuation: u64,
    
    /// Total number of tokens representing this asset
    pub total_shares: u64,
    
    /// Initial price per share at tokenization time
    pub initial_share_price: u64,
    
    /// Current share price
    pub current_share_price: u64,
    
    /// Is the asset verified
    pub is_verified: bool,
    
    /// Verifier of the asset (if verified)
    pub verifier: Option<Pubkey>,
    
    /// Timestamp of verification
    pub verified_at: i64,
    
    /// Is the asset currently tradable
    pub is_tradable: bool,
    
    /// Creation timestamp
    pub created_at: i64,
    
    /// Last update timestamp
    pub updated_at: i64,
    
    /// Liquidity pool address (if exists)
    pub liquidity_pool: Option<Pubkey>,
    
    /// Income distribution configuration
    pub income_distribution_frequency: IncomeDistributionFrequency,
    
    /// Last income distribution timestamp
    pub last_income_distribution: i64,
    
    /// Total income distributed
    pub total_income_distributed: u64,
    
    /// Can mint additional shares
    pub can_mint_additional: bool,
    
    /// Is the token burned/deactivated
    pub is_burned: bool,
}

/// Income distribution frequency options
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum IncomeDistributionFrequency {
    Monthly,
    Quarterly,
    SemiAnnually,
    Annually,
    Custom,
}

impl AssetToken {
    /// Space required for an AssetToken account
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // mint
        100 + // name
        16 + // symbol
        32 + // category
        500 + // description
        200 + // uri
        8 + // valuation
        8 + // total_shares
        8 + // initial_share_price
        8 + // current_share_price
        1 + // is_verified
        33 + // verifier (Option<Pubkey>)
        8 + // verified_at
        1 + // is_tradable
        8 + // created_at
        8 + // updated_at
        33 + // liquidity_pool (Option<Pubkey>)
        1 + // income_distribution_frequency
        8 + // last_income_distribution
        8 + // total_income_distributed
        1 + // can_mint_additional
        1; // is_burned
}

/// Context for creating a new asset token
#[derive(Accounts)]
#[instruction(
    name: String,
    symbol: String,
    category: String,
    description: String,
    uri: String,
    valuation: u64,
    total_shares: u64,
    share_price: u64
)]
pub struct CreateAssetToken<'info> {
    /// The real token authority
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// The asset token account to be created
    #[account(
        init,
        payer = authority,
        space = AssetToken::LEN
    )]
    pub asset_token: Account<'info, AssetToken>,
    
    /// The mint associated with this asset token
    pub mint: Account<'info, Mint>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

/// Context for updating an asset token's valuation
#[derive(Accounts)]
pub struct UpdateAssetValuation<'info> {
    /// The authority that can update the asset
    #[account(
        constraint = asset_token.authority == authority.key() @ RealStackError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    /// The asset token account to update
    #[account(mut)]
    pub asset_token: Account<'info, AssetToken>,
}

/// Context for verifying an asset token
#[derive(Accounts)]
pub struct VerifyAsset<'info> {
    /// The verifier (must have verifier role)
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    /// The asset token account to verify
    #[account(mut)]
    pub asset_token: Account<'info, AssetToken>,
}

/// Context for distributing income to token holders
#[derive(Accounts)]
pub struct DistributeIncome<'info> {
    /// The authority that can distribute income
    #[account(
        constraint = asset_token.authority == authority.key() @ RealStackError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    /// The asset token account
    #[account(mut)]
    pub asset_token: Account<'info, AssetToken>,
    
    /// The income source account
    #[account(mut)]
    pub income_source: Account<'info, TokenAccount>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
}

/// Context for toggling tradability of an asset
#[derive(Accounts)]
pub struct ToggleTradability<'info> {
    /// The authority that can update the asset
    #[account(
        constraint = asset_token.authority == authority.key() @ RealStackError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    /// The asset token account to update
    #[account(mut)]
    pub asset_token: Account<'info, AssetToken>,
}

/// Context for burning (deactivating) an asset token
#[derive(Accounts)]
pub struct BurnAssetToken<'info> {
    /// The authority that can burn the asset
    #[account(
        constraint = asset_token.authority == authority.key() @ RealStackError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    /// The asset token account to burn
    #[account(mut)]
    pub asset_token: Account<'info, AssetToken>,
}

/// Implementation of asset token operations
pub mod asset_token_operations {
    use super::*;
    
    /// Create a new asset token
    pub fn create_asset_token(
        ctx: Context<CreateAssetToken>,
        name: String,
        symbol: String,
        category: String,
        description: String,
        uri: String,
        valuation: u64,
        total_shares: u64,
        share_price: u64,
    ) -> Result<()> {
        let asset_token = &mut ctx.accounts.asset_token;
        let authority = &ctx.accounts.authority;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Initialize the asset token data
        asset_token.authority = authority.key();
        asset_token.mint = ctx.accounts.mint.key();
        asset_token.name = name;
        asset_token.symbol = symbol;
        asset_token.category = category;
        asset_token.description = description;
        asset_token.uri = uri;
        asset_token.valuation = valuation;
        asset_token.total_shares = total_shares;
        asset_token.initial_share_price = share_price;
        asset_token.current_share_price = share_price;
        asset_token.is_verified = false;
        asset_token.verifier = None;
        asset_token.verified_at = 0;
        asset_token.is_tradable = false;
        asset_token.created_at = current_timestamp;
        asset_token.updated_at = current_timestamp;
        asset_token.liquidity_pool = None;
        asset_token.income_distribution_frequency = IncomeDistributionFrequency::Monthly;
        asset_token.last_income_distribution = 0;
        asset_token.total_income_distributed = 0;
        asset_token.can_mint_additional = false;
        asset_token.is_burned = false;
        
        // Log the creation
        msg!("Asset token created: {}", asset_token.name);
        msg!("Valuation: {}, Total Shares: {}, Share Price: {}", 
             valuation, total_shares, share_price);
        
        Ok(())
    }
    
    /// Update an asset token's valuation
    pub fn update_asset_valuation(
        ctx: Context<UpdateAssetValuation>,
        new_valuation: u64,
        new_share_price: u64,
    ) -> Result<()> {
        let asset_token = &mut ctx.accounts.asset_token;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Update valuation and share price
        asset_token.valuation = new_valuation;
        asset_token.current_share_price = new_share_price;
        asset_token.updated_at = current_timestamp;
        
        // Log the update
        msg!("Asset valuation updated for: {}", asset_token.name);
        msg!("New valuation: {}, New share price: {}", new_valuation, new_share_price);
        
        Ok(())
    }
    
    /// Verify an asset token
    pub fn verify_asset(
        ctx: Context<VerifyAsset>,
    ) -> Result<()> {
        let asset_token = &mut ctx.accounts.asset_token;
        let verifier = &ctx.accounts.verifier;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Set verification data
        asset_token.is_verified = true;
        asset_token.verifier = Some(verifier.key());
        asset_token.verified_at = current_timestamp;
        asset_token.updated_at = current_timestamp;
        
        // Log the verification
        msg!("Asset verified: {}", asset_token.name);
        msg!("Verified by: {}", verifier.key());
        
        Ok(())
    }
    
    /// Toggle asset tradability
    pub fn toggle_tradability(
        ctx: Context<ToggleTradability>,
        is_tradable: bool,
    ) -> Result<()> {
        let asset_token = &mut ctx.accounts.asset_token;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Update tradability status
        asset_token.is_tradable = is_tradable;
        asset_token.updated_at = current_timestamp;
        
        // Log the update
        msg!("Asset tradability updated for: {}", asset_token.name);
        msg!("Is tradable: {}", is_tradable);
        
        Ok(())
    }
    
    /// Burn (deactivate) an asset token
    pub fn burn_asset_token(
        ctx: Context<BurnAssetToken>,
    ) -> Result<()> {
        let asset_token = &mut ctx.accounts.asset_token;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Verify the asset is not already burned
        require!(!asset_token.is_burned, RealStackError::AssetAlreadyBurned);
        
        // Mark the asset as burned
        asset_token.is_burned = true;
        asset_token.is_tradable = false;
        asset_token.updated_at = current_timestamp;
        
        // Log the burn
        msg!("Asset token burned: {}", asset_token.name);
        
        Ok(())
    }
    
    /// Distribute income to token holders
    pub fn distribute_income(
        ctx: Context<DistributeIncome>,
        amount: u64,
    ) -> Result<()> {
        let asset_token = &mut ctx.accounts.asset_token;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Verify the asset is active
        require!(!asset_token.is_burned, RealStackError::AssetBurned);
        
        // Update income distribution data
        asset_token.last_income_distribution = current_timestamp;
        asset_token.total_income_distributed = asset_token.total_income_distributed
            .checked_add(amount)
            .ok_or(RealStackError::MathOverflow)?;
        asset_token.updated_at = current_timestamp;
        
        // Log the distribution
        msg!("Income distributed for asset: {}", asset_token.name);
        msg!("Amount: {}", amount);
        msg!("Total distributed to date: {}", asset_token.total_income_distributed);
        
        // Actual distribution logic would be implemented here
        // This would typically involve a separate instruction for each token holder
        
        Ok(())
    }
} 