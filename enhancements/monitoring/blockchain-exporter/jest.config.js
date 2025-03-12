module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'BlockchainExporter.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ]
}; 