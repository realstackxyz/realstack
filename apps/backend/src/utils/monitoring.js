/**
 * Performance and error monitoring utility for the backend services
 */

const winston = require('winston');
const os = require('os');
const { performance } = require('perf_hooks');

// Initialize logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'monitoring' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: `${process.env.LOG_FILE_PATH || 'logs'}/performance.log`
    })
  ],
});

// Store metrics
const metrics = {
  requestCount: 0,
  errorCount: 0,
  responseTime: {
    count: 0,
    total: 0,
    average: 0,
    min: Number.MAX_VALUE,
    max: 0,
  },
  memory: {
    samples: [],
    average: 0,
  },
  cpu: {
    samples: [],
    average: 0,
  },
  startTime: Date.now(),
};

/**
 * Middleware to track request performance
 */
const performanceMiddleware = (req, res, next) => {
  const startTime = performance.now();
  
  // Track request count
  metrics.requestCount += 1;
  
  // Track response time
  const responseTimeTracker = () => {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    metrics.responseTime.count += 1;
    metrics.responseTime.total += responseTime;
    metrics.responseTime.average = metrics.responseTime.total / metrics.responseTime.count;
    metrics.responseTime.min = Math.min(metrics.responseTime.min, responseTime);
    metrics.responseTime.max = Math.max(metrics.responseTime.max, responseTime);
    
    // Log slow requests
    if (responseTime > 1000) { // More than 1 second
      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        responseTime,
        requestId: req.id,
      });
    }
    
    // Remove listeners to prevent memory leaks
    res.removeListener('finish', responseTimeTracker);
    res.removeListener('close', responseTimeTracker);
  };
  
  res.on('finish', responseTimeTracker);
  res.on('close', responseTimeTracker);
  
  next();
};

/**
 * Track and report system metrics
 */
const trackSystemMetrics = () => {
  // Memory usage
  const memUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
  metrics.memory.samples.push(memUsage);
  if (metrics.memory.samples.length > 100) metrics.memory.samples.shift();
  metrics.memory.average = metrics.memory.samples.reduce((sum, val) => sum + val, 0) / metrics.memory.samples.length;
  
  // CPU usage (simplified)
  const cpuUsage = os.loadavg()[0]; // 1 minute load average
  metrics.cpu.samples.push(cpuUsage);
  if (metrics.cpu.samples.length > 100) metrics.cpu.samples.shift();
  metrics.cpu.average = metrics.cpu.samples.reduce((sum, val) => sum + val, 0) / metrics.cpu.samples.length;
  
  // Log system metrics periodically
  if (metrics.memory.samples.length % 10 === 0) {
    logger.info('System metrics', {
      memory: {
        used: `${memUsage.toFixed(2)} MB`,
        average: `${metrics.memory.average.toFixed(2)} MB`,
      },
      cpu: {
        load: cpuUsage.toFixed(2),
        average: metrics.cpu.average.toFixed(2),
      },
      uptime: `${((Date.now() - metrics.startTime) / 1000 / 60).toFixed(2)} minutes`,
    });
  }
};

/**
 * Error tracking middleware
 */
const errorTrackingMiddleware = (err, req, res, next) => {
  metrics.errorCount += 1;
  
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id,
  });
  
  next(err);
};

/**
 * Get current performance metrics
 */
const getMetrics = () => {
  return {
    ...metrics,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
};

// Start tracking system metrics
setInterval(trackSystemMetrics, 60000); // Every minute

module.exports = {
  performanceMiddleware,
  errorTrackingMiddleware,
  getMetrics,
}; 