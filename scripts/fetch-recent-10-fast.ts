import { ethers } from 'ethers';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

async function fetchRecent10Fast() {
  console.log('🔍 从以太坊主网查询最近的 Circle Mint/Burn 交易...\n');

  try {
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/Noqzt16hckcVCOserEz-2';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('⏳ 连接到以太坊主网...');
    const latestBlock = await provider.getBlockNumber();
    console.log(`✅ 连接成功！当前区块: ${latestBlock}\n`);

    // 查询最近 500 个区块
    const BATCH_SIZE = 10;
    const TOTAL_BLOCKS = 500;
    const fromBlock = Math.max(0, latestBlock - TOTAL_BLOCKS);
    const toBlock = latestBlock;

    console.log(`⏳ 查询区块 ${fromBlock} 到 ${toBlock} 的 USDC Transfer 事件...`);

    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const transferSignature = ethers.id('Transfer(address,address,uint256)');

    const allLogs: any[] = [];
    let batchCount = 0;
    
    // 分批查询
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
        batchCount++;
        
        if (batchCount % 10 === 0) {
          console.log(`   已查询 ${batchCount} 批，找到 ${allLogs.length} 条事件`);
        }
      } catch (error) {
        // 忽略错误
      }
    }

    console.log(`✅ 总共找到 ${allLogs.length} 条 Transfer 事件\n`);

    // 解析并过滤 Circle Mint/Burn
    console.log('🔍 识别 Circle Mint/Burn 交易...');

    const usdcAbi = [
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ];
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    
    const circleTxs: Map<string, any> = new Map();
    const blockCache: Map<number, any> = new Map();

    let processedCount = 0;
    for (const log of allLogs) {
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
          
          const key = log.transactionHash;
          if (!circleTxs.has(key)) {
            circleTxs.set(key, {
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              timestamp: (block?.timestamp || 0) * 1000,
              from,
              to,
              amount: (amount / BigInt(10 ** 6)).toString(),
              type,
            });
          }
        }

        processedCount++;
        if (processedCount % 5000 === 0) {
          console.log(`   已处理 ${processedCount} 条事件，找到 ${circleTxs.size} 条 Circle 交易`);
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    // 转换为数组并按时间排序
    const circleLogs = Array.from(circleTxs.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    console.log(`✅ 找到 ${circleLogs.length} 条唯一的 Circle Mint/Burn 交易\n`);

    // 取最近的 10 条
    const recentCircleLogs = circleLogs.slice(0, 10);

    console.log(`📋 最近的 ${recentCircleLogs.length} 条 Circle Mint/Burn 交易:\n`);
    for (let i = 0; i < recentCircleLogs.length; i++) {
      const tx = recentCircleLogs[i];
      const timestamp = new Date(tx.timestamp).toISOString();
      console.log(`${i + 1}. ${tx.txHash}`);
      console.log(`   类型: ${tx.type}`);
      console.log(`   金额: ${tx.amount} USDC`);
      console.log(`   区块: ${tx.blockNumber}`);
      console.log(`   时间: ${timestamp}\n`);
    }

    // 将数据插入数据库
    console.log('💾 将数据插入数据库...\n');
    const db = await getDb();
    
    if (db) {
      let insertedCount = 0;

      for (const tx of recentCircleLogs) {
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
          console.log(`✅ 已插入: ${tx.txHash.slice(0, 10)}... (${tx.type}) | ${tx.amount} USDC`);
        } catch (error) {
          console.error(`❌ 插入失败:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      console.log(`\n✅ 成功插入 ${insertedCount} 条交易到数据库`);

      // 查询数据库中的所有交易
      const dbTransactions = await db.select().from(transactions);
      console.log(`\n📊 数据库中的所有交易 (共 ${dbTransactions.length} 条):\n`);
      for (const tx of dbTransactions) {
        const timestamp = new Date(tx.timestamp).toISOString();
        console.log(`- ${tx.txHash.slice(0, 10)}... | ${tx.type} | ${tx.amount} USDC | ${timestamp}`);
      }
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
  }
}

fetchRecent10Fast();
