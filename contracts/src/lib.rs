use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use solana_program::{
    program_error::ProgramError,
    pubkey::Pubkey,
};

// Import project modules
pub mod errors;
pub mod asset_token;
pub mod governance;
pub mod tokenomics;

// Re-export key components
pub use errors::*;
pub use asset_token::*;
pub use governance::*;
pub use tokenomics::*;

declare_id!("REALstaXZRGVWvZ8xpHCxJVBGMtp7RKWMeJhmvXwXcL");

/// Main program module
#[program]
pub mod realstack {
    use super::*;
    
    /// Initialize the REAL token
    pub fn initialize(
        ctx: Context<Initialize>,
        name: String,
        symbol: String,
        uri: String,
        total_supply: u64,
    ) -> Result<()> {
        tokenomics::token_operations::initialize(ctx, name, symbol, uri, total_supply)
    }
    
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
        asset_token::asset_token_operations::create_asset_token(
            ctx, name, symbol, category, description, uri, valuation, total_shares, share_price
        )
    }
    
    /// Update an asset token's valuation
    pub fn update_asset_valuation(
        ctx: Context<UpdateAssetValuation>,
        new_valuation: u64,
        new_share_price: u64,
    ) -> Result<()> {
        asset_token::asset_token_operations::update_asset_valuation(ctx, new_valuation, new_share_price)
    }
    
    /// Verify an asset token
    pub fn verify_asset(
        ctx: Context<VerifyAsset>,
    ) -> Result<()> {
        asset_token::asset_token_operations::verify_asset(ctx)
    }
    
    /// Toggle asset tradability
    pub fn toggle_tradability(
        ctx: Context<ToggleTradability>,
        is_tradable: bool,
    ) -> Result<()> {
        asset_token::asset_token_operations::toggle_tradability(ctx, is_tradable)
    }
    
    /// Burn (deactivate) an asset token
    pub fn burn_asset_token(
        ctx: Context<BurnAssetToken>,
    ) -> Result<()> {
        asset_token::asset_token_operations::burn_asset_token(ctx)
    }
    
    /// Distribute income to token holders
    pub fn distribute_income(
        ctx: Context<DistributeIncome>,
        amount: u64,
    ) -> Result<()> {
        asset_token::asset_token_operations::distribute_income(ctx, amount)
    }
    
    /// Create a governance proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        voting_ends_at: i64,
    ) -> Result<()> {
        governance::governance_operations::create_proposal(ctx, title, description, voting_ends_at)
    }
    
    /// Vote on a governance proposal
    pub fn vote_on_proposal(
        ctx: Context<VoteOnProposal>,
        vote_yes: bool,
        vote_weight: u64,
    ) -> Result<()> {
        governance::governance_operations::vote_on_proposal(ctx, vote_yes, vote_weight)
    }
    
    /// Execute a governance proposal
    pub fn execute_proposal(
        ctx: Context<ExecuteProposal>,
    ) -> Result<()> {
        governance::governance_operations::execute_proposal(ctx)
    }
}

/// Context for initializing the REAL token
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Initialize a new REAL token account
    #[account(init, payer = authority, space = RealToken::LEN)]
    pub real_token: Account<'info, RealToken>,
    
    /// Token mint
    pub mint: Account<'info, Mint>,
    
    /// Token authority (payer)
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateAsset<'info> {
    #[account(mut)]
    pub real_token: Account<'info, RealToken>,
    #[account(init, payer = authority, space = Asset::LEN)]
    pub asset: Account<'info, Asset>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateAssetValue<'info> {
    #[account(mut)]
    pub asset: Account<'info, Asset>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateGovernanceProposal<'info> {
    #[account(init, payer = proposer, space = GovernanceProposal::LEN)]
    pub proposal: Account<'info, GovernanceProposal>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct VoteOnProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,
    pub voter: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub proposal: Account<'info, GovernanceProposal>,
    pub executor: Signer<'info>,
}

#[account]
pub struct RealToken {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub total_supply: u64,
    pub authority: Pubkey,
    pub is_initialized: bool,
    pub last_update_timestamp: i64,
    pub mint: Pubkey,
}

impl RealToken {
    pub const LEN: usize = 8 + // discriminator
        32 + // name string
        8 + // symbol string
        128 + // uri string
        8 + // total_supply
        32 + // authority
        1 + // is_initialized
        8 + // last_update_timestamp
        32; // mint
}

#[account]
pub struct Asset {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub asset_value: u64,
    pub total_shares: u64,
    pub authority: Pubkey,
    pub is_initialized: bool,
    pub creation_timestamp: i64,
    pub last_update_timestamp: i64,
    pub mint: Pubkey,
    pub real_token: Pubkey,
}

impl Asset {
    pub const LEN: usize = 8 + // discriminator
        64 + // name string
        16 + // symbol string
        128 + // uri string
        8 + // asset_value
        8 + // total_shares
        32 + // authority
        1 + // is_initialized
        8 + // creation_timestamp
        8 + // last_update_timestamp
        32 + // mint
        32; // real_token
}

#[account]
pub struct GovernanceProposal {
    pub title: String,
    pub description: String,
    pub proposer: Pubkey,
    pub is_active: bool,
    pub creation_timestamp: i64,
    pub voting_ends_at: i64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub executed: bool,
}

impl GovernanceProposal {
    pub const LEN: usize = 8 + // discriminator
        64 + // title string
        256 + // description string
        32 + // proposer
        1 + // is_active
        8 + // creation_timestamp
        8 + // voting_ends_at
        8 + // yes_votes
        8 + // no_votes
        1; // executed
}

#[error_code]
pub enum RealStackError {
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Invalid voting period")]
    InvalidVotingPeriod,
    
    #[msg("Proposal is inactive")]
    ProposalInactive,
    
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    
    #[msg("Voting period has not ended yet")]
    VotingPeriodNotEnded,
    
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    
    #[msg("Math overflow")]
    MathOverflow,
} 