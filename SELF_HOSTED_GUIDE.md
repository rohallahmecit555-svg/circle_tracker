# Circle 追踪器 - 自托管部署完整指南

## 快速导航

本指南包含以下内容，建议按顺序阅读：

1. **[LOCAL_DEPLOYMENT_GUIDE.md](./LOCAL_DEPLOYMENT_GUIDE.md)** - 详细的本地部署步骤
2. **[RPC_SETUP_GUIDE.md](./RPC_SETUP_GUIDE.md)** - RPC 端点配置指南
3. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - 部署检查清单
4. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构设计

---

## 核心概念

### 什么是实时监测？

实时监测是指应用持续监听区块链网络，当有新的 USDC 转账事件发生时，立即捕获并分类。

**工作流程**：
```
启动监听器 → 每 60 秒检查新区块 → 解析 USDC Transfer 事件 
→ 识别交易类型 → 存储到数据库 → 检查告警条件 → 发送通知
```

### 什么是历史追溯？

历史追溯是指输入一个时间范围，系统会查询该时间段内所有的 USDC 转账，并按照您的条件进行筛选。

**工作流程**：
```
输入时间范围 → 转换为区块号 → 分批查询事件 
→ 解析和分类 → 存储结果 → 返回给用户
```

---

## 部署前需要准备什么？

### 1. 硬件和网络

| 项目 | 要求 |
|------|------|
| **CPU** | 2 核或以上 |
| **内存** | 4 GB 或以上 |
| **存储** | 20 GB 或以上 |
| **网络** | 稳定的互联网连接，能访问外网 |
| **操作系统** | Linux、macOS 或 Windows |

### 2. 软件依赖

必须安装的软件：
- **Node.js 18+**：JavaScript 运行时
- **PostgreSQL 12+**：数据库
- **npm 或 pnpm**：包管理器
- **Git**：版本控制

可选但推荐：
- **Docker**：容器化部署
- **Redis**：缓存和队列
- **Nginx**：反向代理

### 3. 账户和密钥

需要申请的账户和密钥：
- **Alchemy 账户**：获取 RPC 端点
  - Ethereum Mainnet API Key
  - Base API Key
  - Arbitrum API Key
  - Polygon API Key
  - Optimism API Key

### 4. 数据库准备

需要创建：
- PostgreSQL 数据库：`circle_tracker`
- 数据库用户：`circle_user`
- 用户密码：强密码

---

## 三步快速开始

### 步骤 1：环境配置（15 分钟）

```bash
# 1. 安装依赖
brew install node postgresql  # macOS
# 或
sudo apt-get install nodejs postgresql  # Ubuntu

# 2. 启动 PostgreSQL
brew services start postgresql  # macOS
# 或
sudo systemctl start postgresql  # Ubuntu

# 3. 创建数据库
psql -U postgres
CREATE DATABASE circle_tracker;
CREATE USER circle_user WITH PASSWORD 'your_password';
ALTER ROLE circle_user SET client_encoding TO 'utf8';
GRANT ALL PRIVILEGES ON DATABASE circle_tracker TO circle_user;
\q

# 4. 克隆项目
git clone <your-repo-url> circle_tracker
cd circle_tracker
```

### 步骤 2：应用配置（10 分钟）

```bash
# 1. 安装依赖
pnpm install

# 2. 创建 .env.local 文件
cat > .env.local << EOF
DATABASE_URL="postgresql://circle_user:your_password@localhost:5432/circle_tracker"
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY"
OPTIMISM_RPC_URL="https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY"
NODE_ENV="production"
PORT=3000
EOF

# 3. 初始化数据库
pnpm db:push

# 4. 启动应用
pnpm start
```

### 步骤 3：验证和使用（5 分钟）

```bash
# 1. 打开浏览器
open http://localhost:3000

# 2. 进入历史追溯页面
# 选择日期范围 → 点击查询 → 查看结果

# 3. 启动实时监测
# 进入实时监控页面 → 选择链 → 点击启动监听器
```

---

## 常见场景

### 场景 1：我想查询过去一周的 Circle Mint 交易

1. 打开应用 → 进入"历史事件追溯"
2. 点击"最近 7 天"
3. 选择链（例如 Ethereum）
4. 选择交易类型（CIRCLE_MINT）
5. 点击"查询"
6. 查看结果并导出为 Excel

### 场景 2：我想实时监测大额交易

1. 进入"实时监控"页面
2. 选择要监测的链
3. 点击"启动监听器"
4. 配置告警规则（大额交易阈值 = 100 万 USDC）
5. 配置通知渠道（Email 或 Webhook）
6. 当有大额交易时，自动收到通知

### 场景 3：我想导出特定时间范围的所有交易

1. 进入"历史事件追溯"
2. 设置日期范围
3. 设置过滤条件（链、类型等）
4. 点击"导出 Excel"
5. 文件将自动下载

---

## 性能优化建议

### 1. 数据库优化

```sql
-- 创建索引加快查询
CREATE INDEX idx_transactions_chainid ON transactions(chain_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_transactions_search 
  ON transactions(chain_id, type, timestamp);
```

### 2. 缓存优化

安装 Redis（可选但推荐）：

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis-server
```

### 3. 监测间隔调整

根据您的需求调整监测间隔：

```javascript
// server/config/monitoringConfig.ts
export const MONITORING_CONFIG = {
  monitoringInterval: 60_000, // 60 秒（默认）
  // 可改为：
  // 30_000 - 30 秒（更实时，但消耗更多 RPC 额度）
  // 120_000 - 2 分钟（更省 RPC 额度，但延迟更高）
};
```

---

## 故障排查

### 问题 1：无法连接数据库

**症状**：应用启动失败，提示"ECONNREFUSED"

**解决方案**：
```bash
# 1. 检查 PostgreSQL 是否运行
psql -U postgres -c "SELECT 1"

# 2. 检查 DATABASE_URL 是否正确
cat .env.local | grep DATABASE_URL

# 3. 测试连接
psql -U circle_user -d circle_tracker -h localhost
```

### 问题 2：RPC 请求超时

**症状**：查询历史交易时超时

**解决方案**：
```bash
# 1. 检查 RPC URL 是否正确
curl -X POST https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 2. 增加查询超时时间
# 在 server/config 中修改 RPC 超时配置

# 3. 减少查询区块范围
# 改为每次查询 50 个区块而不是 100 个
```

### 问题 3：查询结果为空

**症状**：查询交易但没有结果

**解决方案**：
```bash
# 1. 检查时间范围是否正确
# 确保时间范围内确实有交易

# 2. 检查链是否正确
# 确保选择的链有 USDC 活动

# 3. 查看数据库是否有数据
psql -U circle_user -d circle_tracker
SELECT COUNT(*) FROM transactions;
```

### 问题 4：监测不工作

**症状**：启动监听器后没有新交易被添加

**解决方案**：
```bash
# 1. 检查监听器日志
tail -f logs/app.log

# 2. 检查 RPC 连接
# 确保 RPC 端点可访问

# 3. 重启应用
pnpm stop
pnpm start
```

---

## 高级配置

### 1. 配置多个 RPC 提供商（故障转移）

```bash
# .env.local
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/KEY1"
ETHEREUM_RPC_BACKUP_URL="https://eth-mainnet.infura.io/v3/KEY2"
```

### 2. 配置 Email 通知

```bash
# .env.local
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_app_password"
ALERT_EMAIL="alerts@example.com"
```

### 3. 配置 Webhook 通知

```bash
# .env.local
WEBHOOK_URL="https://your-webhook-endpoint.com/alerts"
```

### 4. 配置告警规则

在应用 UI 中或通过 API 配置：

```bash
curl -X POST http://localhost:3000/api/trpc/tracker.createAlertConfig \
  -H "Content-Type: application/json" \
  -d '{
    "name": "大额交易告警",
    "type": "LARGE_TRANSACTION",
    "threshold": 1000000,
    "enabled": true
  }'
```

---

## 生产环境部署

### 使用 Docker 部署

```bash
# 1. 构建镜像
docker build -t circle-tracker .

# 2. 启动容器
docker-compose up -d

# 3. 检查状态
docker-compose ps
```

### 使用 PM2 管理进程

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 启动应用
pm2 start pnpm --name "circle-tracker" -- start

# 3. 监控应用
pm2 monit

# 4. 查看日志
pm2 logs circle-tracker
```

### 使用 Systemd 管理服务

```bash
# 1. 创建服务文件
sudo tee /etc/systemd/system/circle-tracker.service << EOF
[Unit]
Description=Circle Tracker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/circle_tracker
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 2. 启用和启动服务
sudo systemctl daemon-reload
sudo systemctl enable circle-tracker
sudo systemctl start circle-tracker

# 3. 检查状态
sudo systemctl status circle-tracker
```

---

## 监控和维护

### 定期检查清单

- [ ] 每天检查应用日志
- [ ] 每周检查数据库大小
- [ ] 每月检查 RPC 使用情况
- [ ] 每月备份数据库
- [ ] 定期更新依赖

### 关键指标监控

```bash
# 检查应用健康状态
curl http://localhost:3000/health

# 检查数据库连接
psql -U circle_user -d circle_tracker -c "SELECT 1"

# 检查磁盘使用
df -h

# 检查内存使用
free -h

# 检查 CPU 使用
top
```

---

## 数据备份和恢复

### 备份数据库

```bash
# 完整备份
pg_dump -U circle_user -d circle_tracker > backup.sql

# 压缩备份
pg_dump -U circle_user -d circle_tracker | gzip > backup.sql.gz

# 定期备份（每天凌晨 2 点）
0 2 * * * pg_dump -U circle_user -d circle_tracker | gzip > /backups/circle_tracker_$(date +\%Y\%m\%d).sql.gz
```

### 恢复数据库

```bash
# 从备份恢复
psql -U circle_user -d circle_tracker < backup.sql

# 从压缩备份恢复
gunzip -c backup.sql.gz | psql -U circle_user -d circle_tracker
```

---

## 成本估算

### 月度成本（估计）

| 项目 | 成本 | 说明 |
|------|------|------|
| **Alchemy RPC** | $0-100 | 免费层 300M 单位/月，超出按量计费 |
| **服务器** | $10-50 | 云服务器（AWS/DigitalOcean） |
| **数据库** | $0-20 | 自托管或托管服务 |
| **Email 服务** | $0-10 | 可选的邮件通知 |
| **总计** | $10-180 | 取决于使用量 |

### 如何降低成本

1. **使用免费 RPC**：Ankr、Alchemy 免费层
2. **自托管数据库**：使用 PostgreSQL 而不是托管服务
3. **优化查询**：减少不必要的 RPC 调用
4. **使用缓存**：减少数据库查询
5. **合并告警**：减少 Email 发送

---

## 获取帮助

### 常见资源

- **官方文档**：查看项目中的 README.md
- **API 文档**：访问 http://localhost:3000/api/docs
- **GitHub Issues**：提交问题和反馈
- **社区讨论**：加入 Discord/Telegram 社区

### 调试技巧

```bash
# 启用详细日志
export DEBUG=circle-tracker:*
pnpm dev

# 查看 tRPC 请求
# 在浏览器 DevTools 中查看 Network 标签

# 查看数据库查询
# 在 Drizzle 中启用日志
```

---

## 下一步

1. ✅ 完成基本部署
2. ✅ 测试历史追溯功能
3. ✅ 启动实时监测
4. ✅ 配置告警规则
5. ✅ 定期备份数据
6. 🔄 持续优化性能
7. 🔄 根据需求扩展功能

---

## 总结

通过本指南，您现在可以：

- ✅ 在本地部署 Circle 追踪器
- ✅ 配置 RPC 端点进行链上监测
- ✅ 查询历史交易数据
- ✅ 启动实时监听器
- ✅ 配置告警和通知
- ✅ 优化性能和成本
- ✅ 维护和备份系统

祝您使用愉快！如有任何问题，请参考相关文档或提交 Issue。

