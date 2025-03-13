# RealStack Governance Framework

## Introduction

The RealStack Governance Framework outlines the decentralized decision-making process for the RealStack platform. By leveraging the REAL token for governance rights, the framework enables transparent, community-driven management of the platform while maintaining necessary controls for security and efficiency.

## Governance Objectives

The RealStack governance system aims to:

1. Enable community-driven decision making for platform development
2. Provide transparency in the governance process
3. Ensure informed decision making through proper information sharing
4. Balance between efficiency and inclusivity in the governance process
5. Maintain security and stability of the platform
6. Protect the interests of all stakeholders

## Governance Participants

The governance system includes the following participants:

- **Token Holders**: REAL token holders who have voting rights proportional to their holdings
- **Core Team**: Initial developers responsible for platform maintenance and improvement
- **Asset Providers**: Entities that provide real-world assets for tokenization
- **Verifiers**: Experts who verify assets before tokenization
- **Delegates**: Token holders who receive delegated voting power from other holders

## Governance Power

Governance power in the RealStack ecosystem is determined by:

1. **Token Quantity**: The number of REAL tokens held
2. **Holding Period**: Longer-term holders receive multipliers on their voting power
3. **Delegation**: Ability to delegate voting power to expert participants

The voting power formula is:

```
Voting Power = Token Amount × (1 + (Holding Months × 0.02))
```

With a maximum multiplier cap of 2x for holding 50+ months.

## Proposal Types

The governance system supports various types of proposals:

| Proposal Type | Description | Approval Threshold | Quorum |
|---------------|-------------|-------------------|--------|
| Platform Parameters | Updates to platform fees, thresholds, etc. | 60% | 5% |
| Asset Category | Adding or modifying asset categories | 50% | 3% |
| Protocol Upgrade | Upgrading the smart contracts | 75% | 10% |
| Treasury Action | Spending from the community treasury | 60% | 5% |
| Emergency Action | Critical security fixes | 80% | 15% |
| Asset Action | Asset-specific decisions | 50% | 2% |
| Text Proposal | Non-binding signaling | 50% | 1% |

## Governance Process

The governance process follows these stages:

### 1. Proposal Creation

Any community member holding at least 10,000 REAL tokens can create a proposal by:

- Submitting the proposal text and any relevant code changes
- Specifying the proposal type and implementation details
- Providing justification and expected impact
- Locking a proposal deposit (returned after vote concludes)

### 2. Discussion Period

Each proposal undergoes a 7-day discussion period:

- Community discussion in the forum and GitHub Discussions
- Initial feedback gathering
- Refinement of proposal

### 3. Voting Period

After the discussion period, voting begins:

- Standard voting period: 7 days
- Emergency proposals: 24-72 hours
- Votes are cast as "Yes", "No", or "Abstain"
- Votes are weighted by voting power
- Votes are transparent and publicly visible
- No changing votes once cast

### 4. Proposal Execution

If the proposal passes (meets quorum and approval threshold):

- Automatic execution for on-chain parameters
- Core team implementation for protocol upgrades
- Treasury disbursement for approved fund allocations
- Documentation updates for non-technical changes

## Timelock and Security

To ensure security of critical changes:

- Parameter changes: 24-hour timelock
- Protocol upgrades: 72-hour timelock
- Treasury movements above 100,000 REAL: 48-hour timelock
- Emergency actions: Configurable timelock (0-24 hours)

## Delegation System

Token holders can delegate their voting power:

- Delegation is flexible and can be changed at any time
- Delegated voting power is used in all votes by the delegate
- Delegation history is transparent and publicly visible
- Delegation can be partial (percentage of holdings)

## Special Governance Mechanisms

### Multi-Signature Requirements

Critical platform upgrades and treasury movements require:
- Passing community vote
- 3-of-5 multi-signature approval from the core team

### Liquid Democracy

The delegation system extends to allow:
- Transitive delegation (delegates can further delegate)
- Specialized delegation (by proposal type)
- Delegation statements (delegates can explain their voting philosophy)

### Proposal Sponsorship

Participants without sufficient tokens to propose can have proposals sponsored by:
- Token holders with sufficient holdings
- Delegate accumulating sufficient delegated power
- Community treasury sponsorship (voted via meta-proposals)

## Governance Analytics

The governance dashboard displays:

- Active and past proposals
- Voting statistics and trends
- Delegation networks
- Voter participation over time
- Impact analysis of implemented proposals

## Governance Evolution

The governance system itself is subject to community-driven evolution:

1. Regular governance retrospectives (quarterly)
2. Meta-governance proposals to change governance parameters
3. Phased implementation of progressive decentralization
4. Governance experiments in controlled environments before main implementation

## Off-Chain Governance

In addition to on-chain voting, the governance ecosystem includes:

- Discussion forums for proposal refinement
- Working groups for specialized topics
- Community calls for synchronous discussion
- Sentiment polling for early feedback
- Technical committees for complex implementations

## Resources

- [Governance Portal](https://governance.realstack.xyz/)
- [Proposal Templates](https://docs.realstack.xyz/governance/templates)
- [Governance Analytics](https://analytics.realstack.xyz/governance)
- [Delegation Directory](https://governance.realstack.xyz/delegates)

---

*This Governance Framework is itself subject to modification through the governance process outlined above.* 