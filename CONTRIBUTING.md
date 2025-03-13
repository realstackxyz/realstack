# Contributing to RealStack

Thank you for your interest in contributing to RealStack! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) file for details.

## Getting Started

### Prerequisites

- Node.js (v16+)
- Rust (v1.65+)
- Solana CLI (v1.16+)
- Anchor Framework (v0.27+)
- MongoDB (v5+)

### Setting Up the Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```
   git clone https://github.com/YOUR-USERNAME/realstack.git
   cd realstack
   ```
3. Add the original repository as upstream:
   ```
   git remote add upstream https://github.com/RealStack-xyz/realstack.git
   ```
4. Install dependencies:
   ```
   npm install
   ```
5. Copy the environment variables file and configure it:
   ```
   cp .env.example .env
   # Edit .env with your local configuration
   ```
6. Start the development servers:
   ```
   npm run dev
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```
   git checkout -b feature/your-feature-name
   ```
   or
   ```
   git checkout -b fix/issue-you-are-fixing
   ```

2. Make your changes, following our [coding standards](#coding-standards)

3. Write or update tests as needed

4. Run the tests to ensure they pass:
   ```
   npm test
   ```

5. Run linting:
   ```
   npm run lint
   ```

6. Commit your changes following our [commit message guidelines](#commit-message-guidelines)

7. Push to your fork:
   ```
   git push origin feature/your-feature-name
   ```

8. Create a pull request following our [pull request process](#pull-request-process)

## Pull Request Process

1. Ensure your PR addresses a specific issue. If an issue doesn't exist, create one first.

2. Update the README.md or documentation with details of changes if applicable.

3. The PR title should follow our [commit message format](#commit-message-guidelines).

4. Include a detailed description of the changes in the PR body.

5. PRs must pass all CI checks before they can be merged.

6. PRs require at least one approval from a maintainer before merging.

7. Once approved, a maintainer will merge your PR.

## Coding Standards

### JavaScript/TypeScript

- We follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety when possible
- All code should be formatted with Prettier
- ESLint configuration is included in the repository

### Rust (Smart Contracts)

- Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use the Anchor framework conventions
- Format code with `rustfmt`
- Run `cargo clippy` to catch common mistakes

### General Guidelines

- Write self-documenting code with clear variable and function names
- Keep functions small and focused on a single task
- Comment complex logic, but prioritize readable code
- Use async/await over callbacks
- Avoid deeply nested code

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short summary>
```

Types:
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Code changes that improve performance
- **test**: Adding or updating tests
- **chore**: Changes to the build process or auxiliary tools

Scope (optional):
- **frontend**: Changes to the frontend application
- **backend**: Changes to the backend server
- **contract**: Changes to the smart contracts
- **docs**: Changes to documentation
- **ci**: Changes to CI configuration

Example:
```
feat(frontend): add asset marketplace filtering
```

## Testing Guidelines

- Write tests for all new features and bug fixes
- Aim for at least 80% code coverage
- Unit tests should be isolated and not depend on external services
- Use mocks and stubs for external dependencies
- Write integration tests for critical user flows
- Test error cases, not just the happy path

### Testing Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run specific tests
npm test -- -t "feature name"
```

## Documentation Guidelines

- Keep documentation up-to-date with code changes
- Use JSDoc comments for all public functions
- NatSpec comments for smart contract functions
- Update the README.md when adding new features or changing behavior
- Write clear commit messages that explain why changes were made

## Community

- Help answer questions in [GitHub Discussions](https://github.com/realstackxyz/realstack/discussions)
- Follow us on Twitter [@RealStack_xyz](https://x.com/RealStack_xyz)
- Visit our website at [realstack.xyz](https://www.realstack.xyz)

---

Thank you for contributing to RealStack! Your efforts help make this project better for everyone. 