# Circle 追踪器 - 架构深度解析

## 目录
1. [系统架构](#系统架构)
2. [数据流设计](#数据流设计)
3. [关键设计决策](#关键设计决策)
4. [性能考虑](#性能考虑)
5. [扩展性设计](#扩展性设计)
6. [安全性设计](#安全性设计)

---

## 系统架构

### 分层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     表现层 (Presentation Layer)                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Dashboard      │  │  HistoryTracker  │  │  Home Page   │  │
│  │   (React)        │  │   (React)        │  │  (React)     │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │           │
│           └─────────────────────┼────────────────────┘           │
│                                 │                                │
│                           tRPC 客户端                            │
│                                 │                                │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                    ┌─────────────┴────────────────┐
                    │                              │
┌───────────────────┴──────────────────────────────┴──────────────┐
│              应用层 (Application Layer)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  tRPC Router                                             │  │
│  │  ├─ tracker.getTransactions                             │  │
│  │  ├─ tracker.getSummary                                  │  │
│  │  ├─ tracker.getStatistics                               │  │
│  │  ├─ tracker.getTransactionByHash                        │  │
│  │  ├─ auth.me                                             │  │
│  │  └─ auth.logout                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  业务逻辑层 (Business Logic Layer)                       │  │
│  │  ├─ 数据验证和转换                                      │  │
│  │  ├─ 业务规则实现                                        │  │
│  │  ├─ 统计计算                                            │  │
│  │  └─ 认证和授权                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  数据访问层 (Data Access Layer)                          │  │
│  │  ├─ getTransactions()                                   │  │
│  │  ├─ getTransactionsSummary()                            │  │
│  │  ├─ getStatistics()                                     │  │
│  │  ├─ getTransactionByHash()                              │  │
│  │  └─ 其他数据库操作                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌───────┴────────────────────┐  ┌──────────┴─────────────────┐
│   数据库层 (Data Layer)     │  │  认证层 (Auth Layer)      │
│                            │  │                           │
│  MySQL/TiDB 数据库         │  │  Manus OAuth 2.0          │
│  ├─ transactions          │  │  ├─ 用户认证              │
│  ├─ statistics            │  │  ├─ Session 管理          │
│  ├─ events                │  │  └─ 权限控制              │
│  ├─ users                 │  │                           │
│  └─ alertConfigs          │  │                           │
└────────────────────────────┘  └───────────────────────────┘
```

### 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|---------|
| 表现层 | 用户界面渲染、交互处理 | `client/src/pages/*.tsx` |
| 应用层 | 请求路由、参数验证 | `server/routers.ts` |
| 业务逻辑 | 数据处理、计算、规则 | `server/db.ts` |
| 数据访问 | 数据库查询 | `server/db.ts` |
| 数据存储 | 持久化存储 | MySQL/TiDB |

---

## 数据流设计

### 1. 查询流程（Query Flow）

#### 场景：获取交易列表

```
用户操作
  ↓
前端状态更新 (setFilters, setPage)
  ↓
触发 tRPC 查询
  ↓
前端发送 HTTP POST 请求到 /api/trpc/tracker.getTransactions
  ↓
后端接收请求
  ↓
参数验证 (Zod schema)
  ↓
调用 getTransactions() 函数
  ↓
构建 SQL 查询条件
  ↓
执行数据库查询
  ↓
返回结果数组
  ↓
前端接收数据
  ↓
React Query 缓存数据
  ↓
组件重新渲染
  ↓
显示交易列表
```

**代码示例**：

前端：
```typescript
// 1. 用户改变过滤条件
const handleFilterChange = (newFilter) => {
  setFilters(newFilter);
  setPage(0);  // 重置页码
};

// 2. 触发查询（自动）
const { data: transactions, isLoading } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
  limit: 100,
  offset: page * 100,
});

// 3. 渲染数据
{isLoading ? <Spinner /> : <TransactionTable data={transactions} />}
```

后端：
```typescript
// 1. 定义路由
getTransactions: publicProcedure
  .input(z.object({
    chainId: z.number().optional(),
    type: z.string().optional(),
    limit: z.number().default(100),
    offset: z.number().default(0),
  }))
  .query(async ({ input }) => {
    // 2. 调用数据库函数
    return await getTransactions({
      chainId: input.chainId,
      type: input.type,
      limit: input.limit,
      offset: input.offset,
    });
  }),

// 3. 数据库函数
export async function getTransactions(filters: {
  chainId?: number;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  const conditions = [];
  
  if (filters.chainId) {
    conditions.push(eq(transactions.chainId, filters.chainId));
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type as any));
  }
  
  return await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.timestamp))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);
}
```

### 2. 统计流程（Summary Flow）- 关键改进

#### 场景：获取全局统计

```
用户打开 Dashboard
  ↓
前端发送两个并行请求：
  ├─ 请求 1: getSummary (获取全局统计)
  └─ 请求 2: getTransactions (获取分页列表)
  ↓
后端处理 getSummary 请求
  ↓
查询数据库中所有匹配的交易（不分页）
  ↓
在内存中按类型聚合计算
  ↓
返回统计结果：{
    totalCount: 66,
    mintAmount: 24973462,
    burnAmount: 14176986,
    ...
  }
  ↓
前端接收统计数据
  ↓
显示统计卡片（与分页无关）
  ↓
同时显示分页列表
```

**关键设计原理**：

1. **独立查询**：统计数据通过独立的 API 获取，不依赖分页
2. **内存聚合**：在内存中进行聚合计算，避免复杂的 SQL GROUP BY
3. **缓存友好**：相同的过滤条件会使用缓存的统计数据
4. **准确性**：统计数据总是基于完整的数据集

**代码示例**：

```typescript
// 后端：getTransactionsSummary
export async function getTransactionsSummary(filters: {
  chainId?: number;
  type?: string;
  startTime?: Date;
  endTime?: Date;
}) {
  const db = await getDb();
  const conditions = [];
  
  // 构建查询条件
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
  
  // 查询所有匹配的交易（关键：不分页）
  const result = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  // 在内存中聚合
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

// 前端：使用统计数据
const { data: summary } = trpc.tracker.getSummary.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
});

// 统计数据与分页完全独立
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

### 3. 认证流程（Authentication Flow）

```
用户点击登录
  ↓
前端重定向到 Manus OAuth 服务器
  ↓
用户授权应用
  ↓
OAuth 服务器重定向回应用（带 code）
  ↓
应用处理 /api/oauth/callback
  ↓
验证 code 的有效性
  ↓
从 OAuth 服务器获取用户信息
  ↓
创建或更新用户记录
  ↓
生成 session token
  ↓
设置 httpOnly cookie
  ↓
重定向到首页
  ↓
后续请求自动附带 cookie
  ↓
后端验证 session
  ↓
获取用户信息
```

---

## 关键设计决策

### 1. 为什么使用 tRPC？

**优势**：
- **类型安全**：前后端共享类型定义，消除类型不匹配
- **自动生成客户端**：无需手写 API 调用代码
- **简化错误处理**：统一的错误处理机制
- **开发效率**：减少重复代码

**示例对比**：

传统 REST API：
```typescript
// 前端
const response = await fetch('/api/transactions?chainId=1&limit=100');
const data = await response.json();
// 需要手动处理类型

// 后端
app.get('/api/transactions', (req, res) => {
  const chainId = req.query.chainId;
  // 需要手动验证参数
});
```

tRPC：
```typescript
// 前端 - 类型自动推导
const { data } = trpc.tracker.getTransactions.useQuery({
  chainId: 1,  // 自动类型检查
  limit: 100,
});

// 后端 - 参数自动验证
getTransactions: publicProcedure
  .input(z.object({
    chainId: z.number().optional(),
    limit: z.number().default(100),
  }))
  .query(async ({ input }) => {
    // input 已验证
  })
```

### 2. 为什么分离 getSummary 和 getTransactions？

**原因**：
- **独立性**：统计数据不依赖分页
- **准确性**：统计总是基于完整数据集
- **性能**：可以独立缓存和优化
- **灵活性**：用户可以改变分页而不影响统计

**对比**：

错误的方式（统计基于当前页面）：
```typescript
// 问题：用户翻页时统计数据会变化
const summaryStats = useMemo(() => {
  let total = 0;
  for (const tx of transactions) {  // 基于当前页面
    total += parseFloat(tx.amount);
  }
  return { totalAmount: total };
}, [transactions]);  // 依赖 transactions，会随分页变化
```

正确的方式（统计独立获取）：
```typescript
// 解决方案：统计数据独立获取
const { data: summary } = trpc.tracker.getSummary.useQuery({
  chainId: filters.chainId,
  type: filters.type,
  // 不包含 limit 和 offset
});

const { data: transactions } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId,
  type: filters.type,
  limit: 100,
  offset: page * 100,
});

// 统计数据与分页无关
const summaryStats = useMemo(() => {
  if (summary) {
    return {
      totalAmount: summary.totalAmount,  // 基于所有数据
    };
  }
  return { totalAmount: 0 };
}, [summary]);  // 只依赖 summary，不受分页影响
```

### 3. 为什么使用 Drizzle ORM？

**优势**：
- **类型安全**：SQL 查询的类型检查
- **轻量级**：相比 Sequelize 或 TypeORM 更轻
- **灵活性**：支持原始 SQL 和查询构建器
- **迁移管理**：内置迁移工具

**示例**：

```typescript
// 类型安全的查询
const result = await db
  .select({
    id: transactions.id,
    amount: transactions.amount,
    type: transactions.type,
  })
  .from(transactions)
  .where(eq(transactions.chainId, 1))
  .orderBy(desc(transactions.timestamp));

// 结果的类型自动推导为：
// Array<{
//   id: number;
//   amount: Decimal;
//   type: string;
// }>
```

### 4. 为什么使用 React Query？

**优势**：
- **自动缓存**：相同查询自动使用缓存
- **后台同步**：自动刷新过期数据
- **乐观更新**：提升用户体验
- **错误处理**：统一的错误处理

**示例**：

```typescript
// 自动缓存和重试
const { data, isLoading, error } = trpc.tracker.getTransactions.useQuery({
  chainId: 1,
  limit: 100,
  offset: 0,
}, {
  staleTime: 5 * 60 * 1000,  // 5 分钟内使用缓存
  cacheTime: 10 * 60 * 1000,  // 10 分钟后清除缓存
  retry: 3,  // 失败重试 3 次
});
```

---

## 性能考虑

### 1. 数据库查询优化

#### 索引策略

```sql
-- 创建复合索引用于常见查询
CREATE INDEX idx_timestamp_chainid ON transactions(timestamp DESC, chainId);
CREATE INDEX idx_type_timestamp ON transactions(type, timestamp DESC);
CREATE INDEX idx_chainid_type ON transactions(chainId, type);

-- 查询计划分析
EXPLAIN SELECT * FROM transactions 
WHERE chainId = 1 AND type = 'CIRCLE_MINT'
ORDER BY timestamp DESC
LIMIT 100;
```

#### 查询优化

```typescript
// 优化前：N+1 问题
for (const chainId of chainIds) {
  const result = await db.select().from(transactions).where(eq(transactions.chainId, chainId));
  // 执行多次查询
}

// 优化后：一次查询
const result = await db
  .select()
  .from(transactions)
  .where(inArray(transactions.chainId, chainIds));
```

### 2. 前端性能优化

#### 虚拟滚动（大数据列表）

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={transactions.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <TransactionRow transaction={transactions[index]} />
    </div>
  )}
</FixedSizeList>
```

#### 记忆化优化

```typescript
// 避免不必要的重新渲染
const TransactionRow = React.memo(({ transaction }) => (
  <TableRow>
    <TableCell>{transaction.txHash}</TableCell>
    {/* ... */}
  </TableRow>
), (prevProps, nextProps) => {
  return prevProps.transaction.id === nextProps.transaction.id;
});
```

#### 分页而不是无限加载

```typescript
// 分页：每页 100 条，用户手动翻页
const pageSize = 100;
const currentPage = 0;
const offset = currentPage * pageSize;

// 查询
const { data } = trpc.tracker.getTransactions.useQuery({
  limit: pageSize,
  offset: offset,
});
```

### 3. 缓存策略

#### 前端缓存

```typescript
// React Query 自动缓存
const { data } = trpc.tracker.getTransactions.useQuery({
  chainId: 1,
  limit: 100,
  offset: 0,
}, {
  staleTime: 5 * 60 * 1000,  // 5 分钟内不重新获取
  cacheTime: 30 * 60 * 1000,  // 30 分钟后清除缓存
});
```

#### 后端缓存

```typescript
// 使用 Redis 缓存热数据
const cacheKey = `transactions:${JSON.stringify(filters)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await db.select().from(transactions).where(/* ... */);
await redis.setex(cacheKey, 5 * 60, JSON.stringify(result));

return result;
```

---

## 扩展性设计

### 1. 添加新的交易类型

**步骤**：

1. 更新数据库 schema：
```typescript
// drizzle/schema.ts
export const transactions = mysqlTable('transactions', {
  // ...
  type: mysqlEnum('type', [
    'CIRCLE_MINT',
    'CIRCLE_BURN',
    'CCTP_BURN',
    'CCTP_MINT',
    'NEW_TYPE',  // 新增
    'OTHER'
  ]).notNull(),
});
```

2. 更新常量：
```typescript
// shared/constants.ts
export const TRANSACTION_TYPES = {
  CIRCLE_MINT: 'Circle Mint (法币兑换)',
  CIRCLE_BURN: 'Circle Burn (法币赎回)',
  CCTP_BURN: 'CCTP Burn (跨链销毁)',
  CCTP_MINT: 'CCTP Mint (跨链铸造)',
  NEW_TYPE: 'New Type (新类型)',
  OTHER: 'Other (其他)',
};
```

3. 更新统计逻辑：
```typescript
// server/db.ts
export async function getTransactionsSummary(filters) {
  // ... 现有逻辑
  
  let newTypeCount = 0;
  let newTypeAmount = 0;
  
  for (const tx of result) {
    // ... 现有逻辑
    
    if (tx.type === "NEW_TYPE") {
      newTypeCount++;
      newTypeAmount += amount;
    }
  }
  
  return {
    // ... 现有字段
    newTypeCount,
    newTypeAmount,
  };
}
```

4. 更新前端显示：
```typescript
// client/src/pages/Dashboard.tsx
<Card>
  <CardHeader>
    <CardTitle>新类型统计</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">${summary.newTypeAmount.toLocaleString()}</div>
  </CardContent>
</Card>
```

### 2. 添加新的区块链

**步骤**：

1. 更新链常量：
```typescript
// shared/constants.ts
export const CHAINS = {
  ETHEREUM: { id: 1, name: 'Ethereum', rpc: 'https://eth.rpc.url' },
  BASE: { id: 8453, name: 'Base', rpc: 'https://base.rpc.url' },
  ARBITRUM: { id: 42161, name: 'Arbitrum', rpc: 'https://arbitrum.rpc.url' },
  NEW_CHAIN: { id: 12345, name: 'New Chain', rpc: 'https://newchain.rpc.url' },
};
```

2. 更新事件监听器：
```typescript
// server/eventListenerRouter.ts
const chains = [
  { chainId: 1, rpc: CHAINS.ETHEREUM.rpc },
  { chainId: 8453, rpc: CHAINS.BASE.rpc },
  { chainId: 42161, rpc: CHAINS.ARBITRUM.rpc },
  { chainId: 12345, rpc: CHAINS.NEW_CHAIN.rpc },  // 新增
];

for (const chain of chains) {
  startListening(chain.chainId, chain.rpc);
}
```

### 3. 添加新的功能模块

**架构**：

```
server/
├── routers/
│   ├── tracker.ts        # 交易追踪
│   ├── analytics.ts      # 新增：分析模块
│   ├── alerts.ts         # 新增：告警模块
│   └── reports.ts        # 新增：报告模块
├── db/
│   ├── transactions.ts   # 交易查询
│   ├── analytics.ts      # 新增：分析查询
│   ├── alerts.ts         # 新增：告警查询
│   └── reports.ts        # 新增：报告查询
└── services/
    ├── eventListener.ts  # 事件监听
    ├── analytics.ts      # 新增：分析服务
    ├── alerts.ts         # 新增：告警服务
    └── reports.ts        # 新增：报告服务
```

**示例：添加分析模块**

```typescript
// server/routers/analytics.ts
export const analyticsRouter = router({
  getTrends: publicProcedure
    .input(z.object({
      chainId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      return await getTransactionTrends({
        chainId: input.chainId,
        days: input.days,
      });
    }),

  getDistribution: publicProcedure
    .input(z.object({
      chainId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await getTransactionDistribution({
        chainId: input.chainId,
      });
    }),
});

// server/routers.ts
export const appRouter = router({
  tracker: trackerRouter,
  analytics: analyticsRouter,  // 新增
  auth: authRouter,
});
```

---

## 安全性设计

### 1. 认证和授权

```typescript
// 公开接口 - 无需认证
getTransactions: publicProcedure
  .input(z.object({ /* ... */ }))
  .query(async ({ input }) => {
    // 任何人都可以访问
  }),

// 受保护接口 - 需要认证
getAlertConfig: protectedProcedure
  .query(async ({ ctx }) => {
    // 只有登录用户可以访问
    // ctx.user 包含当前用户信息
    return await getAlertConfig(ctx.user.id);
  }),

// 管理员接口 - 需要管理员角色
deleteTransaction: protectedProcedure
  .use(({ ctx, next }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  })
  .mutation(async ({ input }) => {
    // 只有管理员可以执行
  }),
```

### 2. 输入验证

```typescript
// 使用 Zod 进行严格的输入验证
getTransactions: publicProcedure
  .input(z.object({
    chainId: z.number().int().positive().optional(),
    type: z.enum(['CIRCLE_MINT', 'CIRCLE_BURN', 'CCTP_BURN', 'CCTP_MINT', 'OTHER']).optional(),
    limit: z.number().int().min(1).max(1000).default(100),
    offset: z.number().int().min(0).default(0),
  }))
  .query(async ({ input }) => {
    // input 已被验证
  }),
```

### 3. SQL 注入防护

```typescript
// 使用 ORM 自动防护 SQL 注入
const result = await db
  .select()
  .from(transactions)
  .where(eq(transactions.chainId, input.chainId))  // 参数化查询
  .where(eq(transactions.type, input.type));

// 避免：字符串拼接（容易被注入）
// const query = `SELECT * FROM transactions WHERE chainId = ${input.chainId}`;
```

### 4. CORS 和 CSRF 防护

```typescript
// Express 中间件配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

app.use(csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
}));
```

### 5. 敏感数据保护

```typescript
// 不要在响应中包含敏感信息
export async function getUser(userId: number) {
  const user = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      // 不返回密码或 JWT 密钥
    })
    .from(users)
    .where(eq(users.id, userId));
  
  return user;
}

// 环境变量中存储敏感信息
const jwtSecret = process.env.JWT_SECRET;
const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
// 不要在代码中硬编码
```

---

## 总结

本架构设计遵循以下原则：

1. **分层设计**：清晰的职责划分
2. **类型安全**：从数据库到前端的完整类型检查
3. **性能优先**：缓存、索引、查询优化
4. **可扩展性**：易于添加新功能和区块链
5. **安全性**：认证、授权、输入验证

这些设计决策确保系统既能满足当前需求，又能支持未来的扩展。

---

**最后更新**：2026-01-15
