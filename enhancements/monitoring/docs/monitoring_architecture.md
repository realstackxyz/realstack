# Monitoring Architecture Diagram

This file serves as a placeholder for the monitoring architecture diagram.

## Diagram Description

The diagram should illustrate the following components and their relationships:

1. **Data Sources**
   - RealStack API services with metrics endpoints
   - RealStack frontend services with metrics endpoints
   - Host systems (via Node Exporter)
   - Docker containers (via cAdvisor)
   - Solana blockchain (via custom Blockchain Exporter)

2. **Metrics Collection**
   - Prometheus server scraping all metrics endpoints
   - Alert rules evaluation

3. **Log Collection**
   - Application logs flowing to Logstash
   - Logstash processing and forwarding to Elasticsearch

4. **Storage**
   - Prometheus time-series database
   - Elasticsearch log storage

5. **Visualization & Alerting**
   - Grafana dashboards connected to Prometheus and Elasticsearch
   - Alertmanager receiving alerts from Prometheus
   - Alert notification channels (email, Slack, PagerDuty)

6. **User Access**
   - DevOps team accessing monitoring UIs
   - Developers accessing metrics and logs

## Diagram Creation Instructions

To create the diagram:

1. Use a diagramming tool like draw.io, Lucidchart, or similar
2. Export the diagram as PNG format
3. Place the PNG file in this directory with the name `monitoring_architecture.png`
4. Update the README.md file to reference this diagram

## Sample Diagram Structure

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   API       │  │  Frontend   │  │    Host     │  Data       │
│  │  Services   │  │  Services   │  │   Systems   │  Sources    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                    │
│         ▼                ▼                ▼                    │
│  ┌──────────────────────────────────────────────┐             │
│  │                                              │             │
│  │               Prometheus                     │  Collection │
│  │                                              │             │
│  └──────────────┬───────────────┬──────────────┘             │
│                 │               │                            │
│                 ▼               ▼                            │
│  ┌─────────────────┐   ┌────────────────┐                    │
│  │                 │   │                │                    │
│  │     Grafana     │   │  Alertmanager  │  Visualization &   │
│  │                 │   │                │  Alerting          │
│  └─────────────────┘   └────────────────┘                    │
│                                                              │
└────────────────────────────────────────────────────────────────┘
```

Replace this placeholder file with the actual architecture diagram. 