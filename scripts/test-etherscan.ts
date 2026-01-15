import { queryTransfersFromEtherscan, parseEtherscanLog, queryRecentTransfers } from '../server/etherscanApi';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

async function testEtherscan() {
  console.log('🔍 使用 Etherscan API 查询真实的 USDC 交易数据...\n');

  try {
    // 查询最近 7 天的交易
    const logs = await queryRecentTransfers('ethereum', 7);

    if (logs.length === 0) {
      console.log('⚠️  未找到任何交易数据');
      console.log('   可能原因:');
      console.log('   1. API Key 未配置或无效');
      console.log('   2. 最近 7 天内没有 USDC Transfer 事件');
      console.log('\n   请确保已配置 ETHERSCAN_API_KEY 环境变量');
      return;
    }

    console.log(`\n✅ 找到 ${logs.length} 条交易\n`);

    // 显示最近的 20 条交易
    console.log('📋 最近的 20 条交易:');
    const recentLogs = logs.slice(-20);
    
    for (const log of recentLogs) {
      const parsed = parseEtherscanLog(log);
      if (parsed) {
        const timestamp = new Date(parsed.timestamp * 1000).toISOString();
        console.log(`   - ${parsed.txHash.slice(0, 10)}... | ${parsed.type} | ${parsed.amount} USDC | ${timestamp}`);
      }
    }

    // 尝试将数据插入数据库
    console.log('\n💾 尝试将交易数据插入数据库...');
    const db = await getDb();
    
    if (db) {
      let insertedCount = 0;
      let skippedCount = 0;

      // 只插入最近 50 条
      for (const log of logs.slice(-50)) {
        try {
          const parsed = parseEtherscanLog(log);
          if (!parsed) continue;

          // 只插入 CIRCLE_MINT 和 CIRCLE_BURN
          if (parsed.type === 'TRANSFER') {
            skippedCount++;
            continue;
          }

          // 检查是否已存在
          const existing = await db.select().from(transactions).where(
            (t: any) => t.txHash === parsed.txHash
          ).limit(1);

          if (existing.length === 0) {
            await db.insert(transactions).values({
              txHash: parsed.txHash,
              chainId: 1,
              chainName: 'Ethereum',
              blockNumber: parsed.blockNumber,
              timestamp: new Date(parsed.timestamp * 1000),
              fromAddress: parsed.from,
              toAddress: parsed.to,
              amount: parsed.amount,
              type: parsed.type as any,
              status: 'CONFIRMED',
            });
            insertedCount++;
            console.log(`   ✅ 插入: ${parsed.txHash.slice(0, 10)}... (${parsed.type}) | ${parsed.amount} USDC`);
          }
        } catch (error) {
          console.error(`   ❌ 处理交易失败:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      console.log(`\n✅ 成功插入 ${insertedCount} 条交易到数据库`);
      console.log(`⏭️  跳过 ${skippedCount} 条普通转账交易`);

      // 查询数据库中的所有交易
      const dbTransactions = await db.select().from(transactions);
      console.log(`\n📊 数据库中的所有交易 (共 ${dbTransactions.length} 条):`);
      for (const tx of dbTransactions.slice(-20)) {
        const timestamp = new Date(tx.timestamp).toISOString();
        console.log(`   - ${tx.txHash.slice(0, 10)}... | ${tx.type} | ${tx.amount} USDC | ${tx.chainName} | ${timestamp}`);
      }
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      console.error('   详细信息:', error.stack);
    }
  }
}

testEtherscan();
