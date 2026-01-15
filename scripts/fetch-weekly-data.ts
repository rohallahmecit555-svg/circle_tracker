import { ethers } from 'ethers';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

// Circle TokenMessenger 地址（用于 CCTP）
// 以太坊上的 CCTP TokenMessenger
const TOKEN_MESSENGER_ADDRESS = '0xbd3fa81b58ba92a82136038b25adec7066af3155';
// 或者也可以是 MessageTransmitter
const MESSAGE_TRANSMITTER_ADDRESS = '0x0a992d191deec32afe36203ad87d7d289a738f81';

// CCTP MessageSent 事件签名
const MESSAGE_SENT_SIGNATURE = ethers.id('MessageSent(bytes)');

async function fetchWeeklyData() {
  console.log('🔍 从以太坊主网查询最近 2 天的 Circle 交易...\n');

  try {
    const rpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/Noqzt16hckcVCOserEz-2';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('⏳ 连接到以太坊主网...');
    const latestBlock = await provider.getBlockNumber();
    console.log(`✅ 连接成功！当前区块: ${latestBlock}\n`);

    // 计算最近 2 天的区块数（以太坊约 12 秒一个区块，2 天 = 2 * 24 * 3600 / 12 = 14400 个区块）
    const BLOCKS_PER_2_DAYS = 14400;
    const fromBlock = Math.max(0, latestBlock - BLOCKS_PER_2_DAYS);
    const toBlock = latestBlock;

    console.log(`⏳ 查询最近 2 天的交易 (区块 ${fromBlock} 到 ${toBlock})...`);
    console.log(`   (约 ${BLOCKS_PER_2_DAYS} 个区块)\n`);

    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const transferSignature = ethers.id('Transfer(address,address,uint256)');

    // 1. 查询 USDC Transfer 事件
    console.log('📊 第一步：查询 USDC Transfer 事件...');
    const BATCH_SIZE = 10;
    const allUsdcLogs: any[] = [];
    let batchCount = 0;
    
    for (let i = fromBlock; i <= toBlock; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE - 1, toBlock);
      
      try {
        const logs = await provider.getLogs({
          address: usdcAddress,
          topics: [transferSignature],
          fromBlock: i,
          toBlock: batchEnd,
        });
        allUsdcLogs.push(...logs);
        batchCount++;
        
        if (batchCount % 100 === 0) {
          console.log(`   已查询 ${batchCount} 批，找到 ${allUsdcLogs.length} 条 Transfer 事件`);
        }
      } catch (error) {
        // 忽略错误
      }
    }

    console.log(`✅ 找到 ${allUsdcLogs.length} 条 USDC Transfer 事件\n`);

    // 2. 查询 CCTP MessageSent 事件
    console.log('📊 第二步：查询 CCTP MessageSent 事件...');
    const allCctpLogs: any[] = [];
    batchCount = 0;
    
    for (let i = fromBlock; i <= toBlock; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE - 1, toBlock);
      
      try {
        const logs = await provider.getLogs({
          address: TOKEN_MESSENGER_ADDRESS,
          topics: [MESSAGE_SENT_SIGNATURE],
          fromBlock: i,
          toBlock: batchEnd,
        });
        allCctpLogs.push(...logs);
        batchCount++;
        
        if (batchCount % 100 === 0) {
          console.log(`   已查询 ${batchCount} 批，找到 ${allCctpLogs.length} 条 MessageSent 事件`);
        }
      } catch (error) {
        // 忽略错误
      }
    }

    console.log(`✅ 找到 ${allCctpLogs.length} 条 CCTP MessageSent 事件\n`);

    // 3. 解析并分类交易
    console.log('🔍 识别 Circle Mint/Burn 和 CCTP 交易...\n');

    const usdcAbi = [
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ];
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    
    const circleTxs: Map<string, any> = new Map();
    const blockCache: Map<number, any> = new Map();

    // 处理 USDC Transfer 事件
    let processedCount = 0;
    for (const log of allUsdcLogs) {
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
        if (processedCount % 10000 === 0) {
          console.log(`   已处理 ${processedCount} 条 USDC 事件，找到 ${circleTxs.size} 条 Circle 交易`);
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    // 处理 CCTP MessageSent 事件
    console.log(`\n   处理 ${allCctpLogs.length} 条 CCTP 事件...`);
    for (const log of allCctpLogs) {
      try {
        let block = blockCache.get(log.blockNumber);
        if (!block) {
          block = await provider.getBlock(log.blockNumber);
          blockCache.set(log.blockNumber, block);
        }

        // 获取交易信息以提取金额
        const tx = await provider.getTransaction(log.transactionHash);
        if (!tx) continue;

        // 尝试从交易输入数据中解析金额（这是一个简化的方法）
        // 实际上需要解析 TokenMessenger 的函数调用
        const key = log.transactionHash;
        if (!circleTxs.has(key)) {
          circleTxs.set(key, {
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: (block?.timestamp || 0) * 1000,
            from: tx.from,
            to: tx.to,
            amount: '0', // CCTP 事件中的金额需要从其他地方提取
            type: 'CCTP_BURN', // MessageSent 表示跨链销毁
          });
        }
      } catch (error) {
        // 忽略错误
      }
    }

    // 转换为数组并按时间排序
    const allCircleLogs = Array.from(circleTxs.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    console.log(`\n✅ 总共找到 ${allCircleLogs.length} 条 Circle 交易\n`);

    // 统计数据
    const stats = {
      totalMint: 0,
      totalBurn: 0,
      totalCCTP: 0,
      mintCount: 0,
      burnCount: 0,
      cctpCount: 0,
    };

    for (const tx of allCircleLogs) {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'CIRCLE_MINT') {
        stats.totalMint += amount;
        stats.mintCount++;
      } else if (tx.type === 'CIRCLE_BURN') {
        stats.totalBurn += amount;
        stats.burnCount++;
      } else if (tx.type.includes('CCTP')) {
        stats.totalCCTP += amount;
        stats.cctpCount++;
      }
    }

    console.log('📊 统计数据：');
    console.log(`   Circle Mint: ${stats.mintCount} 笔，总金额 ${stats.totalMint.toLocaleString()} USDC`);
    console.log(`   Circle Burn: ${stats.burnCount} 笔，总金额 ${stats.totalBurn.toLocaleString()} USDC`);
    console.log(`   CCTP 交易: ${stats.cctpCount} 笔\n`);

    // 将数据插入数据库
    console.log('💾 将数据插入数据库...\n');
    const db = await getDb();
    
    if (db) {
      let insertedCount = 0;
      let skippedCount = 0;

      for (const tx of allCircleLogs) {
        try {
          // 检查是否已存在
          const existing = await db.select().from(transactions).where(
            (t: any) => t.txHash === tx.txHash
          ).limit(1);

          if (existing.length === 0) {
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
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`❌ 插入失败:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      console.log(`✅ 成功插入 ${insertedCount} 条新交易，跳过 ${skippedCount} 条已存在的交易`);

      // 查询数据库中的所有交易
      const dbTransactions = await db.select().from(transactions);
      console.log(`\n📊 数据库中的所有交易 (共 ${dbTransactions.length} 条):`);
      
      // 按类型分组统计
      const typeStats: Record<string, number> = {};
      for (const tx of dbTransactions) {
        typeStats[tx.type] = (typeStats[tx.type] || 0) + 1;
      }
      
      console.log('\n   按类型分布：');
      for (const [type, count] of Object.entries(typeStats)) {
        console.log(`   - ${type}: ${count} 笔`);
      }
    }
  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
  }
}

fetchWeeklyData();
