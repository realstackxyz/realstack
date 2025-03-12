/**
 * RealStack Backend Metrics Middleware
 * 
 * This module provides Express.js middleware for collecting request metrics
 * and integrating with Prometheus for monitoring.
 */

const promClient = require('prom-client');
const onFinished = require('on-finished');
const responseTime = require('response-time');
const url = require('url');
const path = require('path');

// Create a registry to register metrics
const register = new promClient.Registry();

// Add default Node.js metrics
promClient.collectDefaultMetrics({ register });

// Define metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDurationMs = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  registers: [register]
});

const httpRequestSizeBytes = new promClient.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

const httpResponseSizeBytes = new promClient.Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register]
});

// Database metrics
const dbQueryDurationSeconds = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register]
});

// Cache metrics
const cacheHitsTotal = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache'],
  registers: [register]
});

const cacheMissesTotal = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache'],
  registers: [register]
});

// Business metrics
const assetViewsTotal = new promClient.Counter({
  name: 'asset_views_total',
  help: 'Total number of asset views',
  labelNames: ['asset_type', 'asset_id'],
  registers: [register]
});

const transactionsTotal = new promClient.Counter({
  name: 'transactions_total',
  help: 'Total number of transactions',
  labelNames: ['transaction_type', 'status'],
  registers: [register]
});

const transactionValueTotal = new promClient.Counter({
  name: 'transaction_value_total',
  help: 'Total value of transactions',
  labelNames: ['transaction_type', 'currency'],
  registers: [register]
});

/**
 * Get a normalized route path from the request
 * Replaces IDs and other dynamic parts with placeholders
 */
function getNormalizedRoutePath(req) {
  const parsedUrl = url.parse(req.originalUrl || req.url);
  let route = parsedUrl.pathname;

  // If using Express router
  if (req.route) {
    route = req.route.path;
    
    // Handle base path
    if (req.baseUrl) {
      route = path.join(req.baseUrl, route);
    }
  }

  // Replace numeric IDs with :id
  route = route.replace(/\/\d+/g, '/:id');
  
  // Replace UUIDs with :uuid
  const uuidRegex = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  route = route.replace(uuidRegex, '/:uuid');
  
  // Replace handles with :handle
  route = route.replace(/\/@[\w-]+/g, '/:handle');

  return route;
}

/**
 * Calculate the size of a request
 */
function getRequestSize(req) {
  let size = 0;
  
  // Headers
  if (req.headers) {
    size += JSON.stringify(req.headers).length;
  }
  
  // Body
  if (req.body) {
    try {
      size += JSON.stringify(req.body).length;
    } catch (err) {
      // Ignore if body can't be stringified
    }
  }
  
  return size;
}

/**
 * Calculate the size of a response
 */
function getResponseSize(res) {
  const contentLength = res.getHeader('content-length');
  if (contentLength) {
    return parseInt(contentLength, 10);
  }
  
  // If content-length is not set, we can't accurately determine size
  return 0;
}

/**
 * Create a middleware function that collects metrics
 */
function createMetricsMiddleware(options = {}) {
  const defaultOptions = {
    enableDefaultMetrics: true,
    metricsPath: '/metrics',
    excludeRoutes: ['/metrics', '/health', '/favicon.ico'],
    normalizeRoutes: true,
    enableDatabaseMetrics: true,
    enableCacheMetrics: true,
    enableBusinessMetrics: true,
  };
  
  const config = { ...defaultOptions, ...options };
  
  // Create middleware for collecting metrics
  const metricsMiddleware = (req, res, next) => {
    const route = config.normalizeRoutes ? getNormalizedRoutePath(req) : req.path;
    const method = req.method;
    
    // Skip excluded routes
    if (config.excludeRoutes.includes(route)) {
      return next();
    }
    
    // Get request size
    const requestSize = getRequestSize(req);
    httpRequestSizeBytes.observe({ method, route }, requestSize);
    
    // Track response time
    const startTime = process.hrtime();
    
    // Track when response is finished
    onFinished(res, (err, res) => {
      const statusCode = res.statusCode.toString();
      
      // Record request count
      httpRequestsTotal.inc({ method, route, status_code: statusCode });
      
      // Record response size
      const responseSize = getResponseSize(res);
      httpResponseSizeBytes.observe({ method, route, status_code: statusCode }, responseSize);
      
      // Record request duration
      const hrTimeDiff = process.hrtime(startTime);
      const durationMs = (hrTimeDiff[0] * 1e3) + (hrTimeDiff[1] / 1e6);
      httpRequestDurationMs.observe({ method, route, status_code: statusCode }, durationMs);
    });
    
    next();
  };
  
  // Create metrics endpoint middleware
  const metricsEndpoint = async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  };
  
  // Return middleware functions
  return {
    metricsMiddleware,
    metricsEndpoint,
    register,
    
    // Database metrics
    trackDbQuery: (queryType, table, durationSeconds) => {
      if (!config.enableDatabaseMetrics) return;
      dbQueryDurationSeconds.observe({ query_type: queryType, table }, durationSeconds);
    },
    
    // Cache metrics
    trackCacheHit: (cache = 'default') => {
      if (!config.enableCacheMetrics) return;
      cacheHitsTotal.inc({ cache });
    },
    
    trackCacheMiss: (cache = 'default') => {
      if (!config.enableCacheMetrics) return;
      cacheMissesTotal.inc({ cache });
    },
    
    // Business metrics
    trackAssetView: (assetType, assetId) => {
      if (!config.enableBusinessMetrics) return;
      assetViewsTotal.inc({ asset_type: assetType, asset_id: assetId });
    },
    
    trackTransaction: (transactionType, status, value, currency = 'USD') => {
      if (!config.enableBusinessMetrics) return;
      transactionsTotal.inc({ transaction_type: transactionType, status });
      if (value) {
        transactionValueTotal.inc({ transaction_type: transactionType, currency }, value);
      }
    }
  };
}

/**
 * Setup Express with metrics
 */
function setupExpressMetrics(app, options = {}) {
  const metrics = createMetricsMiddleware(options);
  
  // Add metrics middleware
  app.use(metrics.metricsMiddleware);
  
  // Add metrics endpoint
  app.get(options.metricsPath || '/metrics', metrics.metricsEndpoint);
  
  return metrics;
}

// Export middleware and utilities
module.exports = {
  createMetricsMiddleware,
  setupExpressMetrics,
  prometheus: promClient
}; 