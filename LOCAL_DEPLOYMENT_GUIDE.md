# Circle 追踪器 - 本地化部署指南

## 概述

本指南帮助您在本地环境部署 Circle 追踪器，实现实时监测特定交易类型，并支持按时间区间追溯链上交易。

---

## 第一部分：系统要求与准备

### 1. 硬件要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核或以上 |
| 内存 | 4 GB | 8 GB 或以上 |
| 存储 | 20 GB | 50 GB 或以上 |
| 网络 | 稳定的互联网连接 | 100 Mbps 以上 |

### 2. 软件依赖

```bash
# 必需的软件
- Node.js 18.0 或更高版本
- npm 或 pnpm 包管理器
- PostgreSQL 12 或更高版本（或 MySQL 8.0+）
- Git

# 可选但推荐
- Docker 和 Docker Compose（简化部署）
- Redis（用于缓存和队列）
```

### 3. 安装步骤

#### 3.1 安装 Node.js 和 npm

```bash
# 在 macOS 上
brew install node

# 在 Ubuntu/Debian 上
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 在 Windows 上
# 从 https://nodejs.org/ 下载安装程序
```

#### 3.2 安装 PostgreSQL

```bash
# 在 macOS 上
brew install postgresql@15
brew services start postgresql@15

# 在 Ubuntu/Debian 上
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# 在 Windows 上
# 从 https://www.postgresql.org/download/windows/ 下载安装程序
```

#### 3.3 创建数据库

```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库和用户
CREATE DATABASE circle_tracker;
CREATE USER circle_user WITH PASSWORD 'your_secure_password';
ALTER ROLE circle_user SET client_encoding TO 'utf8';
ALTER ROLE circle_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE circle_user SET default_transaction_deferrable TO on;
ALTER ROLE circle_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE circle_tracker TO circle_user;
\q
```

---

## 第二部分：应用部署

### 1. 克隆项目

```bash
git clone <your-repository-url> circle_tracker
cd circle_tracker
```

### 2. 安装依赖

```bash
pnpm install
# 或使用 npm
npm install
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
# 数据库配置
DATABASE_URL="postgresql://circle_user:your_secure_password@localhost:5432/circle_tracker"

# RPC 端点配置（支持多条链）
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
OPTIMISM_RPC_URL="https://opt-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"

# 应用配置
NODE_ENV="production"
PORT=3000
VITE_APP_TITLE="Circle 链上行为追踪器"

# JWT 和认证（如果需要）
JWT_SECRET="your_jwt_secret_key"
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
pnpm db:push

# 或手动运行迁移
pnpm drizzle-kit migrate
```

### 5. 启动应用

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

应用将在 `http://localhost:3000` 启动。

---

## 第三部分：获取 RPC 端点

### 1. 免费 RPC 提供商

| 提供商 | 支持的链 | 免费额度 | 特点 |
|--------|---------|---------|------|
| **Alchemy** | 全部 | 300M 单位/月 | 最稳定，推荐 |
| **Infura** | 全部 | 100K 请求/天 | 官方支持 |
| **QuickNode** | 全部 | 125K 请求/月 | 性能好 |
| **Ankr** | 全部 | 无限制 | 完全免费 |
| **Chainstack** | 全部 | 免费层可用 | 企业级 |

### 2. 获取 Alchemy API Key（推荐）

1. 访问 https://www.alchemy.com/
2. 注册账户
3. 创建新应用
4. 为每条链创建应用：
   - Ethereum Mainnet
   - Base
   - Arbitrum One
   - Polygon
   - Optimism
5. 复制 API Key 到 `.env.local`

### 3. 配置多链 RPC 端点

```javascript
// server/config/rpcConfig.ts
export const RPC_ENDPOINTS = {
  1: process.env.ETHEREUM_RPC_URL,
  8453: process.env.BASE_RPC_URL,
  42161: process.env.ARBITRUM_RPC_URL,
  137: process.env.POLYGON_RPC_URL,
  10: process.env.OPTIMISM_RPC_URL,
};
```

---

## 第四部分：实时监测配置

### 1. 配置监测参数

在应用的设置页面或配置文件中设置：

```javascript
// server/config/monitoringConfig.ts
export const MONITORING_CONFIG = {
  // 监测的链
  chains: [1, 8453, 42161, 137, 10],
  
  // 监测的交易类型
  transactionTypes: ['CIRCLE_MINT', 'CIRCLE_BURN', 'CCTP_MINT', 'CCTP_BURN'],
  
  // 大额交易告警阈值（USDC）
  largeTransactionThreshold: 1_000_000,
  
  // 监测间隔（毫秒）
  monitoringInterval: 60_000, // 每 60 秒检查一次
  
  // 回溯区块数
  lookbackBlocks: 100,
};
```

### 2. 启动实时监测

```bash
# 方式一：通过 API 启动
curl -X POST http://localhost:3000/api/trpc/tracker.startListener \
  -H "Content-Type: application/json" \
  -d '{"chainId": 1}'

# 方式二：通过应用 UI
# 进入"实时监控"页面，选择链和区块范围，点击"启动监听器"
```

### 3. 监测工作流程

```
┌─────────────────────────────────────────────────────────┐
│                   实时监测流程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 定时检查最新区块 (每 60 秒)                         │
│     ↓                                                   │
│  2. 查询 USDC Transfer 事件                             │
│     ↓                                                   │
│  3. 分析交易来源和目标                                 │
│     ├─ Circle 官方地址 → Circle Mint/Burn              │
│     └─ TokenMessenger 合约 → CCTP Mint/Burn            │
│     ↓                                                   │
│  4. 存储到数据库                                       │
│     ↓                                                   │
│  5. 检查是否触发告警条件                               │
│     ├─ 大额交易 (> 100 万 USDC)                        │
│     └─ 异常模式检测                                    │
│     ↓                                                   │
│  6. 发送通知（如果需要）                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 第五部分：时间区间追溯

### 1. 追溯交易的工作原理

当您输入时间区间时，系统会：

1. **转换时间为区块号**
   ```javascript
   // 根据时间戳查询对应的区块号
   const startBlock = await getBlockNumberByTimestamp(startTime);
   const endBlock = await getBlockNumberByTimestamp(endTime);
   ```

2. **查询区块范围内的事件**
   ```javascript
   // 查询 USDC Transfer 事件
   const events = await provider.getLogs({
     address: USDC_ADDRESS,
     topics: [TRANSFER_TOPIC],
     fromBlock: startBlock,
     toBlock: endBlock,
   });
   ```

3. **分析和分类交易**
   ```javascript
   // 识别交易类型
   events.forEach(event => {
     if (isCircleMint(event)) {
       // Circle Mint 交易
     } else if (isCircleBurn(event)) {
       // Circle Burn 交易
     } else if (isCCTPMint(event)) {
       // CCTP Mint 交易
     }
   });
   ```

4. **存储到数据库**
   ```javascript
   // 保存交易记录
   await db.insert(transactions).values(parsedTransactions);
   ```

### 2. 使用历史追溯功能

#### 通过 UI 使用

1. 进入"历史事件追溯"页面
2. 选择日期范围（快速选择或自定义）
3. 选择链和交易类型
4. 点击"查询"按钮
5. 查看结果并导出为 Excel

#### 通过 API 使用

```bash
# 查询特定时间范围的交易
curl -X POST http://localhost:3000/api/trpc/tracker.getTransactions \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-31T23:59:59Z",
    "chainId": 1,
    "type": "CIRCLE_MINT",
    "limit": 100,
    "offset": 0
  }'
```

### 3. 追溯的性能优化

由于链上数据量大，追溯可能需要时间。以下是优化建议：

| 优化方法 | 说明 | 实现难度 |
|---------|------|---------|
| **批量查询** | 分批查询区块范围，避免单次查询超时 | 低 |
| **缓存结果** | 使用 Redis 缓存已查询的结果 | 中 |
| **索引优化** | 在数据库中为常用字段创建索引 | 低 |
| **异步处理** | 使用后台任务处理大量追溯请求 | 高 |
| **增量同步** | 只同步新增的区块，避免重复查询 | 中 |

---

## 第六部分：监测特定交易类型

### 1. 识别 Circle Mint/Burn

**Circle Mint**：用户通过 Circle 官方渠道用法币购买 USDC
- 特征：从 Circle 官方地址转出 USDC
- 识别方式：检查 `from` 地址是否为 Circle 官方地址

```javascript
const CIRCLE_OFFICIAL_ADDRESSES = {
  1: '0x0A59649758aa4424DDFF412CD39a01Ab2566C7C7', // Ethereum
  8453: '0x1BD435F3C054b6e901B7b108a0ab7617C808677b', // Base
  // ... 其他链
};

function isCircleMint(event) {
  return CIRCLE_OFFICIAL_ADDRESSES[chainId]?.toLowerCase() === 
         event.from.toLowerCase();
}
```

**Circle Burn**：用户通过 Circle 官方渠道将 USDC 兑换为法币
- 特征：转入 Circle 官方地址的 USDC
- 识别方式：检查 `to` 地址是否为 Circle 官方地址

```javascript
function isCircleBurn(event) {
  return CIRCLE_OFFICIAL_ADDRESSES[chainId]?.toLowerCase() === 
         event.to.toLowerCase();
}
```

### 2. 识别 CCTP 跨链交易

**CCTP Mint**：从其他链跨链转入 USDC
- 特征：TokenMessenger 合约 Mint 事件
- 识别方式：检查事件来源是否为 TokenMessenger

```javascript
const TOKEN_MESSENGER_ADDRESSES = {
  1: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155', // Ethereum
  8453: '0x1D966713f9970dac03CEE8508B2c0743fd474CE5', // Base
  // ... 其他链
};

function isCCTPMint(event) {
  return TOKEN_MESSENGER_ADDRESSES[chainId]?.toLowerCase() === 
         event.from.toLowerCase();
}
```

**CCTP Burn**：向其他链跨链转出 USDC
- 特征：转入 TokenMessenger 合约的 USDC
- 识别方式：检查事件目标是否为 TokenMessenger

```javascript
function isCCTPBurn(event) {
  return TOKEN_MESSENGER_ADDRESSES[chainId]?.toLowerCase() === 
         event.to.toLowerCase();
}
```

### 3. 自定义监测规则

在 `server/config/monitoringRules.ts` 中定义：

```javascript
export const MONITORING_RULES = {
  // 监测大额 Mint 交易
  largeMintTransactions: {
    type: 'CIRCLE_MINT',
    minAmount: 1_000_000, // 100 万 USDC
    action: 'notify', // 发送通知
  },
  
  // 监测特定地址的交易
  specificAddresses: {
    addresses: ['0x...', '0x...'],
    action: 'track', // 追踪
  },
  
  // 监测异常流量
  anomalyDetection: {
    enabled: true,
    threshold: 2.0, // 正常流量的 2 倍
    action: 'alert', // 发送告警
  },
};
```

---

## 第七部分：告警与通知

### 1. 配置告警规则

在应用 UI 中或通过 API 配置：

```bash
curl -X POST http://localhost:3000/api/trpc/tracker.createAlertConfig \
  -H "Content-Type: application/json" \
  -d '{
    "name": "大额交易告警",
    "type": "LARGE_TRANSACTION",
    "threshold": 1000000,
    "enabled": true,
    "notificationChannels": ["email", "webhook"]
  }'
```

### 2. 通知渠道

| 渠道 | 配置方式 | 优势 |
|------|---------|------|
| **Email** | SMTP 配置 | 可靠，易于集成 |
| **Webhook** | HTTP POST | 灵活，可集成第三方服务 |
| **Telegram** | Bot Token | 实时，移动端友好 |
| **Discord** | Webhook URL | 团队协作友好 |
| **Slack** | Webhook URL | 企业级，易于管理 |

### 3. 配置 Email 通知

```javascript
// server/config/emailConfig.ts
export const EMAIL_CONFIG = {
  service: 'gmail', // 或其他邮件服务
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: 'alerts@circletracker.local',
};
```

### 4. 配置 Webhook 通知

```javascript
// server/services/notificationService.ts
async function sendWebhookNotification(alert) {
  await fetch(process.env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: alert.type,
      message: alert.message,
      data: alert.data,
      timestamp: new Date().toISOString(),
    }),
  });
}
```

---

## 第八部分：性能调优

### 1. 数据库优化

```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_transactions_chainid ON transactions(chain_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_transactions_amount ON transactions(amount);

-- 创建复合索引
CREATE INDEX idx_transactions_search 
  ON transactions(chain_id, type, timestamp);
```

### 2. 查询优化

```javascript
// 使用分页而不是一次性加载所有数据
const BATCH_SIZE = 100;
const transactions = await db.query
  .transactions
  .limit(BATCH_SIZE)
  .offset(page * BATCH_SIZE);

// 使用连接池
const pool = new Pool({
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 3. 缓存策略

```javascript
// 使用 Redis 缓存热点数据
const redis = new Redis();

async function getTransactionsSummary(chainId) {
  const cacheKey = `summary:${chainId}`;
  
  // 尝试从缓存获取
  let cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // 从数据库查询
  const summary = await db.query.transactions
    .where(eq(transactions.chainId, chainId))
    .select(sql`COUNT(*) as count, SUM(amount) as total`);
  
  // 缓存 1 小时
  await redis.setex(cacheKey, 3600, JSON.stringify(summary));
  
  return summary;
}
```

---

## 第九部分：故障排查

### 1. 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 无法连接数据库 | 数据库未启动或凭证错误 | 检查 DATABASE_URL，确保 PostgreSQL 运行 |
| RPC 请求超时 | RPC 端点不稳定或请求过多 | 更换 RPC 提供商或升级到付费计划 |
| 查询结果为空 | 时间范围内无交易 | 检查时间范围和链配置 |
| 内存占用过高 | 处理大量数据时内存溢出 | 使用流式处理或增加服务器内存 |
| 监测不工作 | 监测服务未启动 | 检查日志，重启服务 |

### 2. 查看日志

```bash
# 开发模式下查看实时日志
pnpm dev

# 生产模式下查看日志
tail -f logs/app.log

# 查看特定错误
grep "ERROR" logs/app.log
```

### 3. 调试技巧

```javascript
// 启用详细日志
export DEBUG=circle-tracker:*

// 在代码中添加调试输出
console.log('Transaction:', {
  txHash: tx.txHash,
  from: tx.from,
  to: tx.to,
  amount: tx.amount,
  type: tx.type,
});
```

---

## 第十部分：Docker 部署（可选）

### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制应用代码
COPY . .

# 构建应用
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "start"]
```

### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: circle_tracker
      POSTGRES_USER: circle_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://circle_user:your_secure_password@postgres:5432/circle_tracker
      ETHEREUM_RPC_URL: ${ETHEREUM_RPC_URL}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### 3. 启动 Docker 容器

```bash
docker-compose up -d
```

---

## 第十一部分：安全建议

### 1. 环境变量安全

```bash
# 不要将 .env 文件提交到 Git
echo ".env.local" >> .gitignore

# 使用强密码
# 定期轮换 API Key
# 限制 RPC 端点的访问权限
```

### 2. 数据库安全

```sql
-- 创建只读用户用于查询
CREATE USER circle_readonly WITH PASSWORD 'readonly_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO circle_readonly;

-- 启用 SSL 连接
ALTER SYSTEM SET ssl = on;
```

### 3. API 安全

```javascript
// 添加速率限制
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制 100 个请求
});

app.use('/api/', limiter);
```

---

## 总结

本地化部署 Circle 追踪器的关键步骤：

1. ✅ **准备环境**：安装 Node.js、PostgreSQL、Git
2. ✅ **获取 RPC**：申请 Alchemy 或其他提供商的 API Key
3. ✅ **配置应用**：设置 `.env.local` 文件
4. ✅ **初始化数据库**：运行迁移脚本
5. ✅ **启动应用**：`pnpm dev` 或 `pnpm start`
6. ✅ **配置监测**：设置监测参数和告警规则
7. ✅ **测试追溯**：输入时间范围查询交易
8. ✅ **优化性能**：添加索引、缓存、异步处理

如有任何问题，请查看日志或参考故障排查部分。

