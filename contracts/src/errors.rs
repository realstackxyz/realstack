use anchor_lang::prelude::*;

/// Custom errors for the RealStack program
#[error_code]
pub enum RealStackError {
    /// Unauthorized access to resource or operation
    #[msg("Unauthorized access to this resource or operation")]
    Unauthorized,
    
    /// Invalid parameters provided
    #[msg("Invalid parameters provided")]
    InvalidParameters,
    
    /// Overflow in mathematical operation
    #[msg("Math overflow occurred")]
    MathOverflow,
    
    /// Underflow in mathematical operation
    #[msg("Math underflow occurred")]
    MathUnderflow,
    
    /// Asset not found
    #[msg("Asset not found")]
    AssetNotFound,
    
    /// Asset not verified
    #[msg("Asset is not verified")]
    AssetNotVerified,
    
    /// Asset already verified
    #[msg("Asset is already verified")]
    AssetAlreadyVerified,
    
    /// Asset not tradable
    #[msg("Asset is not tradable")]
    AssetNotTradable,
    
    /// Asset already tokenized
    #[msg("Asset is already tokenized")]
    AssetAlreadyTokenized,
    
    /// Asset burned/deactivated
    #[msg("Asset has been burned/deactivated")]
    AssetBurned,
    
    /// Asset already burned
    #[msg("Asset is already burned")]
    AssetAlreadyBurned,
    
    /// Insufficient funds
    #[msg("Insufficient funds for operation")]
    InsufficientFunds,
    
    /// Invalid voting period
    #[msg("Invalid voting period")]
    InvalidVotingPeriod,
    
    /// Proposal is inactive
    #[msg("Proposal is inactive")]
    ProposalInactive,
    
    /// Voting period has ended
    #[msg("Voting period has ended")]
    VotingPeriodEnded,
    
    /// Voting period not ended
    #[msg("Voting period has not ended")]
    VotingPeriodNotEnded,
    
    /// Proposal already executed
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    
    /// Invalid token mint
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    /// Invalid token account
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    
    /// Invalid valuation
    #[msg("Invalid asset valuation")]
    InvalidValuation,
    
    /// Cannot mint additional tokens
    #[msg("Cannot mint additional tokens for this asset")]
    CannotMintAdditional,
    
    /// Invalid distribution amount
    #[msg("Invalid income distribution amount")]
    InvalidDistributionAmount,
    
    /// Income distribution too frequent
    #[msg("Income distribution is too frequent")]
    DistributionTooFrequent,
    
    /// Share price too low
    #[msg("Share price is too low")]
    SharePriceTooLow,
    
    /// Total shares exceeds maximum
    #[msg("Total shares exceeds maximum allowed")]
    TotalSharesExceedsMaximum,
    
    /// Invalid asset category
    #[msg("Invalid asset category")]
    InvalidAssetCategory,
    
    /// Asset name too long
    #[msg("Asset name is too long")]
    AssetNameTooLong,
    
    /// Asset description too long
    #[msg("Asset description is too long")]
    AssetDescriptionTooLong,
    
    /// Liquidity pool already exists
    #[msg("Liquidity pool already exists for this asset")]
    LiquidityPoolExists,
    
    /// Liquidity pool not found
    #[msg("Liquidity pool not found for this asset")]
    LiquidityPoolNotFound,
} 