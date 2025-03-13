// This file contains any global setup for the testing environment
// It runs before all tests

// Mock console to prevent noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
};

// Set test environment variables if not already present
process.env.PROMETHEUS_PORT = process.env.PROMETHEUS_PORT || '9101';
process.env.SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Add rewire for module mocking if needed
jest.mock('rewire', () => {
  return function (modulePath) {
    const originalModule = jest.requireActual(modulePath);
    const mockModule = { ...originalModule };
    
    mockModule.__set__ = (key, value) => {
      mockModule[key] = value;
    };
    
    mockModule.__get__ = (key) => {
      return mockModule[key];
    };
    
    return mockModule;
  };
}); 