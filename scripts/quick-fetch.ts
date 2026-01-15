import { ethers } from 'ethers';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

async function quickFetch() {
  console.log('🔍 快速查询最近 100 个区块的 Circle 交易...\n');

  try {
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/Noqzt16hckcVCOserEz-2';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('⏳ 连接到以太坊主网...');
    const latestBlock = await provider.getBlockNumber();
    console.log(`✅ 连接成功！当前区块: ${latestBlock}\n`);

    // 只查询最近 100 个区块
    const fromBlock = latestBlock - 100;
    const toBlock = latestBlock;

    console.log(`⏳ 查询最近 100 个区块 (${fromBlock} 到 ${toBlock})...`);
    console.log(`   (Alchemy 限制每次查询最多 10 个区块)\n`);

    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const transferSignature = ethers.id('Transfer(address,address,uint256)');

    // 查询 USDC Transfer 事件（每次 10 个区块）
    console.log('📊 查询 USDC Transfer 事件...');
    const allLogs: any[] = [];
    const BATCH_SIZE = 10;
    
    for (let i = fromBlock; i <= toBlock; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE - 1, toBlock);
      
      try {
        const logs = await provider.getLogs({
          address: usdcAddress,
          topics: [transferSignature],
          fromBlock: i,
          toBlock: batchEnd,
        });
        allLogs.push(...logs);
      } catch (error) {
        console.error(`   ⚠️ 查询失败:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    const logs = allLogs;
    console.log(`✅ 总共找到 ${logs.length} 条 USDC Transfer 事件\n`);

    // 解析并分类交易
    console.log('🔍 识别 Circle Mint/Burn 交易...\n');

    const usdcAbi = [
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ];
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    
    const circleTxs: any[] = [];
    const blockCache: Map<number, any> = new Map();

    // 处理 Transfer 事件
    for (const log of logs) {
      try {
        const parsed = usdcContract.interface.parseLog(log);
        if (!parsed) continue;

        const from = parsed.args[0];
        const to = parsed.args[1];
        const amount = parsed.args[2];

        // 识别交易类型
        let type = 'TRANSFER';
        if (from === '0x0000000000000000000000000000000000000000') {
          type = 'CIRCLE_MINT';
        } else if (to === '0x0000000000000000000000000000000000000000') {
          type = 'CIRCLE_BURN';
        }

        // 只保留 CIRCLE_MINT 和 CIRCLE_BURN
        if (type !== 'TRANSFER') {
          // 使用缓存避免重复查询区块
          let block = blockCache.get(log.blockNumber);
          if (!block) {
            block = await provider.getBlock(log.blockNumber);
            blockCache.set(log.blockNumber, block);
          }
          
          circleTxs.push({
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: (block?.timestamp || 0) * 1000,
            from,
            to,
            amount: (amount / BigInt(10 ** 6)).toString(),
            type,
          });
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    console.log(`✅ 找到 ${circleTxs.length} 条 Circle Mint/Burn 交易\n`);

    // 统计数据
    let totalMint = 0;
    let totalBurn = 0;
    let mintCount = 0;
    let burnCount = 0;

    for (const tx of circleTxs) {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'CIRCLE_MINT') {
        totalMint += amount;
        mintCount++;
      } else if (tx.type === 'CIRCLE_BURN') {
        totalBurn += amount;
        burnCount++;
      }
    }

    console.log('📊 统计数据：');
    console.log(`   Circle Mint: ${mintCount} 笔，总金额 ${totalMint.toLocaleString()} USDC`);
    console.log(`   Circle Burn: ${burnCount} 笔，总金额 ${totalBurn.toLocaleString()} USDC\n`);

    // 将数据插入数据库
    console.log('💾 将数据插入数据库...\n');
    const db = await getDb();
    
    if (db) {
      let insertedCount = 0;
      let errorCount = 0;

      for (const tx of circleTxs) {
        try {
          await db.insert(transactions).values({
            txHash: tx.txHash,
            chainId: 1,
            chainName: 'Ethereum',
            blockNumber: tx.blockNumber,
            timestamp: new Date(tx.timestamp),
            fromAddress: tx.from,
            toAddress: tx.to,
            amount: tx.amount,
            type: tx.type as any,
            status: 'CONFIRMED',
          });
          insertedCount++;
          if (insertedCount % 10 === 0) {
            console.log(`   ✅ 已插入 ${insertedCount} 条交易...`);
          }
        } catch (error: any) {
          // 忽略重复键错误
          if (error.code !== 'ER_DUP_ENTRY') {
            errorCount++;
            console.error(`❌ 插入失败:`, error instanceof Error ? error.message : 'Unknown error');
          }
        }
      }

      console.log(`\n✅ 成功插入 ${insertedCount} 条交易`);
      if (errorCount > 0) {
        console.log(`❌ 失败 ${errorCount} 条交易`);
      }

      // 查询数据库中的所有交易
      const dbTransactions = await db.select().from(transactions);
      console.log(`\n📊 数据库中的所有交易 (共 ${dbTransactions.length} 条):`);
      
      // 按类型分组统计
      const typeStats: Record<string, number> = {};
      let dbTotalAmount = 0;
      for (const tx of dbTransactions) {
        typeStats[tx.type] = (typeStats[tx.type] || 0) + 1;
        dbTotalAmount += parseFloat(tx.amount || '0');
      }
      
      console.log('\n   按类型分布：');
      for (const [type, count] of Object.entries(typeStats)) {
        console.log(`   - ${type}: ${count} 笔`);
      }
      
      console.log(`\n   总金额: ${dbTotalAmount.toLocaleString()} USDC`);
      console.log('\n✅ 数据已成功保存到数据库！刷新仪表板即可查看。');
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
  }
}

quickFetch();
