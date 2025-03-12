#!/bin/bash
# Production Deployment Script for RealStack Monitoring System
# This script deploys the monitoring stack in a production environment

set -e

# Default configuration
DEPLOY_DIR="/opt/realstack/monitoring"
BACKUP_DIR="/opt/realstack/backups/monitoring"
MONITORING_SRC_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PROMETHEUS_RETENTION="30d"
DOMAIN_NAME="monitoring.realstack.io"
USE_SSL=true
SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 12)
ENABLE_BACKUPS=true
COMPOSE_FILE="docker-compose.monitoring.yml"

# Print banner
echo "=========================================================="
echo "  RealStack Monitoring System - Production Deployment"
echo "=========================================================="

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --deploy-dir)
      DEPLOY_DIR="$2"
      shift 2
      ;;
    --domain)
      DOMAIN_NAME="$2"
      shift 2
      ;;
    --no-ssl)
      USE_SSL=false
      shift
      ;;
    --rpc-url)
      SOLANA_RPC_URL="$2"
      shift 2
      ;;
    --grafana-password)
      GRAFANA_ADMIN_PASSWORD="$2"
      shift 2
      ;;
    --retention)
      PROMETHEUS_RETENTION="$2"
      shift 2
      ;;
    --no-backups)
      ENABLE_BACKUPS=false
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --deploy-dir DIR        Set deployment directory (default: /opt/realstack/monitoring)"
      echo "  --domain DOMAIN         Set domain name (default: monitoring.realstack.io)"
      echo "  --no-ssl                Disable SSL/TLS"
      echo "  --rpc-url URL           Set Solana RPC URL"
      echo "  --grafana-password PWD  Set Grafana admin password"
      echo "  --retention PERIOD      Set Prometheus data retention (default: 30d)"
      echo "  --no-backups            Disable automated backups"
      echo "  --help                  Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root or with sudo"
  exit 1
fi

# Create deployment directory
echo "Creating deployment directory: $DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
mkdir -p "$BACKUP_DIR"

# Copy files to deployment directory
echo "Copying monitoring files to deployment directory..."
cp -r "$MONITORING_SRC_DIR"/* "$DEPLOY_DIR/"

# Create .env file for production
cat > "$DEPLOY_DIR/.env" << EOF
# RealStack Monitoring - Production Environment Variables
DOMAIN_NAME=$DOMAIN_NAME
PROMETHEUS_RETENTION=$PROMETHEUS_RETENTION
SOLANA_RPC_URL=$SOLANA_RPC_URL
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
EOF

# Configure SSL if enabled
if [ "$USE_SSL" = true ]; then
  echo "Configuring SSL..."
  # Check if certbot is installed
  if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot
  fi
  
  # Create SSL certificate
  certbot certonly --standalone --agree-tos --email admin@realstack.io -d "$DOMAIN_NAME" -d "grafana.$DOMAIN_NAME" -d "prometheus.$DOMAIN_NAME" -d "alertmanager.$DOMAIN_NAME" -d "kibana.$DOMAIN_NAME"
  
  # Create SSL configuration for nginx
  mkdir -p "$DEPLOY_DIR/nginx/conf.d"
  
  cat > "$DEPLOY_DIR/nginx/conf.d/default.conf" << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME grafana.$DOMAIN_NAME prometheus.$DOMAIN_NAME alertmanager.$DOMAIN_NAME kibana.$DOMAIN_NAME;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN_NAME;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    location / {
        proxy_pass http://grafana:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name prometheus.$DOMAIN_NAME;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    location / {
        proxy_pass http://prometheus:9090;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        auth_basic "Prometheus";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}

server {
    listen 443 ssl;
    server_name alertmanager.$DOMAIN_NAME;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    location / {
        proxy_pass http://alertmanager:9093;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        auth_basic "Alertmanager";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}

server {
    listen 443 ssl;
    server_name kibana.$DOMAIN_NAME;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;
    
    location / {
        proxy_pass http://kibana:5601;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

  # Create password file for basic auth
  if ! command -v htpasswd &> /dev/null; then
    apt-get install -y apache2-utils
  fi
  
  mkdir -p "$DEPLOY_DIR/nginx"
  htpasswd -bc "$DEPLOY_DIR/nginx/.htpasswd" admin "$(openssl rand -base64 12)"
  
  # Update compose file to include nginx
  COMPOSE_FILE="docker-compose.monitoring.ssl.yml"
  
  cat > "$DEPLOY_DIR/$COMPOSE_FILE" << EOF
version: '3.8'

services:
  # Include all services from the main compose file
  # with an extension to add the nginx service
  
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/.htpasswd:/etc/nginx/.htpasswd
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - prometheus
      - grafana
      - alertmanager
      - kibana
    networks:
      - monitoring
    restart: unless-stopped

# Include other services from the main compose file
EOF

  # Append the main docker-compose file content excluding the version and networks declaration
  grep -v -E '^version:|^networks:' "$DEPLOY_DIR/docker-compose.monitoring.yml" >> "$DEPLOY_DIR/$COMPOSE_FILE"
  
  # Add the networks section at the end
  cat >> "$DEPLOY_DIR/$COMPOSE_FILE" << EOF

networks:
  monitoring:
    driver: bridge
EOF
fi

# Set up automated backups if enabled
if [ "$ENABLE_BACKUPS" = true ]; then
  echo "Setting up automated backups..."
  
  mkdir -p "$DEPLOY_DIR/backup-scripts"
  
  cat > "$DEPLOY_DIR/backup-scripts/backup.sh" << EOF
#!/bin/bash
# Automated backup script for RealStack Monitoring

TIMESTAMP=\$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_DIR/\$TIMESTAMP"
DOCKER_COMPOSE_FILE="$DEPLOY_DIR/$COMPOSE_FILE"
RETENTION_DAYS=7

mkdir -p "\$BACKUP_DIR"

# Backup Prometheus data
echo "Backing up Prometheus data..."
docker run --rm -v prometheus_data:/source -v "\$BACKUP_DIR:/backup" alpine tar czf "/backup/prometheus-\$TIMESTAMP.tar.gz" -C /source .

# Backup Grafana data
echo "Backing up Grafana data..."
docker run --rm -v grafana_data:/source -v "\$BACKUP_DIR:/backup" alpine tar czf "/backup/grafana-\$TIMESTAMP.tar.gz" -C /source .

# Backup Alertmanager data
echo "Backing up Alertmanager data..."
docker run --rm -v alertmanager_data:/source -v "\$BACKUP_DIR:/backup" alpine tar czf "/backup/alertmanager-\$TIMESTAMP.tar.gz" -C /source .

# Remove old backups
find "$BACKUP_DIR" -type d -mtime +\$RETENTION_DAYS -exec rm -rf {} \;

echo "Backup completed: \$BACKUP_DIR"
EOF

  chmod +x "$DEPLOY_DIR/backup-scripts/backup.sh"
  
  # Set up cron job for daily backups
  crontab -l 2>/dev/null | grep -v "$DEPLOY_DIR/backup-scripts/backup.sh" | crontab -
  (crontab -l 2>/dev/null; echo "0 2 * * * $DEPLOY_DIR/backup-scripts/backup.sh > $DEPLOY_DIR/backup-scripts/backup.log 2>&1") | crontab -
  
  echo "Automated backups scheduled daily at 2:00 AM"
fi

# Build and start the monitoring stack
echo "Building blockchain exporter image..."
cd "$DEPLOY_DIR/blockchain-exporter"
docker build -t realstack/blockchain-exporter:latest .
cd "$DEPLOY_DIR"

echo "Starting monitoring stack..."
docker-compose -f "$COMPOSE_FILE" up -d

echo "Waiting for services to start..."
sleep 10

# Create a script to check service health
cat > "$DEPLOY_DIR/check-health.sh" << 'EOF'
#!/bin/bash
$(cat "$DEPLOY_DIR/scripts/health-check.sh")
EOF

chmod +x "$DEPLOY_DIR/check-health.sh"

# Check if services are running
if "$DEPLOY_DIR/check-health.sh"; then
  echo "Success! Monitoring stack deployed successfully."
  
  if [ "$USE_SSL" = true ]; then
    echo ""
    echo "Access URLs:"
    echo "- Grafana: https://$DOMAIN_NAME (admin/$(echo $GRAFANA_ADMIN_PASSWORD))"
    echo "- Prometheus: https://prometheus.$DOMAIN_NAME (admin/$(grep -v "^#" "$DEPLOY_DIR/nginx/.htpasswd" | cut -d: -f2))"
    echo "- Alertmanager: https://alertmanager.$DOMAIN_NAME (same credentials as Prometheus)"
    echo "- Kibana: https://kibana.$DOMAIN_NAME"
  else
    echo ""
    echo "Access URLs (replace with your server's IP address):"
    echo "- Grafana: http://<server-ip>:3000 (admin/$(echo $GRAFANA_ADMIN_PASSWORD))"
    echo "- Prometheus: http://<server-ip>:9090"
    echo "- Alertmanager: http://<server-ip>:9093"
    echo "- Kibana: http://<server-ip>:5601"
  fi
else
  echo "Warning: Some services might not be running correctly. Please check the logs."
fi

echo ""
echo "Deployment directory: $DEPLOY_DIR"
echo "Configuration files are in this directory."
echo ""
echo "Useful commands:"
echo "- Check status: docker-compose -f $DEPLOY_DIR/$COMPOSE_FILE ps"
echo "- View logs: docker-compose -f $DEPLOY_DIR/$COMPOSE_FILE logs -f"
echo "- Stop services: docker-compose -f $DEPLOY_DIR/$COMPOSE_FILE down"
echo "- Check health: $DEPLOY_DIR/check-health.sh"
echo ""
echo "Complete! RealStack Monitoring System is now deployed." 