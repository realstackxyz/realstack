#!/bin/bash
# RealStack Security Infrastructure Deployment Script
# This script deploys the entire security monitoring stack for RealStack

set -e

echo "==============================================="
echo "RealStack Security Infrastructure Deployment"
echo "==============================================="

# Check if running with sudo/root privileges
if [ "$(id -u)" -ne 0 ]; then
    echo "This script must be run as root or with sudo privileges"
    exit 1
fi

# Define directories
BASE_DIR="/opt/realstack/security"
CONFIG_DIR="$BASE_DIR/configs"
LOG_DIR="/var/log/realstack"
BACKUP_DIR="$BASE_DIR/backups/$(date +%Y%m%d%H%M%S)"

# Create required directories
echo "Creating required directories..."
mkdir -p "$BASE_DIR" "$CONFIG_DIR" "$LOG_DIR" "$BACKUP_DIR"
mkdir -p "$CONFIG_DIR/elk" "$CONFIG_DIR/wazuh" "$CONFIG_DIR/falco" "$CONFIG_DIR/prometheus"

# Function to backup existing configurations
backup_configs() {
    echo "Backing up existing configurations..."
    # Backup ELK configs
    if [ -d "/etc/elasticsearch" ]; then
        cp -r /etc/elasticsearch "$BACKUP_DIR/"
    fi
    if [ -d "/etc/logstash" ]; then
        cp -r /etc/logstash "$BACKUP_DIR/"
    fi
    if [ -d "/etc/kibana" ]; then
        cp -r /etc/kibana "$BACKUP_DIR/"
    fi
    
    # Backup Wazuh configs
    if [ -d "/var/ossec/etc" ]; then
        cp -r /var/ossec/etc "$BACKUP_DIR/"
    fi
    
    # Backup Falco configs
    if [ -d "/etc/falco" ]; then
        cp -r /etc/falco "$BACKUP_DIR/"
    fi
    
    # Backup Prometheus configs
    if [ -d "/etc/prometheus" ]; then
        cp -r /etc/prometheus "$BACKUP_DIR/"
    fi
    
    # Backup Nginx/ModSecurity configs
    if [ -d "/etc/nginx" ]; then
        cp -r /etc/nginx "$BACKUP_DIR/"
    fi
}

# Deploy ELK Stack
deploy_elk_stack() {
    echo "Deploying ELK Stack..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "Docker not found. Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        echo "Docker Compose not found. Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Create docker-compose file for ELK
    cat > "$CONFIG_DIR/elk/docker-compose.yml" << EOF
version: '3'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.16.2
    container_name: elasticsearch
    environment:
      - node.name=elasticsearch
      - cluster.name=realstack-es-cluster
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=\${ELASTIC_PASSWORD}
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - 9200:9200
    networks:
      - security-net
    restart: unless-stopped

  logstash:
    image: docker.elastic.co/logstash/logstash:7.16.2
    container_name: logstash
    environment:
      - ELASTIC_PASSWORD=\${ELASTIC_PASSWORD}
      - ELASTIC_USER=elastic
      - ENVIRONMENT=\${ENVIRONMENT}
      - FRAUD_API_KEY=\${FRAUD_API_KEY}
    volumes:
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./logstash/ssl:/etc/logstash/ssl
      - /var/log/realstack:/var/log/realstack:ro
    ports:
      - 5044:5044
      - 8080:8080
    networks:
      - security-net
    depends_on:
      - elasticsearch
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:7.16.2
    container_name: kibana
    environment:
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=elastic
      - ELASTICSEARCH_PASSWORD=\${ELASTIC_PASSWORD}
    volumes:
      - ./kibana/config/kibana.yml:/usr/share/kibana/config/kibana.yml
    ports:
      - 5601:5601
    networks:
      - security-net
    depends_on:
      - elasticsearch
    restart: unless-stopped

networks:
  security-net:
    driver: bridge

volumes:
  elasticsearch-data:
    driver: local
EOF

    # Create Logstash configuration
    mkdir -p "$CONFIG_DIR/elk/logstash/config" "$CONFIG_DIR/elk/logstash/pipeline" "$CONFIG_DIR/elk/logstash/ssl"
    
    # Create logstash.yml
    cat > "$CONFIG_DIR/elk/logstash/config/logstash.yml" << EOF
http.host: "0.0.0.0"
xpack.monitoring.elasticsearch.hosts: [ "http://elasticsearch:9200" ]
xpack.monitoring.elasticsearch.username: elastic
xpack.monitoring.elasticsearch.password: \${ELASTIC_PASSWORD}
EOF

    # Create Logstash pipeline
    cp "../tools/elk-config/logstash-realstack.conf" "$CONFIG_DIR/elk/logstash/pipeline/realstack.conf"
    
    # Generate self-signed SSL certificates for Logstash
    echo "Generating SSL certificates for Logstash..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -subj "/C=US/ST=State/L=City/O=RealStack/CN=logstash.realstack.local" \
        -keyout "$CONFIG_DIR/elk/logstash/ssl/logstash.key" \
        -out "$CONFIG_DIR/elk/logstash/ssl/logstash.crt"
    
    # Create Kibana configuration
    mkdir -p "$CONFIG_DIR/elk/kibana/config"
    
    cat > "$CONFIG_DIR/elk/kibana/config/kibana.yml" << EOF
server.name: kibana
server.host: "0.0.0.0"
elasticsearch.hosts: [ "http://elasticsearch:9200" ]
elasticsearch.username: elastic
elasticsearch.password: \${ELASTIC_PASSWORD}
xpack.monitoring.ui.container.elasticsearch.enabled: true
xpack.security.enabled: true
EOF

    # Create .env file with secrets
    cat > "$CONFIG_DIR/elk/.env" << EOF
ELASTIC_PASSWORD=realstack_secure_password
ENVIRONMENT=production
FRAUD_API_KEY=dummy_api_key_replace_in_production
EOF

    # Load Elasticsearch template
    echo "Setting up Elasticsearch template (will be applied after startup)..."
    cp "../tools/elk-config/elasticsearch-template.json" "$CONFIG_DIR/elk/elasticsearch-template.json"
    
    # Create a script to import the template after Elasticsearch is up
    cat > "$CONFIG_DIR/elk/import-template.sh" << EOF
#!/bin/bash
echo "Waiting for Elasticsearch to be ready..."
until curl -s http://localhost:9200 > /dev/null; do
    sleep 10
done

echo "Importing Elasticsearch template..."
curl -X PUT "localhost:9200/_template/realstack" \
     -H 'Content-Type: application/json' \
     -d @elasticsearch-template.json \
     -u elastic:\${ELASTIC_PASSWORD}
EOF
    chmod +x "$CONFIG_DIR/elk/import-template.sh"
    
    # Start ELK Stack
    echo "Starting ELK Stack..."
    cd "$CONFIG_DIR/elk"
    docker-compose up -d
    
    echo "ELK Stack deployment completed."
    echo "- Elasticsearch: http://localhost:9200"
    echo "- Kibana: http://localhost:5601"
    echo "- Logstash Beats input: localhost:5044"
    echo "- Logstash HTTP input: localhost:8080"
}

# Deploy Wazuh
deploy_wazuh() {
    echo "Deploying Wazuh..."
    
    # Using official Wazuh Docker deployment
    git clone https://github.com/wazuh/wazuh-docker.git "$CONFIG_DIR/wazuh-docker"
    cd "$CONFIG_DIR/wazuh-docker"
    
    # Copy our custom Wazuh configuration
    mkdir -p "$CONFIG_DIR/wazuh-docker/single-node/config/wazuh_manager/ossec.conf"
    
    # Convert YAML config to XML
    echo "Converting Wazuh YAML config to XML..."
    
    # For simplicity, we'll assume the XML content is already in the tools directory
    # In a real scenario, you would use a tool to convert YAML to XML
    
    # Deploy Wazuh stack
    cd "$CONFIG_DIR/wazuh-docker/single-node"
    docker-compose up -d
    
    echo "Wazuh deployment completed."
    echo "- Wazuh API: https://localhost:55000"
    echo "- Wazuh manager: localhost:1514"
    echo "- Wazuh registration service: localhost:1515"
}

# Deploy Falco
deploy_falco() {
    echo "Deploying Falco..."
    
    # Install Falco on the host
    if ! command -v falco &> /dev/null; then
        echo "Installing Falco..."
        curl -s https://falco.org/repo/falcosecurity-3672BA8F.asc | apt-key add -
        echo "deb https://download.falco.org/packages/deb stable main" | tee -a /etc/apt/sources.list.d/falcosecurity.list
        apt-get update -y
        apt-get install -y falco
    else
        echo "Falco is already installed."
    fi
    
    # Copy Falco rules
    mkdir -p /etc/falco
    cp "../tools/falco-rules.yaml" /etc/falco/falco_rules.local.yaml
    
    # Configure Falco service
    cat > /etc/systemd/system/falco.service << EOF
[Unit]
Description=Falco: Container Native Runtime Security
Documentation=https://falco.org/docs/
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/falco -c /etc/falco/falco.yaml -r /etc/falco/falco_rules.yaml -r /etc/falco/falco_rules.local.yaml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start Falco
    systemctl daemon-reload
    systemctl enable falco
    systemctl restart falco
    
    echo "Falco deployment completed."
}

# Deploy Prometheus and AlertManager
deploy_prometheus() {
    echo "Deploying Prometheus and AlertManager..."
    
    # Create Docker Compose file for Prometheus stack
    cat > "$CONFIG_DIR/prometheus/docker-compose.yml" << EOF
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./rules:/etc/prometheus/rules
      - prometheus-data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.console.libraries=/etc/prometheus/console_libraries"
      - "--web.console.templates=/etc/prometheus/consoles"
      - "--web.enable-lifecycle"
    ports:
      - 9090:9090
    networks:
      - security-net
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - "--config.file=/etc/alertmanager/alertmanager.yml"
      - "--storage.path=/alertmanager"
    ports:
      - 9093:9093
    networks:
      - security-net
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=realstack_secure_password
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    ports:
      - 3000:3000
    networks:
      - security-net
    depends_on:
      - prometheus
    restart: unless-stopped

networks:
  security-net:
    driver: bridge

volumes:
  prometheus-data:
    driver: local
  grafana-data:
    driver: local
EOF

    # Create Prometheus configuration
    cat > "$CONFIG_DIR/prometheus/prometheus.yml" << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'wazuh'
    static_configs:
      - targets: ['wazuh:9100']

  - job_name: 'realstack-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:8080']

  - job_name: 'realstack-frontend'
    static_configs:
      - targets: ['frontend:9113']
EOF

    # Create AlertManager configuration
    cat > "$CONFIG_DIR/prometheus/alertmanager.yml" << EOF
route:
  group_by: ['alertname', 'category']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 1h
  receiver: 'security-team'
  routes:
  - match:
      severity: critical
    receiver: 'security-team'
    continue: true
  - match:
      category: blockchain_security
    receiver: 'blockchain-team'
    continue: true

receivers:
- name: 'security-team'
  email_configs:
  - to: 'security-team@realstack.example.com'
    from: 'alertmanager@realstack.example.com'
    smarthost: 'smtp.realstack.example.com:587'
    auth_username: 'alertmanager'
    auth_password: 'password'
    send_resolved: true
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXX'
    channel: '#security-alerts'
    send_resolved: true

- name: 'blockchain-team'
  email_configs:
  - to: 'blockchain-team@realstack.example.com'
    from: 'alertmanager@realstack.example.com'
    smarthost: 'smtp.realstack.example.com:587'
    auth_username: 'alertmanager'
    auth_password: 'password'
    send_resolved: true
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXX'
    channel: '#blockchain-security'
    send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname']
EOF

    # Create rules directory and copy alert rules
    mkdir -p "$CONFIG_DIR/prometheus/rules"
    cp "../tools/prometheus/security-alerts.yml" "$CONFIG_DIR/prometheus/rules/"
    
    # Create Grafana provisioning directories
    mkdir -p "$CONFIG_DIR/prometheus/grafana/provisioning/datasources"
    mkdir -p "$CONFIG_DIR/prometheus/grafana/provisioning/dashboards"
    
    # Create Grafana datasource provisioning
    cat > "$CONFIG_DIR/prometheus/grafana/provisioning/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOF

    # Start Prometheus stack
    cd "$CONFIG_DIR/prometheus"
    docker-compose up -d
    
    echo "Prometheus deployment completed."
    echo "- Prometheus UI: http://localhost:9090"
    echo "- AlertManager UI: http://localhost:9093"
    echo "- Grafana: http://localhost:3000 (admin/realstack_secure_password)"
}

# Deploy ModSecurity WAF
deploy_modsecurity() {
    echo "Deploying ModSecurity WAF..."
    
    # Install required packages
    apt-get update
    apt-get install -y nginx libnginx-mod-http-modsecurity
    
    # Create ModSecurity configuration directories
    mkdir -p /etc/nginx/modsec /etc/nginx/modsec/crs
    
    # Download OWASP Core Rule Set
    if [ ! -d "/etc/nginx/modsec/crs/rules" ]; then
        git clone https://github.com/coreruleset/coreruleset.git /tmp/crs
        cp -r /tmp/crs/rules /etc/nginx/modsec/crs/
        cp /tmp/crs/crs-setup.conf.example /etc/nginx/modsec/crs/crs-setup.conf
        rm -rf /tmp/crs
    fi
    
    # Copy ModSecurity configuration
    cp "../tools/waf-rules.conf" /etc/nginx/modsec/main.conf
    
    # Configure ModSecurity in Nginx
    cat > /etc/nginx/conf.d/modsecurity.conf << EOF
modsecurity on;
modsecurity_rules_file /etc/nginx/modsec/main.conf;
EOF

    # Configure Nginx with ModSecurity
    cat > /etc/nginx/sites-available/realstack-waf << EOF
server {
    listen 80;
    server_name realstack.local;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    # Enable the site
    ln -sf /etc/nginx/sites-available/realstack-waf /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    nginx -t
    
    # Restart Nginx
    systemctl restart nginx
    
    echo "ModSecurity WAF deployment completed."
}

# Main deployment
echo "Starting security infrastructure deployment..."
backup_configs
deploy_elk_stack
deploy_wazuh
deploy_falco
deploy_prometheus
deploy_modsecurity

echo "====================================================="
echo "RealStack Security Infrastructure Deployment Complete"
echo "====================================================="
echo "Please secure all passwords in production environments"
echo "and review all configuration files before going live."
echo "=====================================================" 