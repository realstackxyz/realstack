/**
 * Blockchain Metrics Exporter for Solana
 * 
 * This service exposes Solana blockchain metrics in Prometheus format.
 * It tracks RPC response times, transaction success/failure rates, and token metrics.
 */

const express = require('express');
const client = require('prom-client');
const { Connection, PublicKey } = require('@solana/web3.js');
const fetch = require('node-fetch');

// Configuration
const PORT = process.env.PROMETHEUS_PORT || 9101;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const UPDATE_INTERVAL_MS = 15000; // 15 seconds
const METRICS_PREFIX = 'solana_';

// Initialize Express server
const app = express();

// Initialize Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: METRICS_PREFIX });

// RPC Connection Metrics
const rpcConnected = new client.Gauge({
  name: `${METRICS_PREFIX}rpc_connected`,
  help: 'Indicates if the Solana RPC connection is established',
  registers: [register]
});

const rpcResponseTime = new client.Gauge({
  name: `${METRICS_PREFIX}rpc_response_time_seconds`,
  help: 'Response time of Solana RPC requests in seconds',
  registers: [register]
});

const rpcRequestsTotal = new client.Counter({
  name: `${METRICS_PREFIX}rpc_requests_total`,
  help: 'Total number of RPC requests made to Solana',
  registers: [register]
});

const rpcRequestsByMethod = new client.Counter({
  name: `${METRICS_PREFIX}rpc_requests_by_method_total`,
  help: 'Total number of RPC requests by method',
  labelNames: ['method'],
  registers: [register]
});

// Transaction Metrics
const transactionsTotal = new client.Counter({
  name: `${METRICS_PREFIX}transactions_total`,
  help: 'Total number of transactions submitted',
  registers: [register]
});

const transactionSuccessesTotal = new client.Counter({
  name: `${METRICS_PREFIX}transaction_successes_total`,
  help: 'Total number of successful transactions',
  registers: [register]
});

const transactionFailuresTotal = new client.Counter({
  name: `${METRICS_PREFIX}transaction_failures_total`,
  help: 'Total number of failed transactions',
  registers: [register]
});

const transactionFailuresByReason = new client.Counter({
  name: `${METRICS_PREFIX}transaction_failures_by_reason_total`,
  help: 'Total number of transaction failures by reason',
  labelNames: ['reason'],
  registers: [register]
});

const transactionFeesLamports = new client.Gauge({
  name: `${METRICS_PREFIX}transaction_fees_lamports`,
  help: 'Current transaction fee in lamports',
  registers: [register]
});

// Blockchain State Metrics
const slotHeight = new client.Gauge({
  name: `${METRICS_PREFIX}slot_height`,
  help: 'Current Solana blockchain slot height',
  registers: [register]
});

const blockTime = new client.Gauge({
  name: `${METRICS_PREFIX}block_time_seconds`,
  help: 'Average time between blocks in seconds',
  registers: [register]
});

// Token Metrics
const trackedTokensTotal = new client.Gauge({
  name: `${METRICS_PREFIX}tracked_tokens_total`,
  help: 'Total number of tokens being tracked',
  registers: [register]
});

const tokenValueUSD = new client.Gauge({
  name: `${METRICS_PREFIX}token_value_usd`,
  help: 'USD value of tracked tokens',
  labelNames: ['token_name', 'token_symbol', 'token_address'],
  registers: [register]
});

// Initialize Solana connection
let connection;
try {
  connection = new Connection(SOLANA_RPC_URL);
  console.log(`Connected to Solana RPC: ${SOLANA_RPC_URL}`);
  rpcConnected.set(1);
} catch (error) {
  console.error('Failed to connect to Solana RPC:', error);
  rpcConnected.set(0);
}

// Tracked tokens - hardcode some examples for RealStack assets
const TRACKED_TOKENS = [
  {
    name: 'RealStack Property 1',
    symbol: 'RSP1',
    address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',  // Example Solana token program address
    mintDecimals: 9
  },
  {
    name: 'RealStack Commercial A',
    symbol: 'RSCA',
    address: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',  // Example token address
    mintDecimals: 6
  }
];

// Update token count metric
trackedTokensTotal.set(TRACKED_TOKENS.length);

/**
 * Makes an RPC request and measures response time
 * @param {string} method - RPC method name
 * @param {Array} params - RPC parameters
 * @returns {Promise<object>} - RPC response
 */
async function makeRpcRequest(method, params = []) {
  rpcRequestsTotal.inc();
  rpcRequestsByMethod.labels(method).inc();
  
  const startTime = process.hrtime();
  
  try {
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params
      })
    });
    
    const data = await response.json();
    
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds + nanoseconds / 1e9;
    rpcResponseTime.set(responseTime);
    
    if (data.error) {
      console.error(`RPC error (${method}):`, data.error);
      return null;
    }
    
    return data.result;
  } catch (error) {
    console.error(`RPC request failed (${method}):`, error);
    rpcConnected.set(0);
    return null;
  }
}

/**
 * Collects metrics from the Solana blockchain
 */
async function collectMetrics() {
  try {
    // Check RPC connection
    const version = await makeRpcRequest('getVersion');
    if (version) {
      rpcConnected.set(1);
      console.log('Solana version:', version);
    } else {
      rpcConnected.set(0);
    }

    // Get current slot
    const currentSlot = await makeRpcRequest('getSlot');
    if (currentSlot) {
      slotHeight.set(currentSlot);
    }

    // Get recent performance samples
    const perfSamples = await makeRpcRequest('getRecentPerformanceSamples', [4]);
    if (perfSamples && perfSamples.length > 0) {
      // Calculate average block time
      const avgBlockTime = perfSamples.reduce((sum, sample) => {
        return sum + (sample.samplePeriodSecs / sample.numSlots);
      }, 0) / perfSamples.length;
      
      blockTime.set(avgBlockTime);
    }

    // Get current transaction fee
    const recentBlockhash = await makeRpcRequest('getRecentBlockhash');
    if (recentBlockhash) {
      transactionFeesLamports.set(recentBlockhash.feeCalculator.lamportsPerSignature);
    }

    // Simulate some transaction metrics (in a real system, these would be tracked in your application)
    const txSuccess = Math.floor(Math.random() * 10);
    const txFailure = Math.floor(Math.random() * 3);
    
    transactionsTotal.inc(txSuccess + txFailure);
    transactionSuccessesTotal.inc(txSuccess);
    transactionFailuresTotal.inc(txFailure);
    
    // Simulate some failure reasons
    if (txFailure > 0) {
      const reasons = ['InsufficientFunds', 'InvalidSignature', 'BlockhashNotFound'];
      reasons.forEach(reason => {
        if (Math.random() > 0.5) {
          transactionFailuresByReason.labels(reason).inc(Math.floor(Math.random() * txFailure) + 1);
        }
      });
    }

    // Update token values (simulated for this example)
    TRACKED_TOKENS.forEach(token => {
      // Simulate price fluctuations
      const basePrice = token.symbol === 'RSP1' ? 100000 : 250000;
      const fluctuation = (Math.random() - 0.5) * 0.02; // +/- 1%
      const price = basePrice * (1 + fluctuation);
      
      tokenValueUSD.labels(token.name, token.symbol, token.address).set(price);
    });

  } catch (error) {
    console.error('Error collecting metrics:', error);
    rpcConnected.set(0);
  }
}

// Start metrics collection
setInterval(collectMetrics, UPDATE_INTERVAL_MS);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Blockchain metrics exporter started on port ${PORT}`);
  // Collect metrics immediately on startup
  collectMetrics();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down');
  process.exit(0);
}); 