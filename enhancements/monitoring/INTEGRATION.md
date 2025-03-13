# Monitoring Integration Guide

This guide outlines the steps required to integrate the RealStack monitoring system with your existing application code.

## Table of Contents

1. [Frontend Integration](#frontend-integration)
2. [Backend API Integration](#backend-api-integration)
3. [Blockchain Service Integration](#blockchain-service-integration)
4. [Infrastructure Integration](#infrastructure-integration)
5. [Testing Your Integration](#testing-your-integration)

## Frontend Integration

### Adding Performance Metrics

1. Install the Prometheus client for JavaScript:

```bash
npm install prom-client
```

2. Create a metrics service in your frontend code:

```javascript
// src/services/metricsService.js
import { Registry, Counter, Histogram } from 'prom-client';

// Create a registry
const register = new Registry();

// Define metrics
const pageLoadTime = new Histogram({
  name: 'frontend_page_load_time_seconds',
  help: 'Time for page to load completely',
  labelNames: ['page'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const userInteractions = new Counter({
  name: 'frontend_user_interactions_total',
  help: 'Count of user interactions',
  labelNames: ['action', 'page']
});

const apiCallDuration = new Histogram({
  name: 'frontend_api_call_duration_seconds',
  help: 'Duration of API calls from frontend',
  labelNames: ['endpoint', 'method', 'status'],
  buckets: [0.05, 0.1, 0.5, 1, 3, 5, 10]
});

// Register metrics
register.registerMetric(pageLoadTime);
register.registerMetric(userInteractions);
register.registerMetric(apiCallDuration);

// Export metrics function
export async function getMetrics() {
  return register.metrics();
}

// Usage functions
export function recordPageLoad(pageName, timeInSeconds) {
  pageLoadTime.labels(pageName).observe(timeInSeconds);
}

export function recordUserInteraction(action, pageName) {
  userInteractions.labels(action, pageName).inc();
}

export function recordApiCall(endpoint, method, status, durationInSeconds) {
  apiCallDuration.labels(endpoint, method, status).observe(durationInSeconds);
}
```

3. Create a metrics endpoint in your Next.js or React application:

```javascript
// For Next.js - pages/api/metrics.js
import { getMetrics } from '../../services/metricsService';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const metrics = await getMetrics();
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(metrics);
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
```

4. Implement the metrics collection in your components:

```javascript
import { useEffect } from 'react';
import { recordPageLoad, recordUserInteraction } from '../services/metricsService';

function AssetPage() {
  useEffect(() => {
    const startTime = performance.now();
    
    // When component is mounted
    return () => {
      const loadTime = (performance.now() - startTime) / 1000;
      recordPageLoad('AssetPage', loadTime);
    };
  }, []);
  
  const handlePurchaseClick = () => {
    recordUserInteraction('purchase_click', 'AssetPage');
    // Rest of the handler
  };
  
  return (
    // Component JSX
  );
}
```

### Adding Frontend Error Tracking

1. Install Sentry:

```bash
npm install @sentry/react @sentry/tracing
```

2. Initialize Sentry in your application:

```javascript
// src/index.js or _app.js
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [new BrowserTracing()],
  tracesSampleRate: 0.5,
  environment: process.env.NODE_ENV
});
```

3. Set up error boundaries:

```javascript
import * as Sentry from '@sentry/react';

// Using the Sentry error boundary
const App = () => (
  <Sentry.ErrorBoundary fallback={"An error has occurred"}>
    <RealStackApp />
  </Sentry.ErrorBoundary>
);
```

## Backend API Integration

### Adding Performance Metrics

1. Install the Prometheus client:

```bash
npm install prom-client
```

2. Set up metrics in your Express application:

```javascript
// src/metrics.js
const prometheus = require('prom-client');

// Create a Registry
const register = new prometheus.Registry();

// Add default metrics
prometheus.collectDefaultMetrics({ register });

// Define custom metrics
const httpRequestDurationMs = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Register custom metrics
register.registerMetric(httpRequestDurationMs);
register.registerMetric(httpRequestTotal);

// Middleware to collect metrics
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  // Record when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDurationMs
      .labels(req.method, route, res.statusCode)
      .observe(duration);
      
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
}

// Metrics endpoint
function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(metrics => {
    res.end(metrics);
  });
}

module.exports = {
  register,
  metricsMiddleware,
  metricsEndpoint,
  httpRequestDurationMs,
  httpRequestTotal
};
```

3. Integrate metrics into your API:

```javascript
// src/app.js
const express = require('express');
const { metricsMiddleware, metricsEndpoint } = require('./metrics');

const app = express();

// Apply metrics middleware
app.use(metricsMiddleware);

// Add metrics endpoint
app.get('/metrics', metricsEndpoint);

// Rest of your API routes
app.get('/api/assets', (req, res) => {
  // ...
});

module.exports = app;
```

### Adding Centralized Logging

1. Install Winston and Elasticsearch transport:

```bash
npm install winston winston-elasticsearch
```

2. Create a logger configuration:

```javascript
// src/logger.js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Define Elasticsearch transport options
const esTransportOpts = {
  level: 'info',
  clientOpts: { 
    node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200',
    maxRetries: 5,
    requestTimeout: 60000,
  },
  indexPrefix: 'realstack-logs',
};

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  defaultMeta: { service: 'realstack-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new ElasticsearchTransport(esTransportOpts),
  ],
});

module.exports = logger;
```

3. Use the logger in your application:

```javascript
// src/controllers/assetController.js
const logger = require('../logger');

async function getAssets(req, res) {
  try {
    logger.info('Fetching assets', { 
      userId: req.user?.id,
      query: req.query 
    });
    
    // Logic to get assets
    
    logger.info('Assets fetched successfully', { 
      count: assets.length,
      userId: req.user?.id
    });
    
    return res.json({ assets });
  } catch (error) {
    logger.error('Error fetching assets', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    return res.status(500).json({ error: 'Failed to fetch assets' });
  }
}
```

### Adding Error Tracking with Sentry

1. Install Sentry for Node.js:

```bash
npm install @sentry/node @sentry/tracing
```

2. Set up Sentry in your Express application:

```javascript
// src/app.js
const express = require('express');
const Sentry = require('@sentry/node');
const Tracing = require('@sentry/tracing');
const { metricsMiddleware, metricsEndpoint } = require('./metrics');

const app = express();

// Initialize Sentry
Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  integrations: [
    // Enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // Enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV
});

// Sentry request handler must be the first middleware
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// Apply metrics middleware
app.use(metricsMiddleware);

// Add metrics endpoint
app.get('/metrics', metricsEndpoint);

// Rest of your API routes
app.get('/api/assets', (req, res) => {
  // ...
});

// Sentry error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  res.statusCode = 500;
  res.json({ error: err.message });
});

module.exports = app;
```

## Blockchain Service Integration

1. Configure your blockchain service to use the custom exporter:

```javascript
// src/blockchain/config.js
module.exports = {
  // ... existing config
  monitoring: {
    enabled: true,
    metricsPrefix: 'realstack_blockchain_',
    // Other metrics configuration
  }
};
```

2. Add the blockchain exporter service to your deployment configuration or run it alongside your blockchain service.

## Infrastructure Integration

### Adding Node Exporter to Servers

1. Deploy Node Exporter on each server:

```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y prometheus-node-exporter

# Start the service
sudo systemctl enable prometheus-node-exporter
sudo systemctl start prometheus-node-exporter
```

2. Configure firewall to allow Prometheus to scrape metrics:

```bash
sudo ufw allow from prometheus_ip to any port 9100
```

### Adding cAdvisor for Container Metrics

1. Run cAdvisor as a container:

```bash
docker run \
  --volume=/:/rootfs:ro \
  --volume=/var/run:/var/run:ro \
  --volume=/sys:/sys:ro \
  --volume=/var/lib/docker/:/var/lib/docker:ro \
  --publish=8080:8080 \
  --detach=true \
  --name=cadvisor \
  gcr.io/cadvisor/cadvisor:latest
```

## Testing Your Integration

1. Verify metrics endpoints are accessible:

```bash
# Frontend metrics
curl http://frontend:3001/metrics

# API metrics
curl http://api:3000/metrics

# Node exporter metrics
curl http://host:9100/metrics

# cAdvisor metrics
curl http://host:8080/metrics

# Blockchain exporter metrics
curl http://blockchain-exporter:9101/metrics
```

2. Check that logs are flowing to Elasticsearch:

```bash
# Test a specific index
curl -X GET "http://elasticsearch:9200/realstack-logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  },
  "size": 5,
  "sort": [
    {
      "@timestamp": {
        "order": "desc"
      }
    }
  ]
}
'
```

3. Verify Prometheus is scraping targets:

- Access Prometheus UI at http://prometheus:9090/targets
- All targets should show as "UP"

4. Check Grafana dashboards:

- Access Grafana at http://grafana:3000
- Verify all dashboards are showing data

## Troubleshooting

If metrics are not appearing:

1. Check connectivity between Prometheus and the target services
2. Verify the services are exposing metrics endpoints correctly
3. Look for errors in Prometheus logs

If logs are not appearing in Elasticsearch:

1. Check connectivity between your services and Logstash
2. Verify the logstash pipeline configuration
3. Check Elasticsearch and Logstash logs for errors

## Next Steps

After integrating the monitoring system:

1. Set up alerting rules based on your application's specific needs
2. Customize dashboards to focus on your most important metrics
3. Establish incident response procedures based on alerts
4. Train your team on using the monitoring tools 