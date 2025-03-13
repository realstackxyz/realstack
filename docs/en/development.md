# Development Guide

This guide provides instructions for setting up the RealStack development environment and understanding the project structure.

## Prerequisites

Before you start, make sure you have the following tools installed:

- Node.js (v16+)
- npm (v8+)
- Rust (v1.65+)
- Solana CLI (v1.16+)
- Anchor Framework (v0.27+)
- Docker and Docker Compose
- MongoDB (local installation or via Docker)

## Project Structure

RealStack is organized as a monorepo with the following structure:

```
realstack/
├── apps/                       # Application code
│   ├── frontend/               # React frontend
│   └── backend/                # Node.js backend
├── contracts/                  # Solana smart contracts
├── shared/                     # Shared code and types
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
└── assets/                     # Static assets and resources
```

## Setting Up the Development Environment

### 1. Clone the Repository

```bash
git clone https://github.com/realstackxyz/realstack.git
cd realstack
```

### 2. Install Dependencies

We use npm workspaces to manage dependencies across the monorepo:

```bash
npm install
```

This will install dependencies for all packages in the workspace.

### 3. Set Up Environment Variables

Copy the development environment variables file:

```bash
cp .env.development .env
```

Edit the `.env` file if you need to customize any settings.

### 4. Start the Development Servers

To start both frontend and backend services:

```bash
npm start
```

Or start them individually:

```bash
# Start frontend only
npm run start:frontend

# Start backend only
npm run start:backend
```

The frontend will be available at http://localhost:3000 and the backend at http://localhost:5000.

### 5. Using Docker for Development

The project includes Docker configurations for development:

```bash
# Start all services with Docker
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs
```

## Running Tests

```bash
# Run all tests
npm test

# Run frontend tests only
npm run test:frontend

# Run backend tests only
npm run test:backend
```

## Linting and Formatting

We use ESLint and Prettier for code quality and formatting:

```bash
# Run linters
npm run lint

# Fix linting issues
npm run lint:fix
```

Git hooks will automatically lint and format code on commit.

## Building for Production

```bash
# Build all packages
npm run build

# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend
```

## Deployment

### Local Production Build

To test a production build locally:

1. Create a `.env.production` file based on `.env.production.example`
2. Run the production Docker Compose configuration:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for continuous integration and deployment.

## Smart Contract Development

The Solana smart contracts are located in the `contracts/` directory:

1. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

2. Build the contracts:
   ```bash
   anchor build
   ```

3. Test the contracts:
   ```bash
   anchor test
   ```

4. Deploy to a local test validator:
   ```bash
   anchor deploy --provider.cluster localnet
   ```

## Additional Resources

- [API Documentation](api_reference.md)
- [Asset Verification Process](asset_verification.md)
- [Governance Framework](governance.md)
- [Contribution Guidelines](../../CONTRIBUTING.md)

## Support and Resources

- Check the [FAQ](./faq.md) for common questions
- Open an issue on [GitHub](https://github.com/realstackxyz/realstack/issues) for bug reports
- Use [GitHub Discussions](https://github.com/realstackxyz/realstack/discussions) for community support
- Follow us on Twitter [@RealStack_xyz](https://x.com/RealStack_xyz) for updates

## Troubleshooting

### Common Issues

1. **Port conflicts**: If you already have services running on ports 3000 or 5000, you can change the ports in the `.env` file.

2. **MongoDB connection issues**: Make sure MongoDB is running. If using Docker, the service should start automatically.

3. **Node.js version mismatch**: The project requires Node.js 16 or higher. Use nvm to manage Node.js versions.

### Getting Help

- Check the GitHub issues for known problems and solutions 