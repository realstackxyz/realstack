# RealStack Project Structure

## Overview

RealStack is a decentralized platform for tokenizing real-world assets on the Solana blockchain. The platform enables fractional ownership, liquidity enhancement, and transparent management of traditionally illiquid assets.

## Architecture

The project follows a modern microservices architecture:

- **Frontend**: React-based web application
- **Backend**: Node.js REST API
- **Smart Contracts**: Solana programs written in Rust
- **Documentation**: Comprehensive guides and references

## Directory Structure

We're reorganizing the project structure for better maintainability and scalability:

```
RealStack/
├── apps/                         # Application code
│   ├── frontend/                 # React frontend
│   │   ├── public/               # Static files
│   │   ├── src/                  # Source code
│   │   │   ├── assets/           # Static assets
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── contexts/         # React contexts
│   │   │   ├── hooks/            # Custom React hooks
│   │   │   ├── layouts/          # Page layouts
│   │   │   ├── pages/            # Page components
│   │   │   ├── services/         # API services
│   │   │   ├── store/            # State management
│   │   │   ├── styles/           # Global styles
│   │   │   ├── utils/            # Utility functions
│   │   │   ├── App.js            # Main application component
│   │   │   └── index.js          # Entry point
│   │   ├── .eslintrc             # ESLint configuration
│   │   └── package.json          # Frontend dependencies
│   │
│   └── backend/                  # Node.js backend
│       ├── src/                  # Source code
│       │   ├── config/           # Configuration files
│       │   ├── controllers/      # API controllers
│       │   ├── middleware/       # Express middleware
│       │   ├── models/           # Data models
│       │   ├── routes/           # API routes
│       │   ├── services/         # Business logic
│       │   ├── utils/            # Utility functions
│       │   └── app.js            # Application entry point
│       ├── tests/                # Test files
│       └── package.json          # Backend dependencies
│
├── contracts/                    # Solana smart contracts
│   ├── src/                      # Contract source code
│   │   ├── lib.rs                # Main contract entry point
│   │   ├── asset_token.rs        # Asset token implementation
│   │   ├── governance.rs         # Governance implementation
│   │   ├── tokenomics.rs         # Token economics
│   │   └── errors.rs             # Error definitions
│   ├── tests/                    # Contract tests
│   │   └── realstack.js          # JavaScript integration tests
│   └── Cargo.toml                # Rust dependencies
│
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   │   └── swagger.json          # OpenAPI specification
│   ├── contracts/                # Contract documentation
│   │   └── interfaces.md         # Contract interfaces
│   ├── en/                       # English documentation
│   │   ├── api_reference.md      # API reference guide
│   │   ├── asset_verification.md # Asset verification process
│   │   ├── governance.md         # Governance framework
│   │   ├── tokenomics.md         # Token economics details
│   │   └── whitepaper.md         # Project whitepaper
│   └── images/                   # Documentation images
│
├── scripts/                      # Utility scripts
│   ├── deployment/               # Deployment scripts
│   │   ├── deploy_contracts.js   # Contract deployment
│   │   └── deploy_infrastructure.js # Infrastructure setup
│   ├── development/              # Development tools
│   │   ├── setup_env.sh          # Environment setup
│   │   └── seed_data.js          # Database seeding
│   └── testing/                  # Testing utilities
│       └── test_utils.js         # Test helpers
│
├── shared/                       # Shared code and types
│   ├── config/                   # Shared configuration
│   │   └── constants.js          # Common constants
│   └── types/                    # TypeScript type definitions
│       ├── asset.types.ts        # Asset-related types
│       └── token.types.ts        # Token-related types
│
├── assets/                       # Project assets
│   ├── diagrams/                 # Architecture diagrams
│   │   └── architecture.svg      # System architecture diagram
│   ├── images/                   # Marketing images
│   └── logos/                    # Brand logos
│       └── realstack_logo.svg    # Project logo
│
├── .github/                      # GitHub configuration
│   └── workflows/                # GitHub Actions
│       ├── ci.yml                # Continuous Integration
│       └── deploy.yml            # Deployment workflow
│
├── docker-compose.yml            # Docker configuration
├── .env.example                  # Environment variables example
├── .gitignore                    # Git ignore file
├── LICENSE                       # MIT License
└── README.md                     # Project overview
```

## Implementation Plan

We will migrate the current codebase to the new structure in phases:

1. **Phase 1**: Create the new directory structure
2. **Phase 2**: Move frontend code to the new structure
3. **Phase 3**: Move backend code to the new structure
4. **Phase 4**: Move contracts to the new structure
5. **Phase 5**: Update documentation and scripts

## Development Standards

All code in the RealStack project follows these standards:

### Naming Conventions

- **Files**: Use PascalCase for components (e.g., `AssetCard.jsx`) and camelCase for utilities (e.g., `formatCurrency.js`)
- **Variables**: Use camelCase (e.g., `assetPrice`)
- **Constants**: Use UPPERCASE_SNAKE_CASE (e.g., `MAX_TOKEN_SUPPLY`)
- **Functions**: Use camelCase (e.g., `getAssetDetails()`)
- **Classes/Components**: Use PascalCase (e.g., `AssetCard`)

### Code Style

- **JavaScript/TypeScript**: Follow Airbnb JavaScript Style Guide
- **Rust**: Follow Rust API Guidelines
- **Commits**: Use Conventional Commits format

### Documentation

- All public APIs must have JSDoc comments
- All smart contract functions must have NatSpec comments
- README files must exist in all major directories

## Testing Strategy

The project implements a comprehensive testing strategy:

- **Unit Tests**: For individual functions and components
- **Integration Tests**: For API endpoints and service interactions
- **End-to-End Tests**: For complete user flows
- **Smart Contract Tests**: For on-chain functionality

## Continuous Integration

GitHub Actions workflows will:

- Run linting and tests on every pull request
- Build and deploy staging versions for feature branches
- Deploy to production on main branch updates

## Contribution Guidelines

Contributors should:

1. Fork the repository
2. Create a feature branch
3. Implement changes following our coding standards
4. Add appropriate tests
5. Submit a pull request

## Next Steps

1. Create the new directory structure
2. Set up CI/CD pipelines
3. Migrate existing code
4. Implement the remaining features

---

Document Version: 1.0  
Last Updated: March 2023 