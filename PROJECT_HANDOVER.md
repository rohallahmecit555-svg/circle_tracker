# Circle 链上行为追踪器 - 完整项目交接文档

## 目录
1. [项目概述](#项目概述)
2. [技术架构](#技术架构)
3. [核心功能模块](#核心功能模块)
4. [数据库设计](#数据库设计)
5. [API 接口文档](#api-接口文档)
6. [前端实现细节](#前端实现细节)
7. [后端实现细节](#后端实现细节)
8. [部署与运维](#部署与运维)
9. [开发工作流](#开发工作流)
10. [常见问题与解决方案](#常见问题与解决方案)

---

## 项目概述

### 项目名称
Circle 链上行为追踪器（Circle On-chain Behavior Tracker）

### 项目目标
实时监控和分析 USDC 的 Mint/Burn 交易以及 CCTP（Cross-Chain Transfer Protocol）跨链结算，支持多条区块链（以太坊、Base、Arbitrum、Polygon、Optimism 等）。

### 核心功能
1. **实时监听**：通过 RPC 端点实时监听区块链上的 USDC 相关事件
2. **仪表板**：展示实时交易数据、统计信息和过滤功能
3. **历史追溯**：支持按日期范围和链类型查询历史交易
4. **数据导出**：支持将交易数据导出为 Excel 格式
5. **全局统计**：显示所有抓取数据的聚合统计（不受分页影响）

### 技术栈
- **前端**：React 19 + Tailwind CSS 4 + TypeScript
- **后端**：Express 4 + tRPC 11 + Node.js
- **数据库**：MySQL/TiDB + Drizzle ORM
- **认证**：Manus OAuth 2.0
- **构建工具**：Vite
- **测试**：Vitest

---

## 技术架构

### 整体架构图
```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (React 19)                         │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Dashboard      │  │  HistoryTracker  │                 │
│  │   (仪表板)       │  │  (历史追溯)      │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                            │
│           └─────────────────────┼────────────────────┐       │
│                                 │                    │       │
│                           tRPC 客户端                │       │
│                                 │                    │       │
└─────────────────────────────────┼────────────────────┼───────┘
                                  │                    │
                    ┌─────────────┴────────────────────┴──────┐
                    │     tRPC 服务器 (Express)               │
                    │  ┌──────────────────────────────────┐  │
                    │  │   tRPC Router                    │  │
                    │  │  ├─ tracker.getTransactions      │  │
                    │  │  ├─ tracker.getSummary          │  │
                    │  │  ├─ tracker.getStatistics       │  │
                    │  │  ├─ auth.me                     │  │
                    │  │  └─ auth.logout                 │  │
                    │  └──────────────────────────────────┘  │
                    │                                        │
                    │  ┌──────────────────────────────────┐  │
                    │  │   数据库查询层 (db.ts)           │  │
                    │  │  ├─ getTransactions()            │  │
                    │  │  ├─ getTransactionsSummary()     │  │
                    │  │  ├─ getStatistics()              │  │
                    │  │  └─ getTransactionByHash()       │  │
                    │  └──────────────────────────────────┘  │
                    └────────────────────┬───────────────────┘
                                         │
                    ┌────────────────────┴───────────────────┐
                    │     MySQL/TiDB 数据库                  │
                    │  ┌──────────────────────────────────┐  │
                    │  │  transactions (交易表)           │  │
                    │  │  statistics (统计表)             │  │
                    │  │  events (事件表)                 │  │
                    │  │  users (用户表)                  │  │
                    │  │  alertConfigs (告警配置表)       │  │
                    │  └──────────────────────────────────┘  │
                    └────────────────────────────────────────┘
```

### 数据流向

#### 1. 实时监听流程
```
RPC 端点 → 监听合约事件 → 解析交易数据 → 存储到数据库 → 前端实时更新
```

#### 2. 查询流程
```
前端发起查询 → tRPC 客户端 → 后端路由 → 数据库查询 → 聚合处理 → 返回结果 → 前端渲染
```

#### 3. 统计流程（关键改进）
```
前端请求统计 → getSummary API → 后端查询所有交易 → 按类型聚合 → 计算总和 → 返回全局统计
```

---

## 核心功能模块

### 1. 仪表板 (Dashboard)

#### 功能说明
- 显示全局统计数据（总交易数、总 Mint 金额、总 Burn 金额、CCTP 转账金额）
- 显示分页的交易列表（每页 100 条）
- 支持按链和交易类型过滤
- 支持按交易哈希搜索
- 支持导出为 Excel

#### 关键实现细节

**统计数据获取**：
```typescript
// 使用独立的 getSummary API 获取全局统计
const { data: summary } = trpc.tracker.getSummary.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
});

// 统计数据与分页无关，始终显示完整数据总和
const summaryStats = useMemo(() => {
  if (summary) {
    return {
      totalTransactions: summary.totalCount,
      totalMint: summary.mintAmount,
      totalBurn: summary.burnAmount,
      totalCCTPTransfers: summary.cctpAmount,
    };
  }
  return { totalTransactions: 0, totalMint: 0, totalBurn: 0, totalCCTPTransfers: 0 };
}, [summary]);
```

**交易列表获取**：
```typescript
// 获取分页的交易列表（用于表格显示）
const { data: transactions = [], isLoading, refetch } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
  limit: 100,  // 每页 100 条
  offset: page * 100,
});
```

**响应式设计**：
- 手机端：2 列卡片布局，统计数字自动缩小
- 桌面端：4 列卡片布局，完整显示所有统计信息
- 表格在手机端自动横向滚动

### 2. 历史追溯 (HistoryTracker)

#### 功能说明
- 按日期范围查询历史交易
- 支持快速日期选择（最近 7 天、30 天、90 天）
- 支持按链和交易类型过滤
- 支持导出为 Excel
- 显示发送方和接收方地址

#### 关键实现细节

**日期范围查询**：
```typescript
const { data: transactions = [] } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
  startTime: filters.startDate,  // 开始时间
  endTime: filters.endDate,      // 结束时间
  limit: 100,
  offset: page * 100,
});
```

**快速日期选择**：
```typescript
const handleQuickDateRange = (days: number) => {
  const end = new Date();
  const start = subDays(end, days);
  setFilters({ ...filters, startDate: start, endDate: end });
  setPage(0);
};
```

### 3. 交易类型

#### 支持的交易类型
1. **CIRCLE_MINT**：Circle 铸造（从零地址转入）
2. **CIRCLE_BURN**：Circle 销毁（转入零地址）
3. **CCTP_MINT**：CCTP 跨链铸造
4. **CCTP_BURN**：CCTP 跨链销毁
5. **OTHER**：其他交易

#### 交易类型颜色编码
- CIRCLE_MINT：绿色（`bg-green-100 text-green-800`）
- CIRCLE_BURN：红色（`bg-red-100 text-red-800`）
- CCTP_MINT：紫色（`bg-purple-100 text-purple-800`）
- CCTP_BURN：蓝色（`bg-blue-100 text-blue-800`）

---

## 数据库设计

### 数据库连接
```
DATABASE_URL: mysql://user:password@host:port/database
```

### 表结构

#### 1. transactions (交易表)
```sql
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  txHash VARCHAR(66) NOT NULL UNIQUE,
  chainId INT NOT NULL,
  chainName VARCHAR(50) NOT NULL,
  blockNumber BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  fromAddress VARCHAR(42) NOT NULL,
  toAddress VARCHAR(42) NOT NULL,
  amount DECIMAL(38, 6) NOT NULL,
  type ENUM('CIRCLE_MINT', 'CIRCLE_BURN', 'CCTP_BURN', 'CCTP_MINT', 'OTHER') NOT NULL,
  sourceChain VARCHAR(50),
  targetChain VARCHAR(50),
  messageHash VARCHAR(66),
  status ENUM('PENDING', 'CONFIRMED', 'FAILED') DEFAULT 'CONFIRMED' NOT NULL,
  rawData JSON,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  INDEX txHash_idx (txHash),
  INDEX chainId_idx (chainId),
  INDEX type_idx (type),
  INDEX timestamp_idx (timestamp)
);
```

**字段说明**：
- `txHash`：交易哈希，唯一标识符
- `chainId`：区块链 ID（1=以太坊, 8453=Base, 42161=Arbitrum, 137=Polygon, 10=Optimism）
- `chainName`：区块链名称
- `blockNumber`：区块号
- `timestamp`：交易时间戳
- `fromAddress`：发送方地址
- `toAddress`：接收方地址
- `amount`：交易金额（USDC，精度 6 位小数）
- `type`：交易类型
- `sourceChain`/`targetChain`：跨链交易的源链和目标链
- `messageHash`：CCTP 消息哈希
- `status`：交易状态
- `rawData`：原始交易数据（JSON 格式）

#### 2. statistics (统计表)
```sql
CREATE TABLE statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  chainId INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  count INT DEFAULT 0 NOT NULL,
  totalAmount DECIMAL(38, 6) DEFAULT 0 NOT NULL,
  avgAmount DECIMAL(38, 6) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  INDEX date_chain_type_idx (date, chainId, type)
);
```

**用途**：存储每日按链和类型的统计数据，用于快速查询历史统计。

#### 3. events (事件表)
```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  txHash VARCHAR(66) NOT NULL,
  logIndex INT NOT NULL,
  chainId INT NOT NULL,
  contractAddress VARCHAR(42) NOT NULL,
  eventName VARCHAR(100) NOT NULL,
  topics JSON,
  data JSON,
  blockNumber BIGINT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  INDEX event_txHash_idx (txHash),
  INDEX event_chainId_idx (chainId),
  INDEX eventName_idx (eventName)
);
```

**用途**：存储原始智能合约事件日志，用于审计和追溯。

#### 4. users (用户表)
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**用途**：存储用户信息，支持 Manus OAuth 认证。

#### 5. alertConfigs (告警配置表)
```sql
CREATE TABLE alertConfigs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  thresholdAmount DECIMAL(38, 6) DEFAULT 1000000 NOT NULL,
  enabled INT DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  
  INDEX alertConfig_userId_idx (userId)
);
```

**用途**：存储用户的告警配置，如大额交易告警阈值。

### 索引策略

| 表名 | 索引名 | 字段 | 用途 |
|------|--------|------|------|
| transactions | txHash_idx | txHash | 快速查询单笔交易 |
| transactions | chainId_idx | chainId | 按链过滤 |
| transactions | type_idx | type | 按交易类型过滤 |
| transactions | timestamp_idx | timestamp | 按时间范围查询 |
| statistics | date_chain_type_idx | date, chainId, type | 快速查询日统计 |

---

## API 接口文档

### tRPC 路由结构

所有 API 都通过 tRPC 暴露，访问路径为 `/api/trpc/[procedure]`。

### 1. tracker.getTransactions

**用途**：获取分页的交易列表

**输入参数**：
```typescript
{
  chainId?: number;           // 可选：链 ID
  type?: string;              // 可选：交易类型
  startTime?: Date;           // 可选：开始时间
  endTime?: Date;             // 可选：结束时间
  limit?: number;             // 默认 100：每页条数
  offset?: number;            // 默认 0：偏移量
}
```

**返回数据**：
```typescript
Array<{
  id: number;
  txHash: string;
  chainId: number;
  chainName: string;
  blockNumber: number;
  timestamp: Date;
  fromAddress: string;
  toAddress: string;
  amount: Decimal;
  type: string;
  sourceChain?: string;
  targetChain?: string;
  messageHash?: string;
  status: string;
  rawData?: any;
  createdAt: Date;
  updatedAt: Date;
}>
```

**使用示例**：
```typescript
const { data: transactions } = trpc.tracker.getTransactions.useQuery({
  chainId: 1,
  type: 'CIRCLE_MINT',
  limit: 20,
  offset: 0,
});
```

### 2. tracker.getSummary

**用途**：获取全局统计数据（所有交易的聚合）

**输入参数**：
```typescript
{
  chainId?: number;           // 可选：链 ID
  type?: string;              // 可选：交易类型
  startTime?: Date;           // 可选：开始时间
  endTime?: Date;             // 可选：结束时间
}
```

**返回数据**：
```typescript
{
  totalCount: number;         // 总交易数
  totalAmount: number;        // 总金额
  mintCount: number;          // Mint 交易数
  mintAmount: number;         // Mint 总金额
  burnCount: number;          // Burn 交易数
  burnAmount: number;         // Burn 总金额
  cctpCount: number;          // CCTP 交易数
  cctpAmount: number;         // CCTP 总金额
}
```

**关键特性**：
- 统计数据与分页无关，始终返回完整数据总和
- 支持按链和交易类型过滤
- 支持按时间范围过滤

**使用示例**：
```typescript
const { data: summary } = trpc.tracker.getSummary.useQuery({
  chainId: 1,
  type: 'CIRCLE_MINT',
});

// 显示统计
console.log(`总交易数: ${summary.totalCount}`);
console.log(`总 Mint 金额: $${summary.mintAmount.toLocaleString()}`);
```

### 3. tracker.getTransactionByHash

**用途**：按交易哈希查询单笔交易

**输入参数**：
```typescript
{
  txHash: string;             // 交易哈希
}
```

**返回数据**：
```typescript
{
  id: number;
  txHash: string;
  chainId: number;
  // ... 其他字段同 getTransactions
} | undefined
```

### 4. tracker.getStatistics

**用途**：查询日统计数据

**输入参数**：
```typescript
{
  date?: string;              // 可选：日期（YYYY-MM-DD 格式）
  chainId?: number;           // 可选：链 ID
  type?: string;              // 可选：交易类型
}
```

**返回数据**：
```typescript
Array<{
  id: number;
  date: string;
  chainId: number;
  type: string;
  count: number;
  totalAmount: Decimal;
  avgAmount: Decimal;
  createdAt: Date;
}>
```

### 5. auth.me

**用途**：获取当前登录用户信息

**输入参数**：无

**返回数据**：
```typescript
{
  id: number;
  openId: string;
  name?: string;
  email?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
} | null
```

### 6. auth.logout

**用途**：登出当前用户

**输入参数**：无

**返回数据**：
```typescript
{
  success: boolean;
}
```

---

## 前端实现细节

### 项目结构
```
client/
├── public/                  # 静态资源
├── src/
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx   # 仪表板
│   │   ├── HistoryTracker.tsx  # 历史追溯
│   │   └── Home.tsx        # 首页
│   ├── components/         # 可复用组件
│   │   ├── DashboardLayout.tsx
│   │   └── ui/             # shadcn/ui 组件
│   ├── contexts/           # React Context
│   ├── hooks/              # 自定义 Hook
│   ├── lib/
│   │   └── trpc.ts        # tRPC 客户端配置
│   ├── App.tsx            # 路由和布局
│   ├── main.tsx           # 入口
│   └── index.css          # 全局样式
```

### 关键文件详解

#### 1. client/src/lib/trpc.ts

**作用**：配置 tRPC 客户端

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers';

export const trpc = createTRPCReact<AppRouter>();
```

**使用方式**：
```typescript
// 查询
const { data, isLoading } = trpc.tracker.getTransactions.useQuery({...});

// 变更
const mutation = trpc.auth.logout.useMutation();
mutation.mutate();
```

#### 2. client/src/pages/Dashboard.tsx

**核心逻辑**：

1. **状态管理**：
```typescript
const [filters, setFilters] = useState<FilterState>({
  chainId: undefined,
  type: undefined,
  searchHash: undefined,
});
const [page, setPage] = useState(0);
const pageSize = 100;
```

2. **数据获取**：
```typescript
// 获取全局统计（不受分页影响）
const { data: summary } = trpc.tracker.getSummary.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
});

// 获取分页列表
const { data: transactions = [] } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
  limit: pageSize,
  offset: page * pageSize,
});
```

3. **统计计算**：
```typescript
const summaryStats = useMemo(() => {
  if (summary) {
    return {
      totalTransactions: summary.totalCount,
      totalMint: summary.mintAmount,
      totalBurn: summary.burnAmount,
      totalCCTPTransfers: summary.cctpAmount,
    };
  }
  return { totalTransactions: 0, totalMint: 0, totalBurn: 0, totalCCTPTransfers: 0 };
}, [summary]);
```

4. **响应式设计**：
```typescript
// 统计卡片：手机 2 列，桌面 4 列
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
  {/* 卡片内容 */}
</div>

// 表格：手机端自动横向滚动
<div className="overflow-x-auto">
  <Table>
    {/* 表格内容 */}
  </Table>
</div>
```

#### 3. client/src/pages/HistoryTracker.tsx

**核心特性**：

1. **日期范围选择**：
```typescript
const [filters, setFilters] = useState<FilterState>({
  chainId: undefined,
  type: undefined,
  startDate: subDays(new Date(), 30),  // 默认最近 30 天
  endDate: new Date(),
});
```

2. **快速日期选择**：
```typescript
const handleQuickDateRange = (days: number) => {
  const end = new Date();
  const start = subDays(end, days);
  setFilters({ ...filters, startDate: start, endDate: end });
  setPage(0);
};

// 使用
<Button onClick={() => handleQuickDateRange(7)}>最近 7 天</Button>
<Button onClick={() => handleQuickDateRange(30)}>最近 30 天</Button>
<Button onClick={() => handleQuickDateRange(90)}>最近 90 天</Button>
```

3. **数据导出**：
```typescript
const handleExport = () => {
  const data = transactions.map(tx => ({
    "交易哈希": tx.txHash,
    "链": getChainName(tx.chainId),
    "类型": TRANSACTION_TYPES[tx.type as keyof typeof TRANSACTION_TYPES],
    "金额 (USDC)": tx.amount.toString(),
    "发送方": tx.fromAddress,
    "接收方": tx.toAddress,
    "时间": format(new Date(tx.timestamp), "yyyy-MM-dd HH:mm:ss"),
    "状态": tx.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "历史交易");
  XLSX.writeFile(workbook, `circle-history-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`);
};
```

### 样式系统

#### Tailwind CSS 配置

**响应式断点**：
- `sm`：640px（手机到平板）
- `md`：768px（平板）
- `lg`：1024px（桌面）
- `xl`：1280px（大屏）

**关键 CSS 变量**（在 `client/src/index.css` 中定义）：
```css
@theme {
  --color-background: oklch(0.98 0.002 247.9);
  --color-foreground: oklch(0.11 0.022 247.9);
  --color-card: oklch(0.97 0.001 0);
  --color-card-foreground: oklch(0.11 0.022 247.9);
  --color-primary: oklch(0.55 0.21 259.5);
  --color-primary-foreground: oklch(0.98 0.002 247.9);
  /* ... 更多颜色定义 */
}
```

#### 组件样式约定

1. **卡片组件**：
```typescript
<Card className="overflow-hidden">
  <CardHeader className="pb-2 sm:pb-3">
    <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">
      标题
    </CardTitle>
  </CardHeader>
  <CardContent className="pb-2 sm:pb-4">
    <div className="text-xl sm:text-3xl font-bold text-slate-900">
      内容
    </div>
  </CardContent>
</Card>
```

2. **按钮样式**：
```typescript
<Button
  variant="outline"  // 或 "default", "ghost", "destructive"
  size="sm"          // 或 "default", "lg"
  className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
>
  按钮文本
</Button>
```

---

## 后端实现细节

### 项目结构
```
server/
├── _core/                   # 核心框架代码
│   ├── context.ts          # tRPC 上下文
│   ├── trpc.ts             # tRPC 配置
│   ├── cookies.ts          # Cookie 处理
│   ├── env.ts              # 环境变量
│   └── ...
├── db.ts                   # 数据库查询函数
├── routers.ts              # tRPC 路由定义
├── eventListenerRouter.ts  # 事件监听路由
└── auth.logout.test.ts     # 测试示例
```

### 关键文件详解

#### 1. server/db.ts

**作用**：数据库查询层，所有数据库操作都在这里定义

**核心函数**：

```typescript
// 获取分页交易列表
export async function getTransactions(filters: {
  chainId?: number;
  type?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters.chainId) {
    conditions.push(eq(transactions.chainId, filters.chainId));
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type as any));
  }
  if (filters.startTime) {
    conditions.push(gte(transactions.timestamp, filters.startTime));
  }
  if (filters.endTime) {
    conditions.push(lte(transactions.timestamp, filters.endTime));
  }
  
  const result = await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.timestamp))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);
  
  return result;
}

// 获取全局统计数据（关键改进）
export async function getTransactionsSummary(filters: {
  chainId?: number;
  type?: string;
  startTime?: Date;
  endTime?: Date;
}) {
  const db = await getDb();
  if (!db) return {
    totalCount: 0,
    totalAmount: 0,
    mintCount: 0,
    mintAmount: 0,
    burnCount: 0,
    burnAmount: 0,
    cctpCount: 0,
    cctpAmount: 0,
  };
  
  const conditions = [];
  
  if (filters.chainId) {
    conditions.push(eq(transactions.chainId, filters.chainId));
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type as any));
  }
  if (filters.startTime) {
    conditions.push(gte(transactions.timestamp, filters.startTime));
  }
  if (filters.endTime) {
    conditions.push(lte(transactions.timestamp, filters.endTime));
  }
  
  // 查询所有匹配的交易
  const result = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  // 在内存中聚合计算
  let totalCount = 0;
  let totalAmount = 0;
  let mintCount = 0;
  let mintAmount = 0;
  let burnCount = 0;
  let burnAmount = 0;
  let cctpCount = 0;
  let cctpAmount = 0;
  
  for (const tx of result) {
    totalCount++;
    const amount = parseFloat(tx.amount.toString());
    totalAmount += amount;
    
    if (tx.type === "CIRCLE_MINT") {
      mintCount++;
      mintAmount += amount;
    } else if (tx.type === "CIRCLE_BURN") {
      burnCount++;
      burnAmount += amount;
    } else if (tx.type === "CCTP_MINT" || tx.type === "CCTP_BURN") {
      cctpCount++;
      cctpAmount += amount;
    }
  }
  
  return {
    totalCount,
    totalAmount,
    mintCount,
    mintAmount,
    burnCount,
    burnAmount,
    cctpCount,
    cctpAmount,
  };
}
```

**设计原理**：
- `getTransactionsSummary` 查询所有匹配的交易（不分页）
- 在内存中按类型聚合计算总和
- 返回结构化的统计数据
- 与分页完全解耦，确保统计数据准确

#### 2. server/routers.ts

**作用**：定义 tRPC 路由和过程

```typescript
export const appRouter = router({
  tracker: router({
    // 获取分页交易列表
    getTransactions: publicProcedure
      .input(z.object({
        chainId: z.number().optional(),
        type: z.string().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await getTransactions({
          chainId: input.chainId,
          type: input.type,
          startTime: input.startTime,
          endTime: input.endTime,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // 获取全局统计数据
    getSummary: publicProcedure
      .input(z.object({
        chainId: z.number().optional(),
        type: z.string().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
      }))
      .query(async ({ input }) => {
        return await getTransactionsSummary({
          chainId: input.chainId,
          type: input.type,
          startTime: input.startTime,
          endTime: input.endTime,
        });
      }),

    // ... 其他路由
  }),
});
```

**关键概念**：
- `publicProcedure`：公开接口，无需认证
- `protectedProcedure`：受保护接口，需要认证
- `.input()`：定义输入参数的 Zod schema
- `.query()`：定义查询操作（只读）
- `.mutation()`：定义变更操作（读写）

#### 3. server/_core/context.ts

**作用**：为每个请求创建 tRPC 上下文

```typescript
export async function createContext(opts: {
  req: Request;
  res: Response;
}) {
  // 从 Cookie 中获取用户信息
  const user = await getCurrentUser(opts.req);
  
  return {
    req: opts.req,
    res: opts.res,
    user,  // 当前登录用户
  };
}
```

**使用方式**：
```typescript
// 在 protectedProcedure 中访问用户信息
protectedProcedure
  .query(async ({ ctx }) => {
    console.log(ctx.user.id);  // 用户 ID
    console.log(ctx.user.role);  // 用户角色
  })
```

### 认证流程

#### OAuth 流程
```
1. 用户点击登录 → 重定向到 Manus OAuth 服务器
2. 用户授权 → OAuth 服务器重定向回应用
3. 应用处理 /api/oauth/callback → 验证 code
4. 创建 session → 设置 Cookie
5. 用户登录成功 → 可以访问受保护的资源
```

#### Session 管理
```typescript
// 登录时创建 session
const sessionToken = generateToken();
res.cookie('session', sessionToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});

// 每个请求都会检查 session
const user = await verifySession(req.cookies.session);

// 登出时清除 session
res.clearCookie('session');
```

---

## 部署与运维

### 环境变量配置

**必需的环境变量**：
```bash
# 数据库
DATABASE_URL=mysql://user:password@host:port/database

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Session
JWT_SECRET=your_jwt_secret

# 所有者信息
OWNER_OPEN_ID=your_open_id
OWNER_NAME=Your Name

# Manus API
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key

# 应用信息
VITE_APP_TITLE=Circle 链上行为追踪器
VITE_APP_LOGO=/logo.png
```

### 本地开发

```bash
# 安装依赖
pnpm install

# 运行数据库迁移
pnpm db:push

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建生产版本
pnpm build
```

### 生产部署

1. **构建应用**：
```bash
pnpm build
```

2. **启动服务器**：
```bash
pnpm start
```

3. **监控日志**：
```bash
# 查看最近日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

### 数据库维护

#### 备份
```bash
# 导出数据库
mysqldump -u user -p database > backup.sql

# 导入数据库
mysql -u user -p database < backup.sql
```

#### 性能优化

1. **添加缺失的索引**：
```sql
-- 检查现有索引
SHOW INDEX FROM transactions;

-- 添加新索引
ALTER TABLE transactions ADD INDEX idx_timestamp_type (timestamp, type);
```

2. **查询优化**：
```sql
-- 使用 EXPLAIN 分析查询
EXPLAIN SELECT * FROM transactions 
WHERE chainId = 1 AND type = 'CIRCLE_MINT' 
AND timestamp BETWEEN '2024-01-01' AND '2024-01-31'
LIMIT 100;
```

3. **清理旧数据**：
```sql
-- 删除 30 天前的数据
DELETE FROM events WHERE createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## 开发工作流

### 添加新功能的步骤

#### 1. 更新数据库 schema

编辑 `drizzle/schema.ts`，添加新表或修改现有表：

```typescript
export const newTable = mysqlTable('new_table', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  // ... 其他字段
});
```

#### 2. 执行数据库迁移

```bash
pnpm db:push
```

#### 3. 添加数据库查询函数

在 `server/db.ts` 中添加查询函数：

```typescript
export async function getNewData(filters: {
  // 参数
}) {
  const db = await getDb();
  if (!db) return [];
  
  // 查询逻辑
  const result = await db
    .select()
    .from(newTable)
    .where(/* 条件 */);
  
  return result;
}
```

#### 4. 添加 tRPC 路由

在 `server/routers.ts` 中添加新的过程：

```typescript
tracker: router({
  // ... 现有路由
  
  getNewData: publicProcedure
    .input(z.object({
      // 输入参数
    }))
    .query(async ({ input }) => {
      return await getNewData({
        // 传递参数
      });
    }),
})
```

#### 5. 前端调用

在 React 组件中使用新的 API：

```typescript
const { data } = trpc.tracker.getNewData.useQuery({
  // 参数
});
```

#### 6. 编写测试

在 `server/*.test.ts` 中添加测试：

```typescript
import { describe, it, expect } from 'vitest';
import { getNewData } from './db';

describe('getNewData', () => {
  it('should return data', async () => {
    const result = await getNewData({});
    expect(result).toBeDefined();
  });
});
```

#### 7. 运行测试

```bash
pnpm test
```

### 常见开发任务

#### 任务 1：添加新的过滤条件

**前端**（`Dashboard.tsx`）：
```typescript
// 1. 添加到 FilterState
interface FilterState {
  chainId?: string;
  type?: string;
  newFilter?: string;  // 新增
}

// 2. 添加到查询
const { data: transactions } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
  newFilter: filters.newFilter,  // 新增
  limit: pageSize,
  offset: page * pageSize,
});

// 3. 添加过滤 UI
<Select value={filters.newFilter || "all"} onValueChange={(value) => {
  setFilters({ ...filters, newFilter: value === "all" ? undefined : value });
  setPage(0);
}}>
  {/* 选项 */}
</Select>
```

**后端**（`routers.ts` 和 `db.ts`）：
```typescript
// 1. 更新 input schema
getTransactions: publicProcedure
  .input(z.object({
    chainId: z.number().optional(),
    type: z.string().optional(),
    newFilter: z.string().optional(),  // 新增
    limit: z.number().default(100),
    offset: z.number().default(0),
  }))
  .query(async ({ input }) => {
    return await getTransactions({
      chainId: input.chainId,
      type: input.type,
      newFilter: input.newFilter,  // 新增
      limit: input.limit,
      offset: input.offset,
    });
  }),

// 2. 更新 db 函数
export async function getTransactions(filters: {
  chainId?: number;
  type?: string;
  newFilter?: string;  // 新增
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  // ... 现有条件
  
  if (filters.newFilter) {
    conditions.push(eq(transactions.newColumn, filters.newFilter));  // 新增
  }
  
  // ... 查询
}
```

#### 任务 2：修改统计计算逻辑

**后端**（`server/db.ts`）：
```typescript
export async function getTransactionsSummary(filters: {
  // ...
}) {
  // ... 查询所有交易
  
  // 修改聚合逻辑
  for (const tx of result) {
    totalCount++;
    const amount = parseFloat(tx.amount.toString());
    totalAmount += amount;
    
    // 新增逻辑
    if (tx.type === "NEW_TYPE") {
      newTypeCount++;
      newTypeAmount += amount;
    }
    
    // ... 其他逻辑
  }
  
  return {
    // ... 现有字段
    newTypeCount,
    newTypeAmount,
  };
}
```

**前端**（`Dashboard.tsx`）：
```typescript
const summaryStats = useMemo(() => {
  if (summary) {
    return {
      // ... 现有字段
      newTypeStat: summary.newTypeAmount,  // 新增
    };
  }
  return { /* ... */ };
}, [summary]);

// 在 UI 中显示
<Card>
  <CardHeader>
    <CardTitle>新类型统计</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">${summaryStats.newTypeStat.toLocaleString()}</div>
  </CardContent>
</Card>
```

---

## 常见问题与解决方案

### Q1：统计数据显示不正确

**症状**：Dashboard 的统计卡片显示的数字与实际数据不符

**原因**：
- 可能是使用了旧版本的代码（基于当前页面计算）
- 数据库中有重复数据
- 过滤条件未正确应用

**解决方案**：
1. 确保使用了 `getSummary` API，而不是基于 `transactions` 数组计算
2. 检查数据库中是否有重复的 `txHash`：
```sql
SELECT txHash, COUNT(*) FROM transactions GROUP BY txHash HAVING COUNT(*) > 1;
```
3. 验证过滤条件是否正确传递到后端

### Q2：查询性能缓慢

**症状**：Dashboard 加载时间过长

**原因**：
- 数据库中数据过多（超过 100 万条）
- 缺少必要的索引
- 查询条件不够具体

**解决方案**：
1. 检查索引是否存在：
```sql
SHOW INDEX FROM transactions;
```
2. 添加缺失的索引：
```sql
ALTER TABLE transactions ADD INDEX idx_timestamp_chainid (timestamp, chainId);
```
3. 使用 EXPLAIN 分析查询：
```sql
EXPLAIN SELECT * FROM transactions WHERE chainId = 1 LIMIT 100;
```
4. 考虑分区大表：
```sql
ALTER TABLE transactions PARTITION BY RANGE (YEAR(timestamp)) (
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN MAXVALUE
);
```

### Q3：OAuth 登录失败

**症状**：点击登录后无法重定向

**原因**：
- 环境变量配置不正确
- OAuth 应用未在 Manus 平台注册
- 回调 URL 不匹配

**解决方案**：
1. 检查环境变量：
```bash
echo $VITE_APP_ID
echo $OAUTH_SERVER_URL
```
2. 验证回调 URL 配置：
```
应该是：https://yourdomain.com/api/oauth/callback
```
3. 查看浏览器控制台错误信息
4. 检查后端日志：
```bash
tail -f logs/app.log | grep oauth
```

### Q4：导出 Excel 时出错

**症状**：点击导出按钮无反应或报错

**原因**：
- 交易列表为空
- 浏览器不支持文件下载
- 内存不足（数据过多）

**解决方案**：
1. 确保有交易数据显示
2. 检查浏览器是否允许下载
3. 分批导出大数据集：
```typescript
// 修改导出逻辑，分批处理
const batchSize = 1000;
for (let i = 0; i < transactions.length; i += batchSize) {
  const batch = transactions.slice(i, i + batchSize);
  // 处理每批数据
}
```

### Q5：分页不工作

**症状**：点击下一页无反应

**原因**：
- 页码状态未正确更新
- 查询参数未传递
- 数据总数计算错误

**解决方案**：
1. 检查页码状态：
```typescript
console.log('当前页:', page);
console.log('总交易数:', summaryStats.totalTransactions);
console.log('每页条数:', pageSize);
```
2. 验证查询参数：
```typescript
console.log('查询参数:', {
  limit: pageSize,
  offset: page * pageSize,
});
```
3. 确保使用了 `getSummary` 获取正确的总数

### Q6：时间戳显示错误

**症状**：交易时间显示不正确或为 NaN

**原因**：
- 数据库中的时间戳格式不一致
- 时区转换错误
- 日期格式化函数使用不当

**解决方案**：
1. 检查数据库中的时间戳：
```sql
SELECT id, timestamp, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') FROM transactions LIMIT 5;
```
2. 确保前端使用了正确的日期格式化：
```typescript
// 正确的方式
format(new Date(tx.timestamp), "yyyy-MM-dd HH:mm:ss")

// 错误的方式
new Date(tx.timestamp).toLocaleString()  // 可能显示本地时区
```
3. 在数据库中统一使用 UTC 时间戳

---

## 总结

本项目是一个完整的区块链交易追踪系统，具有以下特点：

1. **全栈应用**：从数据库到前端的完整实现
2. **实时性**：支持实时监听和数据更新
3. **可扩展性**：易于添加新的交易类型和区块链
4. **用户友好**：响应式设计，支持多种设备
5. **生产就绪**：包含认证、错误处理和性能优化

### 关键改进点

1. **统计数据独立化**：使用 `getSummary` API 确保统计数据与分页无关
2. **响应式设计**：手机、平板、桌面完美适配
3. **数据库优化**：合理的索引策略确保查询性能
4. **代码组织**：清晰的分层架构便于维护和扩展

### 后续建议

1. 添加实时 WebSocket 支持，推送新交易
2. 实现大额交易告警系统
3. 添加数据可视化（图表、热力图）
4. 支持多语言和主题切换
5. 实现高级分析功能（趋势分析、异常检测）

---

**文档版本**：1.0  
**最后更新**：2026-01-15  
**维护人员**：开发团队
