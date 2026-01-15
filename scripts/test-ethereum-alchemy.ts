import { ethers } from 'ethers';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

async function testEthereumAlchemy() {
  console.log('🔍 使用 Alchemy RPC 从以太坊主网查询 USDC 交易数据...\n');

  try {
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/Noqzt16hckcVCOserEz-2';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('⏳ 连接到以太坊主网...');
    const latestBlock = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    console.log(`✅ 连接成功！`);
    console.log(`   网络: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`   当前区块: ${latestBlock}\n`);

    // 只查询最近 5000 个区块
    const fromBlock = Math.max(0, latestBlock - 5000);
    const toBlock = latestBlock;

    console.log(`⏳ 查询区块 ${fromBlock} 到 ${toBlock} 的 USDC Transfer 事件...`);
    console.log(`   (范围: ${toBlock - fromBlock} 个区块)\n`);

    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
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
                chainId: 1,
                chainName: 'Ethereum',
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

        // 查询数据库中的所有交易
        const dbTransactions = await db.select().from(transactions);
        console.log(`\n📊 数据库中的所有交易 (共 ${dbTransactions.length} 条):`);
        for (const tx of dbTransactions.slice(-10)) {
          console.log(`   - ${tx.txHash.slice(0, 10)}... | ${tx.type} | ${tx.amount} USDC | ${tx.chainName}`);
        }
      }
    } else {
      console.log('⚠️  未找到任何交易数据');
      console.log('   这可能是因为:');
      console.log('   1. 最近 5000 个区块内没有 USDC 交易');
      console.log('   2. RPC 端点有限制');
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      console.error('   详细信息:', error.stack);
    }
  }
}

testEthereumAlchemy();
