# RealStack 安全工具配置

本目录包含 RealStack 平台使用的各种安全工具的配置文件。这些配置文件已针对 RealStack 的特定需求进行了优化，并集成到整体安全架构中。

## 目录结构

```
tools/
├── waf-rules.conf             # ModSecurity WAF 规则配置
├── falco-rules.yaml           # Falco 容器安全监控规则
├── wazuh-config.yaml          # Wazuh 主机入侵检测系统配置
├── elk-config/                # ELK Stack 日志分析配置
│   ├── logstash-realstack.conf  # Logstash 配置
│   └── elasticsearch-template.json  # Elasticsearch 索引模板
└── prometheus/                # Prometheus 告警配置
    └── security-alerts.yml    # 安全相关告警规则
```

## 安全工具概览

### ModSecurity WAF

[ModSecurity](https://github.com/SpiderLabs/ModSecurity) 是一个开源的 Web 应用防火墙(WAF)，用于保护 Web 应用程序免受各种攻击。

**配置文件**: `waf-rules.conf`

**主要功能**:
- SQL 注入防护
- XSS 攻击防护
- 路径遍历防护
- 命令注入防护
- 区块链特定保护规则
- API 速率限制规则
- 文件上传保护
- CSRF 保护

**部署位置**: 通常部署在 Nginx/Apache 的配置目录，如 `/etc/nginx/modsec/`

### Falco

[Falco](https://falco.org/) 是一个开源的容器运行时安全监控工具，能够检测容器环境中的异常行为。

**配置文件**: `falco-rules.yaml`

**主要功能**:
- 容器中的终端 Shell 使用检测
- 特权提升尝试检测
- 敏感文件访问监控
- 网络异常行为检测
- 区块链配置文件修改监控
- 密钥文件导出检测
- 加密货币挖矿行为检测
- 反向 Shell 检测

**部署位置**: 配置文件通常放置在 `/etc/falco/falco_rules.local.yaml`

### Wazuh

[Wazuh](https://wazuh.com/) 是一个开源的安全监控平台，提供主机入侵检测、日志分析和安全分析。

**配置文件**: `wazuh-config.yaml`

**主要功能**:
- 文件完整性监控
- Rootkit 检测
- 漏洞检测
- 日志收集与分析
- 安全事件响应
- 自定义安全规则
- 与 ELK Stack 集成
- 主动响应自动化

**部署位置**: 配置通常应用到 `/var/ossec/etc/ossec.conf`

### ELK Stack 配置

[ELK Stack](https://www.elastic.co/elastic-stack) (Elasticsearch, Logstash, Kibana) 用于日志收集、处理和可视化。

**配置文件**:
- `elk-config/logstash-realstack.conf`: Logstash 管道配置
- `elk-config/elasticsearch-template.json`: Elasticsearch 索引模板

**主要功能**:
- 应用日志收集和解析
- 安全日志增强处理
- 区块链交易日志特殊处理
- 地理位置信息处理
- 高严重性安全告警转发
- 日志完整性验证

**部署位置**:
- Logstash 配置: `/etc/logstash/conf.d/`
- Elasticsearch 模板: 通过 API 加载或 `/etc/elasticsearch/templates/`

### Prometheus 告警规则

[Prometheus](https://prometheus.io/) 用于监控指标收集和告警。

**配置文件**: `prometheus/security-alerts.yml`

**主要功能**:
- API 安全告警规则
- 认证安全告警规则
- 区块链安全告警规则
- 钱包安全告警规则
- 服务器安全告警规则
- 数据库安全告警规则
- WAF 安全告警规则
- 综合安全告警规则
- 异常用户行为检测

**部署位置**: `/etc/prometheus/rules/`

## 如何使用这些配置

### 安装和部署工具

每个工具需要单独安装。在安装后，可以使用此目录中的配置文件替换默认配置:

```bash
# ModSecurity 示例
sudo cp waf-rules.conf /etc/nginx/modsec/main.conf
sudo nginx -t
sudo systemctl reload nginx

# Falco 示例
sudo cp falco-rules.yaml /etc/falco/falco_rules.local.yaml
sudo systemctl restart falco

# Wazuh 示例 (需要额外处理，因为使用 YAML 格式)
sudo python3 /opt/scripts/wazuh_yaml_to_xml.py wazuh-config.yaml > /var/ossec/etc/ossec.conf
sudo systemctl restart wazuh-manager

# Logstash 示例
sudo cp elk-config/logstash-realstack.conf /etc/logstash/conf.d/
sudo systemctl restart logstash

# Prometheus 告警规则示例
sudo cp prometheus/security-alerts.yml /etc/prometheus/rules/
sudo systemctl reload prometheus
```

### 测试配置

每个工具都有其测试配置的方法:

```bash
# ModSecurity 测试
sudo nginx -t

# Falco 规则测试
sudo falco -L -r falco-rules.yaml

# Wazuh 配置检查
sudo /var/ossec/bin/ossec-logtest -c /var/ossec/etc/ossec.conf

# Logstash 配置测试
sudo -u logstash /usr/share/logstash/bin/logstash --config.test_and_exit -f /etc/logstash/conf.d/logstash-realstack.conf

# Prometheus 配置测试
promtool check rules /etc/prometheus/rules/security-alerts.yml
```

## 自定义和维护

### 更新规则

这些配置文件应定期更新以应对新的安全威胁和业务需求:

1. 根据安全团队的建议修改规则文件
2. 测试配置更改
3. 部署到测试环境
4. 验证有效性并检查误报情况
5. 部署到生产环境

### 日志和告警

所有工具都配置为将日志发送到中央日志系统(ELK Stack)，并设置了适当的告警阈值。请确保:

1. 监控告警通道 (如 Slack、电子邮件)
2. 定期检查告警阈值的有效性
3. 审查和处理误报
4. 根据安全事件响应计划处理真实告警

## 集成点

这些安全工具的集成点包括:

- **日志集中化**: 所有工具都配置为发送日志到 ELK Stack
- **告警统一**: 关键告警通过 Prometheus AlertManager 路由
- **监控仪表盘**: 通过 Grafana 和 Kibana 查看安全状态
- **自动响应**: 某些攻击可触发自动响应措施

## 联系人

如果您有关于这些安全工具配置的问题或建议，请联系:

- 安全团队: security-team@realstack.example.com
- DevOps 团队: devops@realstack.example.com 