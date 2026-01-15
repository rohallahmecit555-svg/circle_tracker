import { queryHistoricalTransfers } from '../server/eventListener';
import { getDb } from '../server/db';

async function testBaseData() {
  console.log('🔍 从 Base 链查询真实的 USDC 交易数据...\n');

  try {
    // 查询 Base 链最近 1000 个区块的交易
    // Base 链 ID: 8453
    console.log('⏳ 查询 Base 链最近 1000 个区块的 USDC Transfer 事件...');
    console.log('   (这可能需要 30-60 秒)\n');

    const result = await queryHistoricalTransfers(
      8453,
      0,  // 从区块 0 开始
      'latest'  // 到最新区块
    );

    console.log(`\n✅ 查询完成！`);
    console.log(`   找到 ${result.length} 条交易\n`);

    if (result.length > 0) {
      console.log('📋 最近的 10 条交易:');
      const recent = result.slice(-10);
      for (const tx of recent) {
        console.log(`   - ${tx.txHash.slice(0, 10)}... | 类型: ${tx.type} | 金额: ${tx.amount} USDC`);
      }

      // 检查数据库中的数据
      const db = await getDb();
      if (db) {
        console.log('\n🗄️  检查数据库中的交易...');
        const { transactions } = await import('../drizzle/schema');
        const dbTransactions = await db.select().from(transactions).limit(5);
        console.log(`   数据库中有 ${dbTransactions.length} 条交易记录`);
      }
    } else {
      console.log('⚠️  未找到任何交易数据');
      console.log('   这可能是因为:');
      console.log('   1. Base 链上最近没有 USDC 交易');
      console.log('   2. RPC 端点限制了查询范围');
      console.log('   3. USDC 合约地址不正确');
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
  }
}

testBaseData();
