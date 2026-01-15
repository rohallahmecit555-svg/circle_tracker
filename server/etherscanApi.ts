import axios from 'axios';

/**
 * Etherscan API 配置
 */
export const ETHERSCAN_CONFIGS = {
  ethereum: {
    apiUrl: 'https://api.etherscan.io/api',
    apiKey: 'C7SWRR2JNJ8DMVSPXTD6H9EUV4G9P3MNS3',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  polygon: {
    apiUrl: 'https://api.polygonscan.com/api',
    apiKey: process.env.POLYGONSCAN_API_KEY || 'YourApiKeyToken',
    usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  arbitrum: {
    apiUrl: 'https://api.arbiscan.io/api',
    apiKey: process.env.ARBISCAN_API_KEY || 'YourApiKeyToken',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  optimism: {
    apiUrl: 'https://api-optimistic.etherscan.io/api',
    apiKey: process.env.OPTIMISM_ETHERSCAN_API_KEY || 'YourApiKeyToken',
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  base: {
    apiUrl: 'https://api.basescan.org/api',
    apiKey: process.env.BASESCAN_API_KEY || 'YourApiKeyToken',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
} as const;

/**
 * 从 Etherscan API 查询 USDC Transfer 事件
 */
export async function queryTransfersFromEtherscan(
  chain: keyof typeof ETHERSCAN_CONFIGS,
  startBlock: number = 0,
  endBlock: number | 'latest' = 'latest'
) {
  try {
    const config = ETHERSCAN_CONFIGS[chain];
    
    console.log(`[${chain}] 从 Etherscan 查询 USDC Transfer 事件...`);
    console.log(`   API: ${config.apiUrl}`);
    console.log(`   USDC: ${config.usdcAddress}`);

    const response = await axios.get(config.apiUrl, {
      params: {
        module: 'logs',
        action: 'getLogs',
        address: config.usdcAddress,
        topic0: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',  // Transfer 事件签名
        fromBlock: startBlock,
        toBlock: endBlock,
        apikey: config.apiKey,
        page: 1,
        offset: 10000,  // 最多返回 10000 条
      },
      timeout: 30000,
    });

    if (response.data.status === '0') {
      console.log(`   ⚠️  未找到交易数据或 API Key 无效`);
      console.log(`   消息: ${response.data.message}`);
      return [];
    }

    if (response.data.status === '1') {
      const logs = response.data.result;
      console.log(`   ✅ 找到 ${logs.length} 条交易`);
      return logs;
    }

    return [];
  } catch (error) {
    console.error(`[${chain}] Etherscan API 查询失败:`, error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * 解析 Etherscan 返回的日志数据
 */
export function parseEtherscanLog(log: any) {
  try {
    // Etherscan 返回的日志格式
    const topics = log.topics || [];
    
    // Topic 0: Transfer 事件签名
    // Topic 1: from 地址
    // Topic 2: to 地址
    // data: 转账金额
    
    const from = topics[1] ? '0x' + topics[1].slice(-40) : '0x0000000000000000000000000000000000000000';
    const to = topics[2] ? '0x' + topics[2].slice(-40) : '0x0000000000000000000000000000000000000000';
    const amount = log.data ? BigInt(log.data) : BigInt(0);

    // 识别交易类型
    const type = from === '0x0000000000000000000000000000000000000000' 
      ? 'CIRCLE_MINT' 
      : to === '0x0000000000000000000000000000000000000000' 
      ? 'CIRCLE_BURN' 
      : 'TRANSFER';

    return {
      txHash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
      blockHash: log.blockHash,
      timestamp: parseInt(log.timeStamp, 16),
      from,
      to,
      amount: (amount / BigInt(10 ** 6)).toString(),  // USDC 有 6 位小数
      type,
      gasUsed: log.gasUsed,
      gasPrice: log.gasPrice,
    };
  } catch (error) {
    console.error('解析日志失败:', error);
    return null;
  }
}

/**
 * 查询最近 N 天的交易
 */
export async function queryRecentTransfers(
  chain: keyof typeof ETHERSCAN_CONFIGS,
  daysBack: number = 7
) {
  try {
    // 计算时间戳范围
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (daysBack * 24 * 60 * 60);

    console.log(`\n[${chain}] 查询最近 ${daysBack} 天的交易...`);
    console.log(`   时间范围: ${new Date(startTime * 1000).toISOString()} 到 ${new Date(now * 1000).toISOString()}`);

    const logs = await queryTransfersFromEtherscan(chain, 0, 'latest');
    
    // 过滤时间范围内的交易
    const recentLogs = logs.filter((log: any) => {
      const timestamp = parseInt(log.timeStamp, 16);
      return timestamp >= startTime;
    });

    console.log(`   ✅ 找到 ${recentLogs.length} 条交易`);
    return recentLogs;
  } catch (error) {
    console.error(`[${chain}] 查询失败:`, error);
    return [];
  }
}
