import { ethers } from 'ethers';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

async function testAlchemyOptimized() {
  console.log('🔍 使用 Alchemy RPC 查询最近的 USDC 交易...\n');

  try {
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/Noqzt16hckcVCOserEz-2';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('⏳ 连接到以太坊主网...');
    const latestBlock = await provider.getBlockNumber();
    const network = await provider.getNetwork();
    console.log(`✅ 连接成功！`);
    console.log(`   网络: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`   当前区块: ${latestBlock}\n`);

    // Alchemy 免费层限制：最多查询 10 个区块
    // 我们分批查询最近 100 个区块（分 10 批）
    const BATCH_SIZE = 10;
    const TOTAL_BLOCKS = 100;
    const fromBlock = Math.max(0, latestBlock - TOTAL_BLOCKS);
    const toBlock = latestBlock;

    console.log(`⏳ 查询区块 ${fromBlock} 到 ${toBlock} 的 USDC Transfer 事件...`);
    console.log(`   (分 ${Math.ceil(TOTAL_BLOCKS / BATCH_SIZE)} 批查询，每批 ${BATCH_SIZE} 个区块)\n`);

    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const transferSignature = ethers.id('Transfer(address,address,uint256)');

    const allLogs: any[] = [];
    
    // 分批查询
    for (let i = fromBlock; i <= toBlock; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE - 1, toBlock);
      console.log(`   查询区块 ${i} 到 ${batchEnd}...`);
      
      try {
        const logs = await provider.getLogs({
          address: usdcAddress,
          topics: [transferSignature],
          fromBlock: i,
          toBlock: batchEnd,
        });
        allLogs.push(...logs);
        console.log(`   ✅ 找到 ${logs.length} 条事件`);
      } catch (error) {
        console.log(`   ⚠️  查询失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`\n✅ 总共找到 ${allLogs.length} 条 Transfer 事件\n`);

    if (allLogs.length > 0) {
      console.log('📋 最近的 20 条交易:');
      const recentLogs = allLogs.slice(-20);
      
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
        let mintCount = 0;
        let burnCount = 0;

        for (const log of allLogs) {
          try {
            const parsed = usdcContract.interface.parseLog(log);
            if (!parsed) continue;

            const from = parsed.args[0];
            const to = parsed.args[1];
            const amount = parsed.args[2];
            const block = await provider.getBlock(log.blockNumber);

            // 识别交易类型
            let type = 'TRANSFER';
            if (from === '0x0000000000000000000000000000000000000000') {
              type = 'CIRCLE_MINT';
              mintCount++;
            } else if (to === '0x0000000000000000000000000000000000000000') {
              type = 'CIRCLE_BURN';
              burnCount++;
            }

            // 只插入 CIRCLE_MINT 和 CIRCLE_BURN
            if (type === 'TRANSFER') continue;

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
              console.log(`   ✅ 插入: ${log.transactionHash.slice(0, 10)}... (${type}) | ${(amount / BigInt(10 ** 6)).toString()} USDC`);
            }
          } catch (error) {
            // 忽略解析错误，继续处理下一条
          }
        }

        console.log(`\n📊 统计:`);
        console.log(`   - Circle Mint: ${mintCount} 条`);
        console.log(`   - Circle Burn: ${burnCount} 条`);
        console.log(`   - 普通转账: ${allLogs.length - mintCount - burnCount} 条`);
        console.log(`   - 新插入数据库: ${insertedCount} 条`);

        // 查询数据库中的所有交易
        const dbTransactions = await db.select().from(transactions);
        console.log(`\n💾 数据库中的所有交易 (共 ${dbTransactions.length} 条):`);
        for (const tx of dbTransactions.slice(-20)) {
          const timestamp = new Date(tx.timestamp).toISOString();
          console.log(`   - ${tx.txHash.slice(0, 10)}... | ${tx.type} | ${tx.amount} USDC | ${tx.chainName} | ${timestamp}`);
        }
      }
    } else {
      console.log('⚠️  未找到任何交易数据');
      console.log('   这可能是因为:');
      console.log('   1. 最近 100 个区块内没有 USDC Transfer 事件');
      console.log('   2. RPC 端点有其他限制');
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      console.error('   详细信息:', error.stack);
    }
  }
}

testAlchemyOptimized();
