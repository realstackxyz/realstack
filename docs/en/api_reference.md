# RealStack API Reference

## Introduction

The RealStack API provides programmatic access to the RealStack platform for tokenized real-world assets. This document outlines the available endpoints, authentication methods, request formats, and response structures.

## Base URL

All API endpoints are relative to the base URL:

- **Production**: `https://api.realstack.xyz/v1`
- **Staging**: `https://api-staging.realstack.xyz/v1`
- **Development**: `https://api-dev.realstack.xyz/v1`

## Authentication

The RealStack API uses JSON Web Tokens (JWT) for authentication. To obtain a token:

1. Create an account on the RealStack platform
2. Generate API keys in the developer settings
3. Use the API keys to request a JWT token

### Getting a JWT Token

```
POST /auth/token
```

**Request Body:**

```json
{
  "apiKey": "your-api-key",
  "apiSecret": "your-api-secret"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

### Using the JWT Token

Include the JWT token in the Authorization header of all API requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Rate Limiting

API requests are rate limited to protect the platform from abuse:

- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

Rate limit headers are included in API responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1620000000
```

## Pagination

List endpoints support pagination using the following query parameters:

- `page`: Page number (starting from 1)
- `limit`: Number of items per page (default: 20, max: 100)

Pagination information is included in the response:

```json
{
  "status": "success",
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalItems": 100
  },
  "data": [...]
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- 2xx: Success
- 4xx: Client error
- 5xx: Server error

Error responses follow a consistent format:

```json
{
  "status": "error",
  "code": "ASSET_NOT_FOUND",
  "message": "The requested asset could not be found",
  "details": {
    "assetId": "invalid-asset-id"
  }
}
```

## Assets API

### List Assets

```
GET /assets
```

**Query Parameters:**

- `category`: Filter by asset category
- `status`: Filter by asset status
- `minValue`: Minimum asset value
- `maxValue`: Maximum asset value
- `search`: Search term for asset name or description

**Response:**

```json
{
  "status": "success",
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalItems": 100
  },
  "data": [
    {
      "id": "a1b2c3",
      "name": "Premium Office Building",
      "category": "real-estate",
      "status": "tokenized",
      "assetValue": 10000000,
      "currency": "USD",
      "location": {
        "city": "New York",
        "country": "USA"
      },
      "tokenized": true,
      "createdAt": "2023-01-15T12:00:00Z",
      "updatedAt": "2023-01-20T15:30:00Z"
    },
    // ...
  ]
}
```

### Get Asset Details

```
GET /assets/:id
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "a1b2c3",
    "name": "Premium Office Building",
    "description": "A premium office building in downtown Manhattan with 10 floors and 50,000 sq ft.",
    "category": "real-estate",
    "subcategory": "commercial",
    "status": "tokenized",
    "assetValue": 10000000,
    "currency": "USD",
    "location": {
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "postalCode": "10001",
      "coordinates": {
        "lat": 40.7128,
        "lng": -74.0060
      }
    },
    "owner": {
      "id": "u7y8i9",
      "name": "Real Estate Holdings LLC"
    },
    "images": [
      "https://storage.realstack.xyz/assets/a1b2c3/image1.jpg",
      "https://storage.realstack.xyz/assets/a1b2c3/image2.jpg"
    ],
    "documents": [
      {
        "type": "title",
        "url": "https://storage.realstack.xyz/assets/a1b2c3/title.pdf",
        "description": "Property title document",
        "uploadedAt": "2023-01-15T12:00:00Z"
      }
    ],
    "verifications": [
      {
        "verifier": {
          "id": "v4r5t6",
          "name": "Property Verification Inc."
        },
        "method": "physical",
        "details": "On-site inspection and document verification",
        "date": "2023-01-18T10:30:00Z"
      }
    ],
    "tokenized": true,
    "tokenizedAt": "2023-01-20T15:30:00Z",
    "createdAt": "2023-01-15T12:00:00Z",
    "updatedAt": "2023-01-20T15:30:00Z"
  }
}
```

### Create Asset

```
POST /assets
```

**Request Body:**

```json
{
  "name": "Premium Office Building",
  "description": "A premium office building in downtown Manhattan with 10 floors and 50,000 sq ft.",
  "category": "real-estate",
  "subcategory": "commercial",
  "assetValue": 10000000,
  "currency": "USD",
  "location": {
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postalCode": "10001",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "a1b2c3",
    "name": "Premium Office Building",
    "status": "pending",
    // ... other asset fields
  }
}
```

### Update Asset

```
PUT /assets/:id
```

**Request Body:**

```json
{
  "assetValue": 11000000,
  "description": "Updated description with recent renovations..."
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "a1b2c3",
    "assetValue": 11000000,
    "description": "Updated description with recent renovations...",
    // ... other asset fields
  }
}
```

### Tokenize Asset

```
POST /assets/:id/tokenize
```

**Request Body:**

```json
{
  "totalShares": 10000,
  "tokenSymbol": "POB",
  "tokenName": "Premium Office Building Token"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "assetToken": {
      "asset": "a1b2c3",
      "tokenMint": "TokenAddressxyz123",
      "tokenSymbol": "POB",
      "tokenName": "Premium Office Building Token",
      "totalShares": 10000,
      "sharePrice": 1100,
      "isActive": true,
      "isListed": true,
      "createdAt": "2023-01-20T15:30:00Z"
    },
    "transaction": "TransactionSignaturexyz123"
  }
}
```

## Tokens API

### Get Asset Token Details

```
GET /assets/:id/token
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "assetToken": {
      "asset": "a1b2c3",
      "tokenMint": "TokenAddressxyz123",
      "tokenSymbol": "POB",
      "tokenName": "Premium Office Building Token",
      "totalShares": 10000,
      "sharePrice": 1100,
      "isActive": true,
      "isListed": true,
      "distribution": {
        "ownerAllocation": 2000,
        "publicAllocation": 7500,
        "platformFee": 100,
        "liquidityAllocation": 400
      },
      "liquidityPool": {
        "address": "PoolAddressxyz123",
        "initialSolAmount": 50,
        "initialTokenAmount": 5000
      },
      "createdAt": "2023-01-20T15:30:00Z",
      "updatedAt": "2023-01-20T15:30:00Z"
    },
    "onChainData": {
      "address": "TokenAddressxyz123",
      "decimals": 9,
      "supply": 10000,
      "largestHolders": [
        {
          "address": "WalletAddressabc123",
          "amount": 2000
        },
        // ...
      ]
    }
  }
}
```

## User Portfolio API

### Get User Portfolio

```
GET /user/portfolio
```

**Query Parameters:**

- `wallet`: Solana wallet address (required)

**Response:**

```json
{
  "status": "success",
  "data": {
    "totalValue": 25000,
    "realBalance": 5000,
    "assetHoldings": [
      {
        "id": "a1b2c3",
        "name": "Premium Office Building",
        "category": "real-estate",
        "shares": 500,
        "sharePrice": 1100,
        "value": 550000,
        "purchaseDate": "2023-01-25T14:20:00Z"
      },
      // ...
    ],
    "transactions": [
      {
        "id": "t7u8i9",
        "type": "buy",
        "assetId": "a1b2c3",
        "assetName": "Premium Office Building",
        "shares": 500,
        "amount": 50,
        "price": 0.1,
        "timestamp": "2023-01-25T14:20:00Z",
        "txSignature": "TransactionSignatureabc123"
      },
      // ...
    ]
  }
}
```

## Governance API

### List Proposals

```
GET /governance/proposals
```

**Query Parameters:**

- `status`: Filter by proposal status (active, executed, failed)
- `type`: Filter by proposal type

**Response:**

```json
{
  "status": "success",
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 2,
    "totalItems": 25
  },
  "data": [
    {
      "id": "p1q2r3",
      "title": "Add New Asset Category: Luxury Watches",
      "proposalType": "AddAssetCategory",
      "proposer": "WalletAddressdef456",
      "isActive": true,
      "votingEndsAt": "2023-02-15T12:00:00Z",
      "yesVotes": 150000,
      "noVotes": 50000,
      "status": "active",
      "createdAt": "2023-02-01T10:00:00Z"
    },
    // ...
  ]
}
```

### Get Proposal Details

```
GET /governance/proposals/:id
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "p1q2r3",
    "title": "Add New Asset Category: Luxury Watches",
    "description": "This proposal suggests adding luxury watches as a new asset category...",
    "proposalType": "AddAssetCategory",
    "proposer": "WalletAddressdef456",
    "isActive": true,
    "creationTimestamp": "2023-02-01T10:00:00Z",
    "votingEndsAt": "2023-02-15T12:00:00Z",
    "yesVotes": 150000,
    "noVotes": 50000,
    "executed": false,
    "executedAt": null,
    "executor": null,
    "targetAccounts": [],
    "executionData": {},
    "minVotingPeriod": 1209600, // 14 days in seconds
    "quorumVotes": 100000,
    "approvalThresholdPercentage": 50
  }
}
```

### Create Proposal

```
POST /governance/proposals
```

**Request Body:**

```json
{
  "title": "Add New Asset Category: Luxury Watches",
  "description": "This proposal suggests adding luxury watches as a new asset category...",
  "proposalType": "AddAssetCategory",
  "votingEndsAt": "2023-02-15T12:00:00Z",
  "executionData": {
    "categoryName": "luxury-watches",
    "displayName": "Luxury Watches",
    "description": "High-end collectible timepieces",
    "verificationRequirements": [
      "Authentication certificate",
      "Appraisal from certified watch expert",
      "Service history"
    ]
  }
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "p1q2r3",
    "title": "Add New Asset Category: Luxury Watches",
    "proposalType": "AddAssetCategory",
    "isActive": true,
    "creationTimestamp": "2023-02-01T10:00:00Z",
    "votingEndsAt": "2023-02-15T12:00:00Z",
    "yesVotes": 0,
    "noVotes": 0,
    "executed": false,
    "transaction": "TransactionSignatureghi789"
  }
}
```

### Vote on Proposal

```
POST /governance/proposals/:id/vote
```

**Request Body:**

```json
{
  "voteYes": true,
  "voteWeight": 5000
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "proposalId": "p1q2r3",
    "voter": "WalletAddressjkl012",
    "voteYes": true,
    "voteWeight": 5000,
    "timestamp": "2023-02-05T14:30:00Z",
    "transaction": "TransactionSignaturemno345"
  }
}
```

## Solana Integration

### Get Wallet Balance

```
GET /solana/balance
```

**Query Parameters:**

- `wallet`: Solana wallet address (required)

**Response:**

```json
{
  "status": "success",
  "data": {
    "wallet": "WalletAddressjkl012",
    "solBalance": 5.24,
    "tokens": [
      {
        "mint": "TokenAddressxyz123",
        "symbol": "POB",
        "balance": 500,
        "decimals": 9
      },
      {
        "mint": "RealTokenAddress456",
        "symbol": "REAL",
        "balance": 5000,
        "decimals": 9
      }
    ]
  }
}
```

### Get Transaction Details

```
GET /solana/transaction/:signature
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "signature": "TransactionSignaturemno345",
    "blockTime": 1675611000,
    "slot": 123456789,
    "fee": 5000,
    "status": "confirmed",
    "confirmations": 32,
    "instructions": [
      {
        "program": "TokenProgramId",
        "type": "transferTokens",
        "data": {
          "source": "SourceTokenAccountAddress",
          "destination": "DestinationTokenAccountAddress",
          "amount": 5000
        }
      }
    ]
  }
}
```

## Webhook Notifications

RealStack provides webhooks for real-time notifications of platform events.

### Register Webhook

```
POST /webhooks
```

**Request Body:**

```json
{
  "url": "https://your-service.com/webhook",
  "events": ["asset.created", "asset.tokenized", "token.transferred"],
  "secret": "your-webhook-secret"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "id": "w5e6r7",
    "url": "https://your-service.com/webhook",
    "events": ["asset.created", "asset.tokenized", "token.transferred"],
    "createdAt": "2023-02-10T09:45:00Z"
  }
}
```

### Webhook Payload Example

```json
{
  "id": "evt_12345",
  "timestamp": "2023-02-12T15:30:00Z",
  "type": "asset.tokenized",
  "data": {
    "assetId": "a1b2c3",
    "tokenMint": "TokenAddressxyz123",
    "tokenSymbol": "POB",
    "totalShares": 10000,
    "transaction": "TransactionSignaturexyz123"
  }
}
```

## SDK Integration

RealStack provides official SDKs for popular programming languages:

- [JavaScript/TypeScript SDK](https://github.com/RealStack-xyz/realstack-js)
- [Python SDK](https://github.com/RealStack-xyz/realstack-python)
- [Rust SDK](https://github.com/RealStack-xyz/realstack-rust)

### JavaScript Example

```javascript
const { RealStackClient } = require('@realstack/sdk');

// Initialize client
const client = new RealStackClient({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  environment: 'production' // or 'staging', 'development'
});

// Get asset details
async function getAssetDetails(assetId) {
  try {
    const asset = await client.assets.get(assetId);
    console.log('Asset details:', asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
  }
}

getAssetDetails('a1b2c3');
```

## Support

For API support, please contact:

- Email: api-support@realstack.xyz
- Developer Discord: [RealStack Developers](https://discord.gg/realstack-dev)

## Changelog

### v1.0.0 (2023-01-01)

- Initial API release

### v1.1.0 (2023-03-15)

- Added governance endpoints
- Enhanced asset tokenization flow
- Improved error handling 