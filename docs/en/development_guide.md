# RealStack Development Guide

This guide provides comprehensive instructions for developers working on the RealStack platform.

## Project Structure

The project follows a monorepo structure:

```
realstack/
├── apps/                      # Application code
│   ├── frontend/              # React frontend
│   └── backend/               # Node.js backend
├── contracts/                 # Solana smart contracts
├── shared/                    # Shared code and types
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js (v16+)
- Rust (v1.65+)
- Solana CLI (v1.16+)
- Anchor Framework (v0.27+)
- MongoDB (for local development)

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/realstackxyz/realstack.git
   cd realstack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start development servers:
   ```bash
   # Start both frontend and backend
   npm start
   
   # Or start individually
   npm run start:frontend
   npm run start:backend
   ```

## Development Workflow

### Code Standards

We follow strict coding standards to ensure consistency and quality:

- **JavaScript/TypeScript**: [Airbnb Style Guide](https://github.com/airbnb/javascript)
- **Rust**: [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- **Commit Messages**: [Conventional Commits](https://www.conventionalcommits.org/)

Our linting and formatting is enforced using:
- ESLint
- Prettier
- EditorConfig

### Git Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes, following our coding standards

3. Run tests to ensure they pass:
   ```bash
   npm test
   ```

4. Push your changes:
   ```bash
   git push origin feature/your-feature-name
   ```

5. Create a pull request on GitHub

### Environment Management

- **Development**: `.env.development` - Local development environment
- **Staging**: `.env.staging` - Testing environment before production
- **Production**: `.env.production` - Production environment

## Working with Smart Contracts

### Contract Development

Smart contracts are located in the `contracts` directory and use the Anchor framework:

1. Building contracts:
   ```bash
   cd contracts
   anchor build
   ```

2. Testing contracts:
   ```bash
   anchor test
   ```

3. Deploying contracts:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

### Contract Structure

- `src/lib.rs`: Main entry point
- `src/asset_token.rs`: Asset tokenization logic
- `src/governance.rs`: Governance functionality
- `src/tokenomics.rs`: Token economics implementation
- `src/errors.rs`: Custom error definitions

## Testing Strategy

We follow a comprehensive testing approach:

1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test interactions between components
3. **End-to-End Tests**: Test complete user flows
4. **Contract Tests**: Solana program tests using Anchor framework

### Running Tests

```bash
# Run all tests
npm test

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend

# Run with coverage
cd apps/frontend
npm test -- --coverage
```

## Documentation

- Keep code documentation up-to-date using JSDoc comments
- Update API documentation when endpoints change
- Add user-facing documentation in the `docs` directory

## Deployment

We use GitHub Actions for CI/CD:

1. **Development**: Automatic deployment to development environment on push to `develop` branch
2. **Staging**: Automatic deployment to staging environment on push to `main` branch
3. **Production**: Manual trigger for deployment to production from `main` branch

## Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**:
   - Ensure MongoDB is running locally
   - Check connection string in `.env`

2. **Solana RPC Errors**:
   - Verify Solana network configuration
   - Check if your wallet has enough SOL for transactions

3. **React Hot Reload Not Working**:
   - Clear browser cache
   - Restart development server

### Debugging Tools

- VSCode launch configurations are provided for debugging
- Use `console.log` or better, the `debug` package for backend logging
- React Developer Tools for frontend debugging

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [MongoDB Documentation](https://docs.mongodb.com/)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 