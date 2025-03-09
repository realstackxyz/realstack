use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::errors::*;

/// Main REAL token data structure
#[account]
pub struct RealToken {
    /// Name of the token
    pub name: String,
    
    /// Symbol of the token (e.g., "REAL")
    pub symbol: String,
    
    /// URI to token metadata
    pub uri: String,
    
    /// Total supply of the token
    pub total_supply: u64,
    
    /// Authority that can perform admin functions
    pub authority: Pubkey,
    
    /// Whether the token is initialized
    pub is_initialized: bool,
    
    /// Last update timestamp
    pub last_update_timestamp: i64,
    
    /// Token mint address
    pub mint: Pubkey,
    
    /// If transfers are paused (emergency only)
    pub transfers_paused: bool,
    
    /// Pending authority (for authority transfer)
    pub pending_authority: Option<Pubkey>,
    
    /// Fee configuration
    pub fee_config: FeeConfig,
    
    /// Token distribution details
    pub distribution: TokenDistribution,
}

/// Fee configuration for the REAL token
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct FeeConfig {
    /// Transaction fee basis points (e.g., 25 = 0.25%)
    pub transaction_fee_bps: u16,
    
    /// Where fees are sent
    pub fee_recipient: Pubkey,
    
    /// If fees are currently being collected
    pub fees_enabled: bool,
}

/// Token distribution details
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct TokenDistribution {
    /// Community allocation (40%)
    pub community_allocation: u64,
    
    /// Asset acquisition reserve (25%)
    pub asset_reserve_allocation: u64,
    
    /// Development fund (20%)
    pub development_allocation: u64,
    
    /// Liquidity provision (10%)
    pub liquidity_allocation: u64,
    
    /// Team and advisors (5%)
    pub team_allocation: u64,
}

impl RealToken {
    /// Space required for a RealToken account
    pub const LEN: usize = 8 + // discriminator
        64 + // name
        16 + // symbol
        128 + // uri
        8 + // total_supply
        32 + // authority
        1 + // is_initialized
        8 + // last_update_timestamp
        32 + // mint
        1 + // transfers_paused
        33 + // pending_authority (Option<Pubkey>)
        2 + // transaction_fee_bps
        32 + // fee_recipient
        1 + // fees_enabled
        8 + // community_allocation
        8 + // asset_reserve_allocation
        8 + // development_allocation
        8 + // liquidity_allocation
        8; // team_allocation
}

/// Context for transferring the REAL token authority
#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    /// The current authority
    #[account(
        constraint = real_token.authority == current_authority.key() @ RealStackError::Unauthorized
    )]
    pub current_authority: Signer<'info>,
    
    /// The REAL token account to update
    #[account(mut)]
    pub real_token: Account<'info, RealToken>,
}

/// Context for accepting authority transfer
#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    /// The new authority
    #[account(
        constraint = real_token.pending_authority == Some(new_authority.key()) @ RealStackError::Unauthorized
    )]
    pub new_authority: Signer<'info>,
    
    /// The REAL token account to update
    #[account(mut)]
    pub real_token: Account<'info, RealToken>,
}

/// Context for updating fee configuration
#[derive(Accounts)]
pub struct UpdateFeeConfig<'info> {
    /// The authority
    #[account(
        constraint = real_token.authority == authority.key() @ RealStackError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    /// The REAL token account to update
    #[account(mut)]
    pub real_token: Account<'info, RealToken>,
}

/// Context for pausing token transfers
#[derive(Accounts)]
pub struct SetTransferPause<'info> {
    /// The authority
    #[account(
        constraint = real_token.authority == authority.key() @ RealStackError::Unauthorized
    )]
    pub authority: Signer<'info>,
    
    /// The REAL token account to update
    #[account(mut)]
    pub real_token: Account<'info, RealToken>,
}

/// Implementation of tokenomics operations
pub mod token_operations {
    use super::*;
    
    /// Initialize the REAL token
    pub fn initialize(
        ctx: Context<crate::Initialize>,
        name: String,
        symbol: String,
        uri: String,
        total_supply: u64,
    ) -> Result<()> {
        let real_token = &mut ctx.accounts.real_token;
        let authority = &ctx.accounts.authority;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Verify inputs
        require!(!name.is_empty(), RealStackError::InvalidParameters);
        require!(!symbol.is_empty(), RealStackError::InvalidParameters);
        require!(total_supply > 0, RealStackError::InvalidParameters);
        
        // Calculate distribution values
        let community_allocation = calculate_percentage(total_supply, 40);
        let asset_reserve_allocation = calculate_percentage(total_supply, 25);
        let development_allocation = calculate_percentage(total_supply, 20);
        let liquidity_allocation = calculate_percentage(total_supply, 10);
        let team_allocation = calculate_percentage(total_supply, 5);
        
        // Initialize the REAL token data
        real_token.name = name;
        real_token.symbol = symbol;
        real_token.uri = uri;
        real_token.total_supply = total_supply;
        real_token.authority = authority.key();
        real_token.is_initialized = true;
        real_token.last_update_timestamp = current_timestamp;
        real_token.mint = ctx.accounts.mint.key();
        real_token.transfers_paused = false;
        real_token.pending_authority = None;
        
        // Set fee config
        real_token.fee_config = FeeConfig {
            transaction_fee_bps: 25, // 0.25%
            fee_recipient: authority.key(),
            fees_enabled: true,
        };
        
        // Set token distribution
        real_token.distribution = TokenDistribution {
            community_allocation,
            asset_reserve_allocation,
            development_allocation,
            liquidity_allocation,
            team_allocation,
        };
        
        // Log the creation
        msg!("REAL token initialized with total supply of {}", total_supply);
        msg!("Distribution: Community: {}, Asset Reserve: {}, Development: {}, Liquidity: {}, Team: {}",
            community_allocation, asset_reserve_allocation, development_allocation, 
            liquidity_allocation, team_allocation);
        
        Ok(())
    }
    
    /// Transfer authority to a new account (first step of two-step process)
    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let real_token = &mut ctx.accounts.real_token;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Set pending authority
        real_token.pending_authority = Some(new_authority);
        real_token.last_update_timestamp = current_timestamp;
        
        // Log the transfer initiation
        msg!("Authority transfer initiated to: {}", new_authority);
        msg!("New authority must accept the transfer to complete the process");
        
        Ok(())
    }
    
    /// Accept authority transfer (second step of two-step process)
    pub fn accept_authority(
        ctx: Context<AcceptAuthority>,
    ) -> Result<()> {
        let real_token = &mut ctx.accounts.real_token;
        let new_authority = &ctx.accounts.new_authority;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Complete authority transfer
        real_token.authority = new_authority.key();
        real_token.pending_authority = None;
        real_token.last_update_timestamp = current_timestamp;
        
        // Log the transfer completion
        msg!("Authority transfer completed to: {}", new_authority.key());
        
        Ok(())
    }
    
    /// Update fee configuration
    pub fn update_fee_config(
        ctx: Context<UpdateFeeConfig>,
        transaction_fee_bps: u16,
        fee_recipient: Pubkey,
        fees_enabled: bool,
    ) -> Result<()> {
        let real_token = &mut ctx.accounts.real_token;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Verify fee basis points are reasonable
        require!(transaction_fee_bps <= 1000, RealStackError::InvalidParameters); // Max 10%
        
        // Update fee config
        real_token.fee_config = FeeConfig {
            transaction_fee_bps,
            fee_recipient,
            fees_enabled,
        };
        real_token.last_update_timestamp = current_timestamp;
        
        // Log the update
        msg!("Fee configuration updated: {}bps, recipient: {}, enabled: {}", 
            transaction_fee_bps, fee_recipient, fees_enabled);
        
        Ok(())
    }
    
    /// Set transfer pause status (emergency function)
    pub fn set_transfer_pause(
        ctx: Context<SetTransferPause>,
        paused: bool,
    ) -> Result<()> {
        let real_token = &mut ctx.accounts.real_token;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Update pause state
        real_token.transfers_paused = paused;
        real_token.last_update_timestamp = current_timestamp;
        
        // Log the update
        if paused {
            msg!("Token transfers have been PAUSED");
        } else {
            msg!("Token transfers have been UNPAUSED");
        }
        
        Ok(())
    }
    
    /// Helper function to calculate percentage of a value
    fn calculate_percentage(value: u64, percentage: u8) -> u64 {
        // Multiply by percentage and divide by 100
        (value as u128 * percentage as u128 / 100) as u64
    }
} 