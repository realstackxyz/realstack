use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use crate::errors::*;

/// Governance proposal data structure
#[account]
pub struct Proposal {
    /// Title of the proposal
    pub title: String,
    
    /// Detailed description of the proposal
    pub description: String,
    
    /// Account that created the proposal
    pub proposer: Pubkey,
    
    /// Whether the proposal is currently active
    pub is_active: bool,
    
    /// Creation timestamp
    pub creation_timestamp: i64,
    
    /// When voting ends
    pub voting_ends_at: i64,
    
    /// Total yes votes
    pub yes_votes: u64,
    
    /// Total no votes
    pub no_votes: u64,
    
    /// Whether the proposal has been executed
    pub executed: bool,
    
    /// Proposal type
    pub proposal_type: ProposalType,
    
    /// Target accounts affected by this proposal
    pub target_accounts: Vec<Pubkey>,
    
    /// Execution data (e.g., parameters for the execution action)
    pub execution_data: Vec<u8>,
    
    /// Minimum voting period in seconds
    pub min_voting_period: i64,
    
    /// Quorum requirements (minimum participation)
    pub quorum_votes: u64,
    
    /// Threshold for approval (percentage of yes votes needed)
    pub approval_threshold_percentage: u8,
    
    /// The timestamp when the proposal was executed
    pub executed_at: i64,
    
    /// The account that executed the proposal
    pub executor: Option<Pubkey>,
}

/// Types of governance proposals
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProposalType {
    /// General text proposal with no on-chain execution
    Text,
    
    /// Update platform parameters
    PlatformParameters,
    
    /// Add a new asset category
    AddAssetCategory,
    
    /// Update fee configuration
    UpdateFees,
    
    /// Upgrade the program
    ProgramUpgrade,
    
    /// Transfer funds from treasury
    TreasuryTransfer,
    
    /// Asset-specific action
    AssetAction,
    
    /// Community fund allocation
    CommunityFunding,
}

impl Proposal {
    /// Space required for a Proposal account
    pub const LEN: usize = 8 + // discriminator
        100 + // title
        1000 + // description
        32 + // proposer
        1 + // is_active
        8 + // creation_timestamp
        8 + // voting_ends_at
        8 + // yes_votes
        8 + // no_votes
        1 + // executed
        1 + // proposal_type
        64 + // target_accounts (assuming up to 2 accounts)
        128 + // execution_data
        8 + // min_voting_period
        8 + // quorum_votes
        1 + // approval_threshold_percentage
        8 + // executed_at
        33; // executor (Option<Pubkey>)
}

/// Vote record to track individual votes
#[account]
pub struct VoteRecord {
    /// The proposal being voted on
    pub proposal: Pubkey,
    
    /// The voter
    pub voter: Pubkey,
    
    /// Whether the vote was yes
    pub is_yes_vote: bool,
    
    /// Vote weight
    pub vote_weight: u64,
    
    /// When the vote was cast
    pub timestamp: i64,
}

impl VoteRecord {
    /// Space required for a VoteRecord account
    pub const LEN: usize = 8 + // discriminator
        32 + // proposal
        32 + // voter
        1 + // is_yes_vote
        8 + // vote_weight
        8; // timestamp
}

/// Governance parameters
#[account]
pub struct GovernanceConfig {
    /// Authority that can update governance parameters
    pub authority: Pubkey,
    
    /// Minimum period for voting (in seconds)
    pub min_voting_period: i64,
    
    /// Maximum period for voting (in seconds)
    pub max_voting_period: i64,
    
    /// Minimum votes needed for quorum
    pub min_quorum_votes: u64,
    
    /// Approval threshold percentage (e.g., 60 means 60% yes votes needed)
    pub approval_threshold: u8,
    
    /// Minimum token balance to create a proposal
    pub min_proposal_balance: u64,
    
    /// Minimum token balance to vote
    pub min_vote_balance: u64,
    
    /// Whether governance is active
    pub governance_active: bool,
}

impl GovernanceConfig {
    /// Space required for a GovernanceConfig account
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        8 + // min_voting_period
        8 + // max_voting_period
        8 + // min_quorum_votes
        1 + // approval_threshold
        8 + // min_proposal_balance
        8 + // min_vote_balance
        1; // governance_active
}

/// Context for creating a proposal
#[derive(Accounts)]
pub struct CreateProposal<'info> {
    /// The proposer
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    /// The proposal account to create
    #[account(
        init,
        payer = proposer,
        space = Proposal::LEN
    )]
    pub proposal: Account<'info, Proposal>,
    
    /// Governance config
    pub governance_config: Account<'info, GovernanceConfig>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

/// Context for voting on a proposal
#[derive(Accounts)]
pub struct VoteOnProposal<'info> {
    /// The voter
    #[account(mut)]
    pub voter: Signer<'info>,
    
    /// The proposal to vote on
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    /// Vote record to create
    #[account(
        init,
        payer = voter,
        space = VoteRecord::LEN,
        seeds = [
            b"vote_record".as_ref(),
            proposal.key().as_ref(),
            voter.key().as_ref()
        ],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,
    
    /// Governance config
    pub governance_config: Account<'info, GovernanceConfig>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

/// Context for executing a proposal
#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    /// The executor
    #[account(mut)]
    pub executor: Signer<'info>,
    
    /// The proposal to execute
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
}

/// Implementation of governance operations
pub mod governance_operations {
    use super::*;
    
    /// Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        voting_ends_at: i64,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let proposer = &ctx.accounts.proposer;
        let governance_config = &ctx.accounts.governance_config;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Validate proposal parameters
        require!(!title.is_empty(), RealStackError::InvalidParameters);
        require!(!description.is_empty(), RealStackError::InvalidParameters);
        
        // Validate voting period
        let min_end_time = current_timestamp.checked_add(governance_config.min_voting_period)
            .ok_or(RealStackError::MathOverflow)?;
        let max_end_time = current_timestamp.checked_add(governance_config.max_voting_period)
            .ok_or(RealStackError::MathOverflow)?;
        
        require!(
            voting_ends_at >= min_end_time,
            RealStackError::InvalidVotingPeriod
        );
        require!(
            voting_ends_at <= max_end_time,
            RealStackError::InvalidVotingPeriod
        );
        
        // Initialize the proposal
        proposal.title = title;
        proposal.description = description;
        proposal.proposer = proposer.key();
        proposal.is_active = true;
        proposal.creation_timestamp = current_timestamp;
        proposal.voting_ends_at = voting_ends_at;
        proposal.yes_votes = 0;
        proposal.no_votes = 0;
        proposal.executed = false;
        proposal.proposal_type = ProposalType::Text; // Default type
        proposal.target_accounts = vec![];
        proposal.execution_data = vec![];
        proposal.min_voting_period = governance_config.min_voting_period;
        proposal.quorum_votes = governance_config.min_quorum_votes;
        proposal.approval_threshold_percentage = governance_config.approval_threshold;
        proposal.executed_at = 0;
        proposal.executor = None;
        
        // Log the creation
        msg!("Governance proposal created: {}", proposal.title);
        msg!("Voting ends at: {}", proposal.voting_ends_at);
        
        Ok(())
    }
    
    /// Vote on a proposal
    pub fn vote_on_proposal(
        ctx: Context<VoteOnProposal>,
        vote_yes: bool,
        vote_weight: u64,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let voter = &ctx.accounts.voter;
        let vote_record = &mut ctx.accounts.vote_record;
        let governance_config = &ctx.accounts.governance_config;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Validate voting requirements
        require!(proposal.is_active, RealStackError::ProposalInactive);
        require!(
            current_timestamp < proposal.voting_ends_at,
            RealStackError::VotingPeriodEnded
        );
        require!(
            vote_weight >= governance_config.min_vote_balance,
            RealStackError::InvalidParameters
        );
        
        // Set up vote record
        vote_record.proposal = proposal.key();
        vote_record.voter = voter.key();
        vote_record.is_yes_vote = vote_yes;
        vote_record.vote_weight = vote_weight;
        vote_record.timestamp = current_timestamp;
        
        // Update vote counts
        if vote_yes {
            proposal.yes_votes = proposal.yes_votes
                .checked_add(vote_weight)
                .ok_or(RealStackError::MathOverflow)?;
        } else {
            proposal.no_votes = proposal.no_votes
                .checked_add(vote_weight)
                .ok_or(RealStackError::MathOverflow)?;
        }
        
        // Log the vote
        msg!("Vote recorded for proposal: {}", proposal.title);
        msg!("Voter: {}, Vote: {}, Weight: {}", 
            voter.key(), if vote_yes { "Yes" } else { "No" }, vote_weight);
        
        Ok(())
    }
    
    /// Execute a proposal
    pub fn execute_proposal(
        ctx: Context<ExecuteProposal>,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let executor = &ctx.accounts.executor;
        let current_timestamp = Clock::get()?.unix_timestamp;
        
        // Validate execution requirements
        require!(proposal.is_active, RealStackError::ProposalInactive);
        require!(
            current_timestamp >= proposal.voting_ends_at,
            RealStackError::VotingPeriodNotEnded
        );
        require!(!proposal.executed, RealStackError::ProposalAlreadyExecuted);
        
        // Check if quorum was reached
        let total_votes = proposal.yes_votes
            .checked_add(proposal.no_votes)
            .ok_or(RealStackError::MathOverflow)?;
        require!(
            total_votes >= proposal.quorum_votes,
            RealStackError::InvalidParameters
        );
        
        // Check if approval threshold was met
        let yes_percentage = if total_votes > 0 {
            (proposal.yes_votes as u128 * 100) / total_votes as u128
        } else {
            0
        };
        
        let approved = yes_percentage >= proposal.approval_threshold_percentage as u128;
        
        // Update proposal state
        proposal.executed = true;
        proposal.is_active = false;
        proposal.executed_at = current_timestamp;
        proposal.executor = Some(executor.key());
        
        // Log the execution result
        if approved {
            msg!("Proposal passed and executed: {}", proposal.title);
            msg!("Yes votes: {} ({}%), Required: {}%", 
                proposal.yes_votes, yes_percentage, proposal.approval_threshold_percentage);
            
            // Execute based on proposal type (implementation would vary by type)
            match proposal.proposal_type {
                ProposalType::Text => {
                    msg!("Text proposal execution: No on-chain action needed");
                },
                _ => {
                    // Other proposal types would have specific execution logic
                    msg!("Executing proposal of type: {:?}", proposal.proposal_type);
                }
            }
        } else {
            msg!("Proposal failed: {}", proposal.title);
            msg!("Yes votes: {} ({}%), Required: {}%", 
                proposal.yes_votes, yes_percentage, proposal.approval_threshold_percentage);
        }
        
        Ok(())
    }
} 