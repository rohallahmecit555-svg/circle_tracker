# RPC 端点配置指南

## 概述

本指南帮助您配置多条区块链的 RPC 端点，这是实时监测和历史追溯的基础。

---

## 第一步：选择 RPC 提供商

### 推荐：Alchemy（最稳定，官方推荐）

**优势**：
- 最稳定的 RPC 服务
- 支持所有主流链
- 免费额度充足（300M 单位/月）
- 官方文档完善
- 支持高级功能（Trace API、Enhanced API）

**注册步骤**：

1. 访问 https://www.alchemy.com/
2. 点击"Sign Up"注册账户
3. 验证邮箱
4. 登录控制面板
5. 点击"Create App"

### 其他选择

| 提供商 | 免费额度 | 优势 | 劣势 |
|--------|---------|------|------|
| **Infura** | 100K 请求/天 | 官方支持 | 限制较严 |
| **QuickNode** | 125K 请求/月 | 性能好 | 免费额度少 |
| **Ankr** | 无限制 | 完全免费 | 稳定性一般 |
| **Chainstack** | 免费层可用 | 企业级 | 需要验证 |

---

## 第二步：为每条链创建应用

### 在 Alchemy 中创建应用

1. **登录 Alchemy 控制面板**
   - 访问 https://dashboard.alchemy.com/

2. **创建 Ethereum Mainnet 应用**
   - 点击"Create App"
   - Network: Ethereum
   - Chain: Mainnet
   - Name: "Circle Tracker - Ethereum"
   - 点击"Create"
   - 复制 API Key

3. **创建 Base 应用**
   - 点击"Create App"
   - Network: Base
   - Chain: Mainnet
   - Name: "Circle Tracker - Base"
   - 点击"Create"
   - 复制 API Key

4. **创建 Arbitrum 应用**
   - 点击"Create App"
   - Network: Arbitrum
   - Chain: Mainnet
   - Name: "Circle Tracker - Arbitrum"
   - 点击"Create"
   - 复制 API Key

5. **创建 Polygon 应用**
   - 点击"Create App"
   - Network: Polygon
   - Chain: Mainnet
   - Name: "Circle Tracker - Polygon"
   - 点击"Create"
   - 复制 API Key

6. **创建 Optimism 应用**
   - 点击"Create App"
   - Network: Optimism
   - Chain: Mainnet
   - Name: "Circle Tracker - Optimism"
   - 点击"Create"
   - 复制 API Key

---

## 第三步：获取 RPC URLs

### Alchemy RPC URLs 格式

对于每个应用，Alchemy 提供的 RPC URL 格式为：

```
https://{network}-mainnet.g.alchemy.com/v2/{API_KEY}
```

### 具体 URLs

| 链 | RPC URL |
|----|---------|
| **Ethereum** | `https://eth-mainnet.g.alchemy.com/v2/{API_KEY}` |
| **Base** | `https://base-mainnet.g.alchemy.com/v2/{API_KEY}` |
| **Arbitrum** | `https://arb-mainnet.g.alchemy.com/v2/{API_KEY}` |
| **Polygon** | `https://polygon-mainnet.g.alchemy.com/v2/{API_KEY}` |
| **Optimism** | `https://opt-mainnet.g.alchemy.com/v2/{API_KEY}` |

### 示例

```
https://eth-mainnet.g.alchemy.com/v2/abc123def456ghi789jkl012mno345pqr
https://base-mainnet.g.alchemy.com/v2/xyz789uvw456rst123opq890abc567def
```

---

## 第四步：配置环境变量

### 创建 .env.local 文件

在项目根目录创建 `.env.local` 文件：

```bash
# 数据库
DATABASE_URL="postgresql://circle_user:your_password@localhost:5432/circle_tracker"

# Ethereum Mainnet
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_ETHEREUM_API_KEY"

# Base
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_BASE_API_KEY"

# Arbitrum
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/YOUR_ARBITRUM_API_KEY"

# Polygon
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/YOUR_POLYGON_API_KEY"

# Optimism
OPTIMISM_RPC_URL="https://opt-mainnet.g.alchemy.com/v2/YOUR_OPTIMISM_API_KEY"

# 应用配置
NODE_ENV="production"
PORT=3000
```

### 替换 API Key

将 `YOUR_ETHEREUM_API_KEY` 等替换为实际的 API Key：

```bash
# 从 Alchemy 控制面板复制的 API Key
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/abc123def456ghi789jkl012mno345pqr"
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/xyz789uvw456rst123opq890abc567def"
```

---

## 第五步：测试 RPC 连接

### 使用 curl 测试

```bash
# 测试 Ethereum RPC
curl -X POST https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 预期响应
# {"jsonrpc":"2.0","result":"0x12a45b6","id":1}
```

### 使用 Node.js 测试

```javascript
// test-rpc.js
const axios = require('axios');

async function testRPC(url, name) {
  try {
    const response = await axios.post(url, {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1,
    });
    
    const blockNumber = parseInt(response.data.result, 16);
    console.log(`✅ ${name}: 连接成功，当前区块: ${blockNumber}`);
  } catch (error) {
    console.log(`❌ ${name}: 连接失败 - ${error.message}`);
  }
}

const rpcs = {
  'Ethereum': process.env.ETHEREUM_RPC_URL,
  'Base': process.env.BASE_RPC_URL,
  'Arbitrum': process.env.ARBITRUM_RPC_URL,
  'Polygon': process.env.POLYGON_RPC_URL,
  'Optimism': process.env.OPTIMISM_RPC_URL,
};

async function main() {
  for (const [name, url] of Object.entries(rpcs)) {
    await testRPC(url, name);
  }
}

main();
```

运行测试：

```bash
node test-rpc.js
```

---

## 第六步：配置应用中的 RPC

### 更新 server/config/rpcConfig.ts

```typescript
export const RPC_CONFIG = {
  1: {
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    chainId: 1,
  },
  8453: {
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL,
    chainId: 8453,
  },
  42161: {
    name: 'Arbitrum',
    rpcUrl: process.env.ARBITRUM_RPC_URL,
    chainId: 42161,
  },
  137: {
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL,
    chainId: 137,
  },
  10: {
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL,
    chainId: 10,
  },
};

export function getRPCUrl(chainId: number): string {
  const config = RPC_CONFIG[chainId as keyof typeof RPC_CONFIG];
  if (!config) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }
  return config.rpcUrl;
}
```

### 在事件监听器中使用

```typescript
import { getRPCUrl } from '@/server/config/rpcConfig';
import { ethers } from 'ethers';

async function startMonitoring(chainId: number) {
  const rpcUrl = getRPCUrl(chainId);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // 获取最新区块
  const blockNumber = await provider.getBlockNumber();
  console.log(`Chain ${chainId}: Latest block ${blockNumber}`);
  
  // 监听事件
  const filter = {
    address: USDC_ADDRESS,
    topics: [TRANSFER_EVENT_SIGNATURE],
  };
  
  provider.on(filter, (log) => {
    console.log('Transfer event:', log);
  });
}
```

---

## 第七步：监控 RPC 使用情况

### 在 Alchemy 控制面板查看

1. 登录 Alchemy 控制面板
2. 选择应用
3. 查看"Usage"标签
4. 查看请求数、响应时间等指标

### 关键指标

| 指标 | 说明 |
|------|------|
| **Requests** | 总请求数 |
| **Response Time** | 平均响应时间 |
| **Error Rate** | 错误率 |
| **Compute Units** | 消耗的计算单位 |

### 优化建议

如果接近免费额度限制：

1. **升级到付费计划**
   - 获得更高的额度
   - 优先级更高
   - 更好的支持

2. **优化查询**
   - 减少不必要的查询
   - 使用缓存
   - 批量查询

3. **使用多个提供商**
   - 分散负载
   - 提高可用性
   - 避免单点故障

---

## 第八步：处理 RPC 故障

### 故障转移策略

```typescript
// server/services/rpcService.ts
const RPC_PROVIDERS = [
  process.env.ETHEREUM_RPC_URL,
  process.env.ETHEREUM_RPC_BACKUP_URL, // 备用 RPC
];

async function getRPCProvider(chainId: number) {
  for (const rpcUrl of RPC_PROVIDERS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getBlockNumber(); // 测试连接
      return provider;
    } catch (error) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`);
    }
  }
  throw new Error('All RPC providers failed');
}
```

### 配置备用 RPC

```bash
# .env.local
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/KEY1"
ETHEREUM_RPC_BACKUP_URL="https://eth-mainnet.infura.io/v3/KEY2"
```

### 监控 RPC 健康状态

```typescript
async function monitorRPCHealth() {
  const chains = [1, 8453, 42161, 137, 10];
  
  for (const chainId of chains) {
    try {
      const provider = new ethers.JsonRpcProvider(getRPCUrl(chainId));
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Chain ${chainId}: OK (block ${blockNumber})`);
    } catch (error) {
      console.error(`❌ Chain ${chainId}: FAILED - ${error.message}`);
      // 发送告警
    }
  }
}

// 每 5 分钟检查一次
setInterval(monitorRPCHealth, 5 * 60 * 1000);
```

---

## 常见问题

### Q1: 如何获得更高的 RPC 额度？

**A**: 
1. 升级到 Alchemy 付费计划
2. 使用多个 RPC 提供商分散负载
3. 优化查询，减少不必要的请求

### Q2: RPC 请求超时怎么办？

**A**:
1. 增加超时时间
2. 使用备用 RPC
3. 优化查询条件（如减少查询区块范围）

### Q3: 如何处理 RPC 限流？

**A**:
1. 实现请求队列
2. 添加指数退避重试
3. 升级到付费计划

### Q4: 能否使用本地节点？

**A**: 可以，但需要：
1. 运行完整的以太坊节点（需要 500GB+ 存储）
2. 同步时间较长（数小时到数天）
3. 维护成本较高
4. 对于大多数用户，使用公共 RPC 更方便

### Q5: 多个 RPC 提供商如何选择？

**A**: 
- **开发/测试**：使用免费 RPC（Ankr、Alchemy 免费层）
- **生产环境**：使用付费 RPC（Alchemy、Infura）
- **高可用**：使用 2-3 个不同提供商的 RPC

---

## 总结

配置 RPC 的关键步骤：

1. ✅ 选择 RPC 提供商（推荐 Alchemy）
2. ✅ 为每条链创建应用
3. ✅ 获取 API Key
4. ✅ 配置环境变量
5. ✅ 测试 RPC 连接
6. ✅ 在应用中集成 RPC
7. ✅ 监控使用情况
8. ✅ 实现故障转移

完成这些步骤后，您就可以开始实时监测和历史追溯了！

