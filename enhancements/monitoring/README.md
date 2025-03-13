# RealStack Monitoring System

This comprehensive monitoring system provides full observability for the RealStack platform, including system metrics, application performance, and blockchain-specific indicators.

## Components

The monitoring stack consists of:

1. **Prometheus** - Time-series database for metrics collection
2. **Grafana** - Visualization and dashboarding
3. **Alertmanager** - Alert routing and notification
4. **Node Exporter** - System metrics collection
5. **cAdvisor** - Container metrics collection
6. **ELK Stack** - Centralized logging (Elasticsearch, Logstash, Kibana)
7. **Blockchain Exporter** - Custom exporter for Solana blockchain metrics

## Architecture

![Monitoring Architecture](./docs/monitoring_architecture.png)

### Metrics Flow

1. Various exporters collect metrics and expose them in Prometheus format
2. Prometheus scrapes these metrics endpoints at regular intervals
3. Grafana queries Prometheus to visualize metrics in dashboards
4. Prometheus evaluates alert rules and sends alerts to Alertmanager
5. Alertmanager handles routing, grouping, and notification

### Logs Flow

1. Applications send logs to Logstash over TCP
2. Logstash processes and enriches logs
3. Elasticsearch stores and indexes logs
4. Kibana provides visualization and search interface for logs

## Dashboards

The following dashboards are included:

- **System Dashboard** - CPU, memory, disk, and network metrics
- **API Dashboard** - Request rates, response times, error rates, and endpoint-specific metrics
- **Blockchain Dashboard** - Solana RPC metrics, transaction rates, token values, and blockchain status

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- 4GB+ RAM for the full stack
- Open ports for Prometheus (9090), Grafana (3000), and Kibana (5601)

### Installation

1. Clone this repository
2. Run the setup script:

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Create necessary directories
- Configure Prometheus, Grafana, and Alertmanager
- Build the custom blockchain exporter
- Start all services with Docker Compose

### Accessing Services

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/secure_password)
- **Kibana**: http://localhost:5601
- **Alertmanager**: http://localhost:9093

## Configuration

### Adding New Metrics

1. For application metrics, use the Prometheus client library for your language
2. Expose metrics on a `/metrics` endpoint
3. Add the endpoint to `prometheus.yml` under `scrape_configs`

### Creating Alerts

1. Add new alert rules to the `prometheus-rules/alerts.yml` file
2. Reload Prometheus configuration:

```bash
curl -X POST http://localhost:9090/-/reload
```

### Modifying Alert Notifications

1. Edit the `alertmanager/alertmanager.yml` file
2. Reload Alertmanager configuration:

```bash
curl -X POST http://localhost:9093/-/reload
```

## Integration with Application Code

### Adding Metrics to Node.js Services

```javascript
const prometheus = require('prom-client');

// Create a metric
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 1, 5, 15, 50, 100, 200, 500]
});

// Register metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### Sending Logs to ELK Stack

```javascript
const winston = require('winston');
const { createLogger, format, transports } = winston;

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.Socket({
      host: 'logstash',
      port: 5000,
      tls: false
    })
  ]
});

// Usage
logger.info('API request processed', { path: '/api/assets', duration: 120 });
```

## Maintenance

### Backup

To backup Prometheus data:

```bash
docker run --rm -v prometheus_data:/source -v $(pwd)/backups:/backup alpine tar czf /backup/prometheus-backup-$(date +%Y%m%d).tar.gz -C /source .
```

To backup Grafana configuration:

```bash
docker run --rm -v grafana_data:/source -v $(pwd)/backups:/backup alpine tar czf /backup/grafana-backup-$(date +%Y%m%d).tar.gz -C /source .
```

### Scaling

For larger deployments:

1. Configure Prometheus in federation mode
2. Set up Thanos for long-term storage
3. Add Grafana in high-availability mode
4. Scale Elasticsearch as a cluster

## Troubleshooting

### Common Issues

- **Prometheus not scraping targets**: Check network connectivity and firewall rules
- **Grafana not showing data**: Verify Prometheus data source configuration
- **High disk usage**: Adjust Prometheus retention settings in `docker-compose.monitoring.yml`
- **Missing logs in Kibana**: Check Logstash pipeline configuration

## License

MIT

## Contact

For support or questions, contact the RealStack DevOps team. 