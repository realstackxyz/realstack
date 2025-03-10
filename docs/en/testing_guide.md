# Testing Guide

This guide outlines the testing strategies and practices for the RealStack platform.

## Testing Philosophy

At RealStack, we believe in comprehensive testing to ensure reliability and quality:

1. **Test early, test often**: Integration of testing throughout the development process
2. **Test automation**: Automated testing for consistency and efficiency
3. **Test coverage**: Aim for high test coverage across all components
4. **Test-driven development (TDD)**: Write tests before implementation when appropriate

## Testing Types

### Unit Tests

Unit tests verify individual functions, components, or modules in isolation.

**Frontend Unit Tests (React Components)**

```jsx
// Example React component test using Jest and React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import UserProfile from './UserProfile';

describe('UserProfile', () => {
  test('displays user information correctly', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    render(<UserProfile user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  test('edit button toggles edit mode', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    render(<UserProfile user={user} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
```

**Backend Unit Tests (API Controllers)**

```javascript
// Example backend controller test using Jest and Supertest
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

jest.mock('../models/User');

describe('User Controller', () => {
  test('GET /api/users/:id returns user if exists', async () => {
    const mockUser = { id: '123', name: 'John Doe', email: 'john@example.com' };
    User.findById.mockResolvedValue(mockUser);
    
    const response = await request(app).get('/api/users/123');
    
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(mockUser);
  });
  
  test('GET /api/users/:id returns 404 if user not found', async () => {
    User.findById.mockResolvedValue(null);
    
    const response = await request(app).get('/api/users/999');
    
    expect(response.status).toBe(404);
    expect(response.body.message).toBeDefined();
  });
});
```

### Integration Tests

Integration tests verify that different parts of the application work together correctly.

**API Integration Tests**

```javascript
// Example API integration test
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { setupTestDatabase } = require('../test/helpers');

describe('Asset API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  test('Create and retrieve asset flow', async () => {
    // Log in and get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    const token = loginResponse.body.token;
    
    // Create new asset
    const newAsset = {
      name: 'Test Property',
      description: 'A test property',
      category: 'real-estate',
      value: 1000000
    };
    
    const createResponse = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${token}`)
      .send(newAsset);
    
    expect(createResponse.status).toBe(201);
    const assetId = createResponse.body.data.id;
    
    // Retrieve the created asset
    const getResponse = await request(app)
      .get(`/api/assets/${assetId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.name).toBe(newAsset.name);
  });
});
```

### Contract Tests

Tests for Solana smart contracts to verify on-chain functionality.

```javascript
// Example Anchor test for a token contract
const anchor = require('@project-serum/anchor');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { assert } = require('chai');

describe('asset-token', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.AssetToken;
  
  it('Can initialize an asset token', async () => {
    // Generate keypairs for the test
    const mintAuthority = anchor.web3.Keypair.generate();
    const assetMint = anchor.web3.Keypair.generate();
    
    // Execute the init instruction
    await program.methods.initializeAssetToken(
      "Test Asset",
      "TEST",
      9,
      1000000000
    )
    .accounts({
      assetMint: assetMint.publicKey,
      mintAuthority: mintAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([assetMint, mintAuthority])
    .rpc();
    
    // Verify the token was created correctly
    const mintInfo = await program.provider.connection.getTokenSupply(assetMint.publicKey);
    assert.equal(mintInfo.value.uiAmount, 1000);
  });
});
```

### End-to-End Tests

End-to-end tests verify complete user flows through the application.

We use Cypress for E2E testing:

```javascript
// Example Cypress test
describe('Asset Creation Flow', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password123');
  });
  
  it('allows a user to create and view an asset', () => {
    // Navigate to asset creation page
    cy.visit('/assets/new');
    
    // Fill in the form
    cy.get('input[name="name"]').type('Test Property');
    cy.get('textarea[name="description"]').type('A test property description');
    cy.get('select[name="category"]').select('real-estate');
    cy.get('input[name="value"]').type('1000000');
    
    // Upload an image
    cy.get('input[type="file"]').attachFile('test-property.jpg');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify success message
    cy.contains('Asset created successfully').should('be.visible');
    
    // Verify asset appears in list
    cy.visit('/assets');
    cy.contains('Test Property').should('be.visible');
    
    // View asset details
    cy.contains('Test Property').click();
    cy.url().should('include', '/assets/');
    cy.contains('1,000,000').should('be.visible');
  });
});
```

## Test Coverage

We aim for the following test coverage targets:

| Component | Coverage Target |
|-----------|----------------|
| Core Backend Logic | 90% |
| API Controllers | 85% |
| Frontend Components | 75% |
| Smart Contracts | 95% |
| Utilities | 90% |

Run coverage reports with:

```bash
# Frontend coverage
cd apps/frontend
npm test -- --coverage

# Backend coverage
cd apps/backend
npm test -- --coverage
```

## Test Environment

### Local Testing

For local development, we use:
- In-memory MongoDB for backend tests
- Solana test validator for contract tests
- JSDOM for React component tests

### CI/CD Testing

Our CI pipeline runs tests on:
- Every pull request
- Every push to main branches
- Nightly builds for long-running tests

## Writing Testable Code

### Guidelines for Writing Testable Code

1. **Dependency Injection**: Pass dependencies instead of creating them inside functions
2. **Pure Functions**: Favor pure functions that are easy to test
3. **Component Composition**: Break complex components into smaller, testable pieces
4. **Mocking Design**: Design code with mocking in mind

### Examples

**Hard to Test:**

```javascript
function fetchUserData() {
  const apiClient = new ApiClient();
  const userData = apiClient.get('/users/current');
  return userData;
}
```

**Easy to Test:**

```javascript
function fetchUserData(apiClient) {
  return apiClient.get('/users/current');
}
```

## Testing Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io/guides/overview/why-cypress)
- [Anchor Testing Guide](https://www.anchor-lang.com/docs/testing) 