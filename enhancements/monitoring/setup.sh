#!/bin/bash

# RealStack Monitoring Setup Script
#
# This script sets up the complete monitoring infrastructure
# including Prometheus, Grafana, Alertmanager, and ELK stack

set -e

# Create necessary directories
mkdir -p prometheus-rules
mkdir -p alertmanager
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards
mkdir -p grafana/dashboards
mkdir -p logstash/config
mkdir -p logstash/pipeline

# Copy Prometheus rules
cp prometheus-rules/alerts.yml prometheus-rules/

# Create Grafana datasource provisioning
cat > grafana/provisioning/datasources/datasource.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "realstack-logs-*"
    jsonData:
      timeField: "@timestamp"
      esVersion: 7.10.0
      maxConcurrentShardRequests: 5
    editable: false
EOF

# Create Grafana dashboard provisioning
cat > grafana/provisioning/dashboards/dashboards.yml << EOF
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Copy dashboard JSON files
cp grafana/dashboards/system_dashboard.json grafana/dashboards/
cp grafana/dashboards/api_dashboard.json grafana/dashboards/
cp grafana/dashboards/blockchain_dashboard.json grafana/dashboards/

# Create Logstash configuration
cat > logstash/config/logstash.yml << EOF
http.host: "0.0.0.0"
xpack.monitoring.enabled: false
EOF

# Create Logstash pipeline
cat > logstash/pipeline/logstash.conf << EOF
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  if [type] == "nodejs" {
    json {
      source => "message"
    }
  }
  date {
    match => [ "timestamp", "ISO8601" ]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "realstack-logs-%{+YYYY.MM.dd}"
  }
}
EOF

# Build blockchain exporter Docker image
cd blockchain-exporter
docker build -t realstack/blockchain-exporter:latest .
cd ..

echo "Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

echo "Waiting for services to start..."
sleep 10

echo "Monitoring stack deployed successfully!"
echo "Access Prometheus at: http://localhost:9090"
echo "Access Grafana at: http://localhost:3000 (admin/secure_password)"
echo "Access Kibana at: http://localhost:5601"

echo "Setup complete!" 