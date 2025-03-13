#!/bin/bash
# Monitoring System Health Check Script
# This script verifies that all monitoring components are running properly

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_URL=${PROMETHEUS_URL:-"http://localhost:9090"}
GRAFANA_URL=${GRAFANA_URL:-"http://localhost:3000"}
ALERTMANAGER_URL=${ALERTMANAGER_URL:-"http://localhost:9093"}
BLOCKCHAIN_EXPORTER_URL=${BLOCKCHAIN_EXPORTER_URL:-"http://localhost:9101"}
ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-"http://localhost:9200"}
KIBANA_URL=${KIBANA_URL:-"http://localhost:5601"}

# Function to check if a service is up
check_service() {
  local service_name=$1
  local service_url=$2
  local health_endpoint=${3:-"/"}
  
  echo -e "${YELLOW}Checking $service_name...${NC}"
  
  # Use curl to check if the service is responding
  if curl -s -f -m 5 "$service_url$health_endpoint" > /dev/null; then
    echo -e "${GREEN}✓ $service_name is up and running at $service_url${NC}"
    return 0
  else
    echo -e "${RED}✗ $service_name is not responding at $service_url${NC}"
    return 1
  fi
}

# Function to check Prometheus targets status
check_prometheus_targets() {
  echo -e "${YELLOW}Checking Prometheus targets...${NC}"
  
  # Get active targets from Prometheus API
  local targets_response=$(curl -s -m 5 "$PROMETHEUS_URL/api/v1/targets")
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to retrieve targets from Prometheus${NC}"
    return 1
  fi
  
  # Count targets
  local total_targets=$(echo "$targets_response" | grep -o '"endpoint":' | wc -l)
  local up_targets=$(echo "$targets_response" | grep -o '"health":"up"' | wc -l)
  
  if [ $total_targets -eq 0 ]; then
    echo -e "${RED}✗ No targets found in Prometheus${NC}"
    return 1
  fi
  
  # Calculate percentage of up targets
  local up_percentage=$((up_targets * 100 / total_targets))
  
  if [ $up_percentage -eq 100 ]; then
    echo -e "${GREEN}✓ All $total_targets targets are up${NC}"
    return 0
  elif [ $up_percentage -ge 80 ]; then
    echo -e "${YELLOW}⚠ $up_targets/$total_targets targets are up ($up_percentage%)${NC}"
    return 0
  else
    echo -e "${RED}✗ Only $up_targets/$total_targets targets are up ($up_percentage%)${NC}"
    return 1
  fi
}

# Function to check Grafana dashboards
check_grafana_dashboards() {
  echo -e "${YELLOW}Checking Grafana dashboards...${NC}"
  
  # This requires Grafana API key to check dashboards
  # For simplicity, we'll just check if Grafana is up
  if check_service "Grafana" "$GRAFANA_URL" "/api/health"; then
    echo -e "${GREEN}✓ Grafana is healthy${NC}"
    return 0
  else
    return 1
  fi
}

# Function to check Elasticsearch indices
check_elasticsearch_indices() {
  echo -e "${YELLOW}Checking Elasticsearch indices...${NC}"
  
  # Check if Elasticsearch is up
  local health_response=$(curl -s -m 5 "$ELASTICSEARCH_URL/_cluster/health")
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to connect to Elasticsearch${NC}"
    return 1
  fi
  
  # Check cluster status
  local status=$(echo "$health_response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  
  if [ "$status" = "green" ]; then
    echo -e "${GREEN}✓ Elasticsearch cluster is healthy (status: green)${NC}"
    return 0
  elif [ "$status" = "yellow" ]; then
    echo -e "${YELLOW}⚠ Elasticsearch cluster is in warning state (status: yellow)${NC}"
    return 0
  else
    echo -e "${RED}✗ Elasticsearch cluster is unhealthy (status: $status)${NC}"
    return 1
  fi
}

# Main health check function
run_health_check() {
  echo -e "${YELLOW}=== RealStack Monitoring System Health Check ===${NC}"
  echo -e "${YELLOW}$(date)${NC}"
  echo
  
  # Check core services
  local failures=0
  
  check_service "Prometheus" "$PROMETHEUS_URL" "/-/healthy" || ((failures++))
  check_service "Grafana" "$GRAFANA_URL" "/api/health" || ((failures++))
  check_service "Alertmanager" "$ALERTMANAGER_URL" "/-/healthy" || ((failures++))
  check_service "Blockchain Exporter" "$BLOCKCHAIN_EXPORTER_URL" "/health" || ((failures++))
  check_service "Elasticsearch" "$ELASTICSEARCH_URL" || ((failures++))
  check_service "Kibana" "$KIBANA_URL" "/api/status" || ((failures++))
  
  echo
  
  # Check advanced status if core services are up
  if [ $failures -eq 0 ]; then
    check_prometheus_targets || ((failures++))
    check_grafana_dashboards || ((failures++))
    check_elasticsearch_indices || ((failures++))
  fi
  
  echo
  
  # Print summary
  if [ $failures -eq 0 ]; then
    echo -e "${GREEN}=== All monitoring systems are healthy ===${NC}"
    exit 0
  else
    echo -e "${RED}=== $failures monitoring components reported issues ===${NC}"
    exit 1
  fi
}

# Run the health check
run_health_check 