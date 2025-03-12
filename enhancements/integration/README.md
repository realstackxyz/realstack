# Application Monitoring Integration

This directory contains the necessary components to integrate the RealStack monitoring system with both frontend and backend applications.

## Overview

The integration involves several key components:

1. **Frontend Instrumentation**: JavaScript libraries and components to track user interactions, performance metrics, and errors.
2. **Backend Instrumentation**: Middleware and utilities to track API performance, database interactions, and service health.
3. **Business Metrics Collection**: Custom metrics specific to real estate asset transactions and valuations.
4. **Alerting Integration**: Application-specific alert thresholds and notifications.

## Directory Structure

```
integration/
├── frontend/                # Frontend integration components
│   ├── react/              # React-specific integrations
│   └── metrics/            # Frontend metrics collectors
├── backend/                 # Backend integration components
│   ├── express/            # Express.js middleware
│   ├── database/           # Database monitoring
│   └── services/           # Service health monitoring
└── business-metrics/        # Business-specific metrics
    ├── asset-valuation/    # Asset valuation metrics
    └── transaction/        # Transaction metrics
```

## Getting Started

### Frontend Integration

To integrate monitoring in your React components:

1. Import the metrics provider:
```javascript
import { MetricsProvider } from '@realstack/monitoring';
```

2. Wrap your application with the provider:
```javascript
<MetricsProvider>
  <App />
</MetricsProvider>
```

3. Use the hooks in your components:
```javascript
import { usePageMetrics, useErrorTracking } from '@realstack/monitoring';

function MyComponent() {
  const { trackEvent } = usePageMetrics();
  useErrorTracking();
  
  // Track custom events
  const handleClick = () => {
    trackEvent('button_click', { buttonName: 'submit' });
    // ...
  };
}
```

### Backend Integration

For Express.js applications:

1. Import the middleware:
```javascript
const { metricsMiddleware, errorTracking } = require('@realstack/monitoring');
```

2. Add to your Express app:
```javascript
app.use(metricsMiddleware());
app.use(errorTracking());
```

3. Track custom metrics:
```javascript
const { incrementCounter, observeLatency } = require('@realstack/monitoring');

async function processTransaction(transaction) {
  const timer = observeLatency('transaction_processing');
  try {
    // Process transaction
    incrementCounter('transactions_processed', { type: transaction.type });
    timer.end();
  } catch (error) {
    incrementCounter('transactions_failed', { type: transaction.type });
    throw error;
  }
}
```

## Business Metrics

The business metrics module provides specific collectors for real estate metrics:

- Asset valuation changes
- Transaction volume 
- User engagement
- Listing performance

See the [Business Metrics Documentation](./business-metrics/README.md) for detailed implementation.

## Configuration

The monitoring integration can be configured through environment variables or a configuration file:

```
METRICS_ENDPOINT=http://prometheus:9090/metrics
ERROR_TRACKING_DSN=https://sentry.io/realstack/api
LOGGING_LEVEL=info
SAMPLE_RATE=0.1  # Sample 10% of requests for detailed tracking
```

## Security Considerations

- Ensure that no sensitive information is included in metric names or labels
- Use the provided sanitization utilities to clean data before sending to monitoring
- Review the collected metrics regularly to ensure compliance with privacy policies

## Performance Impact

The monitoring integration is designed to have minimal performance impact:

- Frontend: <1ms per tracked event
- Backend: <0.5ms overhead per request

Advanced sampling strategies are used to reduce overhead in high-traffic scenarios.

## See Also

- [Main Monitoring System Documentation](../monitoring/README.md)
- [Alert Configuration Guide](../monitoring/alertmanager/README.md)
- [Dashboard Templates](../monitoring/grafana/dashboards/README.md) 