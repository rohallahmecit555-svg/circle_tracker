import { ethers } from 'ethers';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

async function testBaseRecent() {
  console.log('🔍 从 Base 链查询最近的 USDC 交易数据...\n');

  try {
    const provider = new ethers.JsonRpcProvider('https://base.publicnode.com');
    const latestBlock = await provider.getBlockNumber();
    console.log(`✅ Base 链当前区块: ${latestBlock}\n`);

    // 只查询最近 10000 个区块
    const fromBlock = Math.max(0, latestBlock - 10000);
    const toBlock = latestBlock;

    console.log(`⏳ 查询区块 ${fromBlock} 到 ${toBlock} 的 USDC Transfer 事件...`);
    console.log(`   (范围: ${toBlock - fromBlock} 个区块)\n`);

    const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const transferSignature = ethers.id('Transfer(address,address,uint256)');

    const logs = await provider.getLogs({
      address: usdcAddress,
      topics: [transferSignature],
      fromBlock,
      toBlock,
    });

    console.log(`✅ 找到 ${logs.length} 条 Transfer 事件\n`);

    if (logs.length > 0) {
      console.log('📋 最近的 20 条交易:');
      const recentLogs = logs.slice(-20);
      
      for (const log of recentLogs) {
        const block = await provider.getBlock(log.blockNumber);
        const timestamp = block ? new Date(block.timestamp * 1000).toISOString() : 'Unknown';
        console.log(`   - ${log.transactionHash.slice(0, 10)}... | Block: ${log.blockNumber} | Time: ${timestamp}`);
      }

      // 尝试将数据插入数据库
      console.log('\n💾 尝试将交易数据插入数据库...');
      const db = await getDb();
      
      if (db) {
        const usdcAbi = [
          'event Transfer(address indexed from, address indexed to, uint256 value)',
        ];
        const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
        
        let insertedCount = 0;
        for (const log of logs.slice(-10)) {  // 只插入最近 10 条
          try {
            const parsed = usdcContract.interface.parseLog(log);
            if (!parsed) continue;

            const from = parsed.args[0];
            const to = parsed.args[1];
            const amount = parsed.args[2];
            const block = await provider.getBlock(log.blockNumber);

            // 识别交易类型
            const type = from === '0x0000000000000000000000000000000000000000' 
              ? 'CIRCLE_MINT' 
              : to === '0x0000000000000000000000000000000000000000' 
              ? 'CIRCLE_BURN' 
              : 'OTHER';

            if (type === 'OTHER') continue;

            // 检查是否已存在
            const existing = await db.select().from(transactions).where(
              (t: any) => t.txHash === log.transactionHash
            ).limit(1);

            if (existing.length === 0) {
              await db.insert(transactions).values({
                txHash: log.transactionHash,
                chainId: 8453,
                chainName: 'Base',
                blockNumber: log.blockNumber,
                timestamp: new Date((block?.timestamp || 0) * 1000),
                fromAddress: from,
                toAddress: to,
                amount: (amount / BigInt(10 ** 6)).toString(),
                type: type as any,
                status: 'CONFIRMED',
              });
              insertedCount++;
              console.log(`   ✅ 插入: ${log.transactionHash.slice(0, 10)}... (${type})`);
            }
          } catch (error) {
            console.error(`   ❌ 处理交易失败:`, error instanceof Error ? error.message : 'Unknown error');
          }
        }

        console.log(`\n✅ 成功插入 ${insertedCount} 条交易到数据库`);

        // 查询数据库中的交易
        const dbTransactions = await db.select().from(transactions).limit(10);
        console.log(`\n📊 数据库中的交易 (最多显示 10 条):`);
        for (const tx of dbTransactions) {
          console.log(`   - ${tx.txHash.slice(0, 10)}... | ${tx.type} | ${tx.amount} USDC | ${tx.chainName}`);
        }
      }
    } else {
      console.log('⚠️  未找到任何交易数据');
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
  }
}

testBaseRecent();
