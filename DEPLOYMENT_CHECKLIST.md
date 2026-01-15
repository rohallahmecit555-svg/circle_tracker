# Circle 追踪器 - 本地部署检查清单

## 📋 部署前准备

### 系统环境
- [ ] 安装 Node.js 18+ (`node --version`)
- [ ] 安装 npm/pnpm (`pnpm --version`)
- [ ] 安装 PostgreSQL 12+ (`psql --version`)
- [ ] 安装 Git (`git --version`)
- [ ] 网络连接正常，能访问外网

### 账户和密钥
- [ ] 注册 Alchemy 账户 (https://www.alchemy.com/)
- [ ] 创建 Ethereum Mainnet 应用，获取 API Key
- [ ] 创建 Base 应用，获取 API Key
- [ ] 创建 Arbitrum 应用，获取 API Key
- [ ] 创建 Polygon 应用，获取 API Key
- [ ] 创建 Optimism 应用，获取 API Key
- [ ] 记录所有 API Key 到安全位置

---

## 🛠️ 环境配置

### 数据库设置
- [ ] PostgreSQL 服务已启动
- [ ] 创建数据库 `circle_tracker`
- [ ] 创建用户 `circle_user`
- [ ] 设置用户密码
- [ ] 授予用户所有权限
- [ ] 测试数据库连接：`psql -U circle_user -d circle_tracker -h localhost`

### 项目配置
- [ ] 克隆项目到本地
- [ ] 进入项目目录
- [ ] 创建 `.env.local` 文件
- [ ] 配置 `DATABASE_URL`
- [ ] 配置所有 RPC 端点 URL
- [ ] 设置 `NODE_ENV=production` 或 `development`
- [ ] 设置 `PORT=3000`（或其他端口）

### 环境变量示例
```bash
# .env.local
DATABASE_URL="postgresql://circle_user:password@localhost:5432/circle_tracker"
ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY"
POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY"
OPTIMISM_RPC_URL="https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY"
NODE_ENV="production"
PORT=3000
```

---

## 📦 应用部署

### 依赖安装
- [ ] 运行 `pnpm install`
- [ ] 检查是否有错误
- [ ] 验证 `node_modules` 目录已创建

### 数据库迁移
- [ ] 运行 `pnpm db:push`
- [ ] 检查迁移是否成功
- [ ] 验证数据库表已创建：
  ```sql
  \dt -- 在 psql 中查看所有表
  ```

### 应用启动
- [ ] 运行 `pnpm build`（生产环境）
- [ ] 检查构建是否成功
- [ ] 运行 `pnpm start` 或 `pnpm dev`
- [ ] 应用在 `http://localhost:3000` 启动
- [ ] 打开浏览器访问应用

---

## 🔍 功能验证

### 基础功能
- [ ] 首页加载正常
- [ ] 仪表板页面可访问
- [ ] 可以看到交易列表
- [ ] 过滤器可以正常使用
- [ ] 可以导出 Excel 文件

### 历史追溯功能
- [ ] 进入"历史事件追溯"页面
- [ ] 选择日期范围
- [ ] 点击"查询"按钮
- [ ] 显示查询结果
- [ ] 可以按链和类型过滤
- [ ] 可以导出结果

### 实时监测功能
- [ ] 进入"实时监控"页面
- [ ] 选择链
- [ ] 输入区块范围
- [ ] 点击"查询历史数据"
- [ ] 显示查询结果
- [ ] 可以启动实时监听器

---

## ⚙️ 监测配置

### 监测参数设置
- [ ] 确定要监测的链（Ethereum、Base、Arbitrum 等）
- [ ] 确定要监测的交易类型（CIRCLE_MINT、CIRCLE_BURN、CCTP_MINT、CCTP_BURN）
- [ ] 设置大额交易告警阈值（默认 100 万 USDC）
- [ ] 设置监测间隔（默认 60 秒）

### 告警配置
- [ ] 配置通知渠道（Email、Webhook、Telegram 等）
- [ ] 测试通知是否正常工作
- [ ] 设置告警规则
- [ ] 验证告警是否触发

### 启动监测
- [ ] 通过 UI 或 API 启动实时监听器
- [ ] 查看监测日志
- [ ] 验证是否有新交易被捕获

---

## 🧪 测试场景

### 场景 1：查询历史交易
- [ ] 打开历史追溯页面
- [ ] 选择最近 7 天
- [ ] 选择 Ethereum 链
- [ ] 选择 CIRCLE_MINT 类型
- [ ] 点击查询
- [ ] 验证结果是否正确

### 场景 2：导出数据
- [ ] 查询交易列表
- [ ] 点击"导出 Excel"按钮
- [ ] 验证文件是否下载
- [ ] 打开 Excel 文件验证数据

### 场景 3：实时监测
- [ ] 启动实时监听器
- [ ] 等待 60 秒
- [ ] 检查是否有新交易被添加
- [ ] 停止监听器

### 场景 4：大额交易告警
- [ ] 配置告警阈值为 100 万 USDC
- [ ] 启动监听器
- [ ] 如果有大额交易，验证是否收到通知

---

## 🔐 安全检查

### 环境安全
- [ ] `.env.local` 文件已添加到 `.gitignore`
- [ ] 不要将 `.env.local` 提交到 Git
- [ ] API Key 没有暴露在代码中
- [ ] 数据库密码使用强密码

### 数据库安全
- [ ] PostgreSQL 只允许本地连接
- [ ] 创建了只读用户用于查询
- [ ] 启用了 SSL 连接（可选）
- [ ] 定期备份数据库

### API 安全
- [ ] 启用了速率限制
- [ ] 添加了 CORS 配置
- [ ] 敏感操作需要身份验证
- [ ] 日志中不包含敏感信息

---

## 📊 性能优化

### 数据库优化
- [ ] 为常用字段创建了索引
- [ ] 运行了 `ANALYZE` 命令优化查询
- [ ] 配置了连接池
- [ ] 设置了查询超时

### 应用优化
- [ ] 启用了缓存（Redis 或内存缓存）
- [ ] 使用了分页而不是一次性加载所有数据
- [ ] 启用了 gzip 压缩
- [ ] 优化了数据库查询

### 监测优化
- [ ] 使用了批量查询而不是单个查询
- [ ] 设置了合理的监测间隔
- [ ] 使用了异步处理
- [ ] 实现了增量同步

---

## 📝 日志和监控

### 日志配置
- [ ] 配置了日志级别（DEBUG、INFO、WARN、ERROR）
- [ ] 日志文件已创建
- [ ] 日志轮转已配置
- [ ] 可以查看实时日志

### 监控设置
- [ ] 配置了应用健康检查
- [ ] 配置了数据库连接监控
- [ ] 配置了 RPC 连接监控
- [ ] 设置了告警规则

### 备份和恢复
- [ ] 配置了数据库备份计划
- [ ] 测试了备份恢复流程
- [ ] 文档已记录恢复步骤
- [ ] 备份文件存储在安全位置

---

## 🚀 上线前检查

### 最终验证
- [ ] 所有功能已测试
- [ ] 所有已知问题已解决
- [ ] 性能测试已完成
- [ ] 安全审计已完成
- [ ] 文档已更新

### 运维准备
- [ ] 监控系统已配置
- [ ] 告警系统已配置
- [ ] 日志系统已配置
- [ ] 备份系统已配置
- [ ] 故障恢复计划已制定

### 团队准备
- [ ] 团队已培训
- [ ] 文档已分发
- [ ] 支持计划已制定
- [ ] 联系方式已记录

---

## 📞 故障排查快速参考

### 常见错误和解决方案

| 错误 | 解决方案 |
|------|---------|
| `ECONNREFUSED` | 检查 PostgreSQL 是否运行 |
| `Invalid API Key` | 检查 RPC URL 和 API Key |
| `Query timeout` | 增加查询超时时间或优化查询 |
| `Out of memory` | 增加服务器内存或使用流式处理 |
| `No transactions found` | 检查时间范围和链配置 |

### 查看日志
```bash
# 开发模式
pnpm dev

# 生产模式
tail -f logs/app.log

# 查看特定错误
grep "ERROR" logs/app.log | tail -20
```

### 测试连接
```bash
# 测试数据库连接
psql -U circle_user -d circle_tracker -h localhost

# 测试 RPC 连接
curl -X POST https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## ✅ 部署完成

当所有检查项都完成后，您的 Circle 追踪器已准备就绪！

- 🎉 应用已在 `http://localhost:3000` 运行
- 📊 可以查询历史交易
- 🔔 实时监测已启动
- 📈 告警系统已配置

**下一步**：
1. 定期检查监测日志
2. 验证告警是否正常工作
3. 根据需要调整监测参数
4. 定期备份数据库

