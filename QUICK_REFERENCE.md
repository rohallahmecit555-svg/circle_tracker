# Circle 追踪器 - 快速参考指南

## 快速导航

### 文件位置速查表

| 功能 | 文件位置 | 说明 |
|------|---------|------|
| 仪表板页面 | `client/src/pages/Dashboard.tsx` | 主要统计和交易列表 |
| 历史追溯页面 | `client/src/pages/HistoryTracker.tsx` | 按日期范围查询 |
| 数据库查询 | `server/db.ts` | 所有数据库操作 |
| API 路由 | `server/routers.ts` | tRPC 过程定义 |
| 数据库 Schema | `drizzle/schema.ts` | 表结构定义 |
| 样式配置 | `client/src/index.css` | 全局样式和主题 |
| 环境变量 | `.env` 或 `.env.local` | 配置文件 |

---

## 常用命令

### 开发命令
```bash
# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 数据库迁移
pnpm db:push

# 生成数据库类型
pnpm db:generate
```

### 数据库命令
```bash
# 连接数据库
mysql -u user -p -h host database

# 查看所有表
SHOW TABLES;

# 查看表结构
DESCRIBE transactions;

# 查看索引
SHOW INDEX FROM transactions;

# 查询交易总数
SELECT COUNT(*) FROM transactions;

# 查询最新交易
SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10;
```

---

## API 速查表

### 获取交易列表
```typescript
const { data } = trpc.tracker.getTransactions.useQuery({
  chainId: 1,              // 以太坊
  type: 'CIRCLE_MINT',     // 交易类型
  limit: 100,              // 每页条数
  offset: 0,               // 偏移量
});
```

### 获取统计数据
```typescript
const { data: summary } = trpc.tracker.getSummary.useQuery({
  chainId: 1,              // 可选：链 ID
  type: 'CIRCLE_MINT',     // 可选：交易类型
});

// 使用统计数据
console.log(summary.totalCount);     // 总交易数
console.log(summary.mintAmount);     // Mint 总金额
console.log(summary.burnAmount);     // Burn 总金额
```

### 按哈希查询交易
```typescript
const { data: tx } = trpc.tracker.getTransactionByHash.useQuery({
  txHash: '0x...',
});
```

### 查询日统计
```typescript
const { data: stats } = trpc.tracker.getStatistics.useQuery({
  date: '2024-01-15',      // 日期
  chainId: 1,              // 链 ID
  type: 'CIRCLE_MINT',     // 交易类型
});
```

---

## 数据库查询示例

### 查询特定链的交易
```sql
SELECT * FROM transactions 
WHERE chainId = 1 
ORDER BY timestamp DESC 
LIMIT 100;
```

### 查询特定时间范围的交易
```sql
SELECT * FROM transactions 
WHERE timestamp BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY timestamp DESC;
```

### 按交易类型统计
```sql
SELECT type, COUNT(*) as count, SUM(amount) as total_amount
FROM transactions
GROUP BY type;
```

### 按链统计
```sql
SELECT chainId, chainName, COUNT(*) as count, SUM(amount) as total_amount
FROM transactions
GROUP BY chainId, chainName;
```

### 查找大额交易
```sql
SELECT * FROM transactions 
WHERE amount > 1000000
ORDER BY amount DESC;
```

### 查找重复交易
```sql
SELECT txHash, COUNT(*) 
FROM transactions 
GROUP BY txHash 
HAVING COUNT(*) > 1;
```

---

## 常见修改场景

### 场景 1：修改统计卡片显示

**文件**：`client/src/pages/Dashboard.tsx`

**步骤**：
1. 找到统计卡片部分（约第 172 行）
2. 修改卡片内容或样式
3. 如需修改数据，更新 `summaryStats` 计算逻辑

**示例**：添加新的统计卡片
```typescript
<Card className="overflow-hidden">
  <CardHeader className="pb-2 sm:pb-3">
    <CardTitle className="text-xs sm:text-sm font-medium text-slate-600">
      新统计项
    </CardTitle>
  </CardHeader>
  <CardContent className="pb-2 sm:pb-4">
    <div className="text-xl sm:text-3xl font-bold text-slate-900">
      {summaryStats.newStat}
    </div>
  </CardContent>
</Card>
```

### 场景 2：修改表格列

**文件**：`client/src/pages/Dashboard.tsx`

**步骤**：
1. 找到 `TableHeader` 部分
2. 添加或删除 `TableHead`
3. 在 `TableBody` 中对应修改 `TableCell`

**示例**：添加新列
```typescript
<TableHead>交易哈希</TableHead>
<TableHead>新列</TableHead>  {/* 新增 */}
<TableHead>链</TableHead>
// ...

// 在 TableRow 中
<TableCell>{tx.newField}</TableCell>  {/* 新增 */}
```

### 场景 3：修改过滤条件

**文件**：`client/src/pages/Dashboard.tsx`

**步骤**：
1. 更新 `FilterState` 接口
2. 添加新的过滤 UI 组件
3. 更新查询参数

**示例**：
```typescript
// 1. 更新状态
interface FilterState {
  chainId?: string;
  type?: string;
  newFilter?: string;  // 新增
}

// 2. 添加 UI
<Select value={filters.newFilter || "all"} onValueChange={(value) => {
  setFilters({ ...filters, newFilter: value === "all" ? undefined : value });
  setPage(0);
}}>
  <SelectTrigger>
    <SelectValue placeholder="选择新过滤条件" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">全部</SelectItem>
    <SelectItem value="option1">选项 1</SelectItem>
    <SelectItem value="option2">选项 2</SelectItem>
  </SelectContent>
</Select>

// 3. 更新查询
const { data: transactions } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
  newFilter: filters.newFilter,  // 新增
  limit: pageSize,
  offset: page * pageSize,
});
```

### 场景 4：修改数据库查询

**文件**：`server/db.ts`

**步骤**：
1. 更新查询函数的参数
2. 添加新的查询条件
3. 修改返回数据结构

**示例**：
```typescript
export async function getTransactions(filters: {
  chainId?: number;
  type?: string;
  newFilter?: string;  // 新增参数
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
  if (filters.newFilter) {  // 新增条件
    conditions.push(eq(transactions.newColumn, filters.newFilter));
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
```

### 场景 5：修改 API 路由

**文件**：`server/routers.ts`

**步骤**：
1. 更新 `.input()` schema
2. 更新 `.query()` 或 `.mutation()` 逻辑
3. 调用更新后的 db 函数

**示例**：
```typescript
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
```

---

## 调试技巧

### 前端调试

**在浏览器控制台查看请求**：
```javascript
// 查看最后一个 tRPC 请求
console.log(window.__TRPC_DEBUG__);

// 查看 React Query 缓存
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
console.log(queryClient.getQueryData(['tracker.getTransactions']));
```

**添加调试日志**：
```typescript
const { data: transactions, isLoading } = trpc.tracker.getTransactions.useQuery({
  chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
  type: filters.type,
  limit: pageSize,
  offset: page * pageSize,
});

console.log('查询参数:', { chainId: filters.chainId, type: filters.type });
console.log('加载中:', isLoading);
console.log('数据:', transactions);
```

### 后端调试

**添加日志**：
```typescript
export async function getTransactions(filters: {
  chainId?: number;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  console.log('getTransactions called with:', filters);
  
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    return [];
  }
  
  const conditions = [];
  // ... 构建条件
  
  console.log('Query conditions:', conditions);
  
  const result = await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.timestamp))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);
  
  console.log('Query result count:', result.length);
  return result;
}
```

**查看 SQL 查询**：
```typescript
// 在 Drizzle ORM 中启用日志
import { sql } from 'drizzle-orm';

// 查询时会打印 SQL
const result = await db
  .select()
  .from(transactions)
  .where(/* ... */)
  .toSQL();

console.log('SQL:', result.sql);
```

---

## 性能优化建议

### 前端优化

1. **使用 React.memo 避免不必要的重新渲染**：
```typescript
const TransactionRow = React.memo(({ tx }) => (
  <TableRow>
    <TableCell>{tx.txHash}</TableCell>
    {/* ... */}
  </TableRow>
));
```

2. **使用 useMemo 缓存计算结果**：
```typescript
const summaryStats = useMemo(() => {
  // 计算统计数据
  return { /* ... */ };
}, [summary]);
```

3. **分页加载而不是一次加载所有数据**：
```typescript
// 已实现：limit: 100, offset: page * 100
```

### 后端优化

1. **添加数据库索引**：
```sql
ALTER TABLE transactions ADD INDEX idx_timestamp_chainid (timestamp, chainId);
ALTER TABLE transactions ADD INDEX idx_type (type);
```

2. **使用查询缓存**：
```typescript
// 使用 Redis 缓存热数据
const cacheKey = `transactions:${JSON.stringify(filters)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

3. **批量操作而不是逐条插入**：
```typescript
// 批量插入
await db.insert(transactions).values([tx1, tx2, tx3, ...]);
```

---

## 部署检查清单

部署前请确认：

- [ ] 所有环境变量已正确配置
- [ ] 数据库迁移已执行（`pnpm db:push`）
- [ ] 所有测试都通过（`pnpm test`）
- [ ] 生产构建成功（`pnpm build`）
- [ ] 没有 TypeScript 错误
- [ ] 没有 console.log 调试代码
- [ ] 敏感信息不在代码中（使用环境变量）
- [ ] 数据库备份已创建
- [ ] 监控和日志系统已配置
- [ ] 性能测试已完成

---

## 联系与支持

如有问题，请参考：
1. `PROJECT_HANDOVER.md` - 完整文档
2. `LOCAL_DEPLOYMENT_GUIDE.md` - 本地部署指南
3. 项目代码中的注释
4. 测试文件中的示例

---

**最后更新**：2026-01-15
