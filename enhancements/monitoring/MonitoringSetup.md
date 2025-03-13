# Monitoring System Setup Guide

This document outlines the implementation of a comprehensive monitoring system for the RealStack platform.

## Architecture Overview

The monitoring system consists of the following components:

- **Application Performance Monitoring (APM)**: New Relic for real-time application performance insights
- **Error Tracking**: Sentry for automated error capture and reporting
- **Metrics Collection**: Prometheus for collecting and storing system and custom metrics
- **Visualization**: Grafana for dashboards and visualization
- **Log Management**: ELK Stack (Elasticsearch, Logstash, Kibana) for centralized logging
- **Alerting**: PagerDuty for alert management and on-call scheduling

## Implementation Steps

### 1. Application Performance Monitoring

#### New Relic Setup

```javascript
// Install the New Relic agent
npm install newrelic --save

// Create newrelic.js configuration file in project root
module.exports = {
  app_name: ['RealStack-Production'],
  license_key: 'YOUR_LICENSE_KEY',
  logging: {
    level: 'info'
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  }
};

// Add to entry point of your application (e.g. index.js)
require('newrelic');
```

### 2. Error Tracking

#### Sentry Setup

```javascript
// Install the Sentry SDK
npm install @sentry/node @sentry/tracing --save

// Initialize Sentry in main application file
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  tracesSampleRate: 0.5,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    // Additional integrations based on your framework
  ],
});

// Add Sentry middleware to your Express app
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Error handler middleware (should be after all routes)
app.use(Sentry.Handlers.errorHandler());
```

### 3. Metrics Collection

#### Prometheus Setup

```bash
# Docker Compose configuration for Prometheus
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    restart: always
```

#### prometheus.yml Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'realstack-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:3000']
  
  - job_name: 'realstack-frontend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['frontend:3001']
  
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

#### Node.js Prometheus Integration

```javascript
// Install the Prometheus client
npm install prom-client --save

// Setup in your application
const prometheus = require('prom-client');
const collectDefaultMetrics = prometheus.collectDefaultMetrics;

// Collect default metrics
collectDefaultMetrics({ timeout: 5000 });

// Custom metrics example
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  // buckets for response time from 0.1ms to 500ms
  buckets: [0.1, 1, 5, 15, 50, 100, 200, 300, 400, 500]
});

// Register route for metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});

// Use middleware to time requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});
```

### 4. Visualization

#### Grafana Setup

```bash
# Docker Compose configuration for Grafana
version: '3'
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-storage:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
    restart: always

volumes:
  grafana-storage:
```

#### Sample Dashboard Configuration

Create JSON dashboard configurations in a `dashboards` folder, including:

- System Dashboard (CPU, Memory, Disk)
- API Performance Dashboard
- Frontend Performance Dashboard
- Error Rates Dashboard
- User Activity Dashboard

### 5. Log Management

#### ELK Stack Setup

```bash
# Docker Compose configuration for ELK Stack
version: '3'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
    environment:
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    restart: always

  logstash:
    image: docker.elastic.co/logstash/logstash:7.14.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch
    restart: always

  kibana:
    image: docker.elastic.co/kibana/kibana:7.14.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    restart: always

volumes:
  elasticsearch-data:
```

#### Winston ELK Integration

```javascript
// Install Winston and related packages
npm install winston winston-elasticsearch --save

// Setup Winston logger with Elasticsearch transport
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const esTransportOpts = {
  level: 'info',
  clientOpts: { node: 'http://elasticsearch:9200' },
  indexPrefix: 'realstack-logs'
};

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'realstack-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new ElasticsearchTransport(esTransportOpts)
  ]
});

// Usage example
logger.info('API server started', { port: 3000 });
logger.error('Database connection failed', { error: err.message });
```

### 6. Alerting

#### PagerDuty Integration

```javascript
// Install PagerDuty client
npm install @pagerduty/pdjs --save

// Setup PagerDuty client
const { api } = require('@pagerduty/pdjs');

const pd = api({ token: 'YOUR_PAGERDUTY_API_KEY' });

// Create incident function
async function createIncident(title, details) {
  try {
    const response = await pd.post('/incidents', {
      data: {
        type: 'incident',
        title,
        service: {
          id: 'YOUR_SERVICE_ID',
          type: 'service_reference'
        },
        body: {
          type: 'incident_body',
          details
        }
      }
    });
    
    return response.data;
  } catch (err) {
    console.error('Failed to create PagerDuty incident:', err);
  }
}

// Example usage
// createIncident('Database connection failure', 'The API server cannot connect to the database.');
```

## Alert Rules Configuration

### Prometheus Alert Rules

Create `prometheus-rules.yml`:

```yaml
groups:
  - name: RealStack Alerts
    rules:
      - alert: HighAPILatency
        expr: avg(http_request_duration_ms{route="/api/assets"}) > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "API latency is above 500ms for 5 minutes"

      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for 5 minutes"

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 85% for 10 minutes"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90% for 10 minutes"

      - alert: LowDiskSpace
        expr: node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100 < 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space"
          description: "Disk space is below 10%"
```

## Recommended Dashboard Metrics

### System Dashboard
- CPU Usage (per core and total)
- Memory Usage (used, free, cached)
- Disk Usage (space used, I/O operations)
- Network Traffic (bytes in/out, packets in/out)
- System Load Average

### API Performance Dashboard
- Request Rate (requests per second)
- Response Time (average, p90, p95, p99)
- Error Rate (5xx and 4xx errors)
- Success Rate (2xx responses)
- Endpoint-specific Metrics

### Frontend Performance Dashboard
- Page Load Time
- Time to First Byte (TTFB)
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

### User Activity Dashboard
- Active Users (real-time, daily, monthly)
- Session Duration
- Conversion Rates
- Feature Usage
- User Journeys

## Implementation Checklist

- [ ] Install and configure APM (New Relic)
- [ ] Set up error tracking with Sentry
- [ ] Deploy Prometheus and exporters
- [ ] Configure Grafana dashboards
- [ ] Implement ELK stack for log management
- [ ] Set up alerting with PagerDuty
- [ ] Create alert rules and thresholds
- [ ] Document monitoring procedures
- [ ] Train team on monitoring tools and practices
- [ ] Establish on-call rotation schedule

## Maintenance and Best Practices

1. **Regular Review**: Schedule monthly reviews of monitoring setup and alerts
2. **Alert Tuning**: Regularly tune alert thresholds to reduce alert fatigue
3. **Dashboard Iteration**: Continuously improve dashboards based on team feedback
4. **Documentation**: Keep monitoring documentation up-to-date
5. **Incident Post-mortems**: Document and learn from incidents
6. **Capacity Planning**: Use historical data for capacity planning
7. **Security**: Regularly review and update access controls to monitoring systems

## References and Tools

- [New Relic Documentation](https://docs.newrelic.com/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Elasticsearch Documentation](https://www.elastic.co/guide/index.html)
- [PagerDuty Documentation](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgw-rest-api-v2-overview) 