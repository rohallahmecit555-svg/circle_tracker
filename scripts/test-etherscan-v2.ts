import axios from 'axios';
import { getDb } from '../server/db';
import { transactions } from '../drizzle/schema';

async function testEtherscanV2() {
  console.log('🔍 使用 Etherscan V2 API 查询真实的 USDC 交易数据...\n');

  const apiKey = 'C7SWRR2JNJ8DMVSPXTD6H9EUV4G9P3MNS3';
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  try {
    // 测试 1: 获取账户余额（测试 API Key）
    console.log('测试 1: 验证 API Key...');
    const testResponse = await axios.get('https://api.etherscan.io/api/v2/accounts', {
      params: {
        address: '0x1234567890123456789012345678901234567890',
        apikey: apiKey,
      },
      timeout: 10000,
    });
    
    if (testResponse.status === 200) {
      console.log(`   ✅ API Key 有效\n`);
    }

    // 测试 2: 查询 USDC 的 Token Transfer 事件
    console.log('查询 USDC 的最近交易...');
    const txResponse = await axios.get('https://api.etherscan.io/api/v2/tokens', {
      params: {
        contractaddress: usdcAddress,
        page: 1,
        offset: 100,
        sort: 'desc',
        apikey: apiKey,
      },
      timeout: 10000,
    });

    if (txResponse.status === 200 && txResponse.data.result) {
      const txs = txResponse.data.result;
      console.log(`✅ 找到 ${txs.length} 条交易\n`);

      console.log('📋 最近的 20 条交易:');
      for (const tx of txs.slice(0, 20)) {
        const from = tx.from ? tx.from.slice(0, 10) : 'Unknown';
        const to = tx.to ? tx.to.slice(0, 10) : 'Unknown';
        const value = tx.value ? (BigInt(tx.value) / BigInt(10 ** 6)).toString() : '0';
        const timestamp = tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000).toISOString() : 'Unknown';
        const hash = tx.hash ? tx.hash.slice(0, 10) : 'Unknown';
        
        // 识别交易类型
        let type = 'TRANSFER';
        if (from === '0x0000000') type = 'CIRCLE_MINT';
        if (to === '0x0000000') type = 'CIRCLE_BURN';
        
        console.log(`   - ${hash}... | ${type} | ${value} USDC | ${timestamp}`);
      }

      // 尝试将数据插入数据库
      console.log('\n💾 尝试将交易数据插入数据库...');
      const db = await getDb();
      
      if (db) {
        let insertedCount = 0;

        for (const tx of txs.slice(0, 50)) {
          try {
            if (!tx.hash || !tx.from || !tx.to) continue;

            // 识别交易类型
            let type = 'TRANSFER';
            if (tx.from === '0x0000000000000000000000000000000000000000') type = 'CIRCLE_MINT';
            if (tx.to === '0x0000000000000000000000000000000000000000') type = 'CIRCLE_BURN';

            // 只插入 CIRCLE_MINT 和 CIRCLE_BURN
            if (type === 'TRANSFER') continue;

            // 检查是否已存在
            const existing = await db.select().from(transactions).where(
              (t: any) => t.txHash === tx.hash
            ).limit(1);

            if (existing.length === 0) {
              const value = tx.value ? (BigInt(tx.value) / BigInt(10 ** 6)).toString() : '0';
              const timestamp = tx.timeStamp ? new Date(parseInt(tx.timeStamp) * 1000) : new Date();

              await db.insert(transactions).values({
                txHash: tx.hash,
                chainId: 1,
                chainName: 'Ethereum',
                blockNumber: tx.blockNumber ? parseInt(tx.blockNumber) : 0,
                timestamp,
                fromAddress: tx.from,
                toAddress: tx.to,
                amount: value,
                type: type as any,
                status: 'CONFIRMED',
              });
              insertedCount++;
              console.log(`   ✅ 插入: ${tx.hash.slice(0, 10)}... (${type}) | ${value} USDC`);
            }
          } catch (error) {
            console.error(`   ❌ 处理交易失败:`, error instanceof Error ? error.message : 'Unknown error');
          }
        }

        console.log(`\n✅ 成功插入 ${insertedCount} 条交易到数据库`);

        // 查询数据库中的所有交易
        const dbTransactions = await db.select().from(transactions);
        console.log(`\n📊 数据库中的所有交易 (共 ${dbTransactions.length} 条):`);
        for (const tx of dbTransactions.slice(-20)) {
          const timestamp = new Date(tx.timestamp).toISOString();
          console.log(`   - ${tx.txHash.slice(0, 10)}... | ${tx.type} | ${tx.amount} USDC | ${tx.chainName} | ${timestamp}`);
        }
      }
    } else {
      console.log('❌ 无法查询交易');
    }

  } catch (error) {
    console.error('❌ 错误:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.response) {
      console.error('   响应:', (error.response as any).data);
    }
  }
}

testEtherscanV2();
