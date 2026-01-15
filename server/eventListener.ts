import { ethers } from 'ethers';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { transactions } from '../drizzle/schema';

/**
 * 支持的链配置
 */
export const SUPPORTED_CHAINS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    cctp: '0xBd3fa81B58ba92a82136038B25aDec7066e1C915',
  },
  base: {
    id: 8453,
    name: 'Base',
    rpcUrl: 'https://base.llamarpc.com',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    cctp: '0x0c7E7eAb261d49dfaD82791F7995Cd4d7e32ec59',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    rpcUrl: 'https://arbitrum.llamarpc.com',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    cctp: '0x19330d10B9afbAF0D5C3B6d84e17675d1b1dC0a7',
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon.llamarpc.com',
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    cctp: '0x9baF7a1cB1d1e0be1A86f8b02c6e23107cAC6ccf',
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    rpcUrl: 'https://optimism.llamarpc.com',
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    cctp: '0x2703483B1a5a00Aa051D4a3FB146f3B6A5F8953d',
  },
  avalanche: {
    id: 43114,
    name: 'Avalanche',
    rpcUrl: 'https://avalanche.llamarpc.com',
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    cctp: '0x09Fb06A271faFf70A651047395AaEb6265265F13',
  },
} as const;

/**
 * USDC Transfer 事件签名
 */
const TRANSFER_EVENT_SIGNATURE = ethers.id('Transfer(address,address,uint256)');

/**
 * CCTP MessageSent 事件签名
 */
const MESSAGE_SENT_SIGNATURE = ethers.id('MessageSent(bytes)');

/**
 * CCTP DepositForBurn 事件签名
 */
const DEPOSIT_FOR_BURN_SIGNATURE = ethers.id('DepositForBurn(uint64,address,uint256,address,bytes32,uint32,address)');

/**
 * 获取链的提供者
 */
export function getProvider(chainId: number) {
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  return new ethers.JsonRpcProvider(chain.rpcUrl);
}

/**
 * 获取 USDC 合约实例
 */
export function getUSDCContract(chainId: number) {
  const provider = getProvider(chainId);
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  
  const abi = [
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'function decimals() public view returns (uint8)',
  ];
  
  return new ethers.Contract(chain.usdc, abi, provider);
}

/**
 * 获取 CCTP 合约实例
 */
export function getCCTPContract(chainId: number) {
  const provider = getProvider(chainId);
  const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
  
  const abi = [
    'event MessageSent(bytes message)',
    'event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, address destinationTokenMessenger)',
  ];
  
  return new ethers.Contract(chain.cctp, abi, provider);
}

/**
 * 识别交易类型
 */
export function identifyTransactionType(
  fromAddress: string,
  toAddress: string,
  isCircleMinter: boolean,
  isCCTPContract: boolean
): string {
  if (isCircleMinter && toAddress !== '0x0000000000000000000000000000000000000000') {
    return 'CIRCLE_MINT';
  }
  if (toAddress === '0x0000000000000000000000000000000000000000' && isCircleMinter) {
    return 'CIRCLE_BURN';
  }
  if (isCCTPContract) {
    if (toAddress === '0x0000000000000000000000000000000000000000') {
      return 'CCTP_BURN';
    }
    return 'CCTP_MINT';
  }
  return 'OTHER';
}

/**
 * 查询历史 Transfer 事件
 */
export async function queryHistoricalTransfers(
  chainId: number,
  fromBlock: number = 0,
  toBlock: number | string = 'latest'
) {
  try {
    const provider = getProvider(chainId);
    const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
    if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

    const contract = getUSDCContract(chainId);
    
    // 查询 Transfer 事件
    const filter = contract.filters.Transfer();
    const logs = await provider.getLogs({
      address: chain.usdc,
      topics: [TRANSFER_EVENT_SIGNATURE],
      fromBlock,
      toBlock: toBlock === 'latest' ? await provider.getBlockNumber() : toBlock,
    });

    const db = await getDb();
    if (!db) return [];

    const transactions_list = [];

    for (const log of logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (!parsed) continue;

        const from = parsed.args[0];
        const to = parsed.args[1];
        const amount = parsed.args[2];

        // 获取交易详情
        const tx = await provider.getTransaction(log.transactionHash);
        if (!tx) continue;

        const block = await provider.getBlock(log.blockNumber);
        if (!block) continue;

        // 识别交易类型
        const isCircleMinter = from === chain.usdc || from === '0x0000000000000000000000000000000000000000';
        const type = from === '0x0000000000000000000000000000000000000000' 
          ? 'CIRCLE_MINT' 
          : to === '0x0000000000000000000000000000000000000000' 
          ? 'CIRCLE_BURN' 
          : 'OTHER';

        if (type === 'OTHER') continue;

        // 检查是否已存在
        const existing = await db.select().from(transactions).where(
          eq(transactions.txHash, log.transactionHash)
        ).limit(1);

        if (existing.length > 0) continue;

        // 插入交易
        await db.insert(transactions).values({
          txHash: log.transactionHash,
          chainId,
          chainName: chain.name,
          blockNumber: log.blockNumber,
          timestamp: new Date(block.timestamp * 1000),
          fromAddress: from,
          toAddress: to,
          amount: (amount / BigInt(10 ** 6)).toString(), // USDC 有 6 位小数
          type: type as any,
          status: 'CONFIRMED',
        });

        transactions_list.push({
          txHash: log.transactionHash,
          chainId,
          type,
          amount: (amount / BigInt(10 ** 6)).toString(),
        });
      } catch (error) {
        console.error(`Error processing log ${log.transactionHash}:`, error);
      }
    }

    return transactions_list;
  } catch (error) {
    console.error(`Error querying historical transfers for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * 监听实时 Transfer 事件
 */
export async function listenToTransfers(chainId: number) {
  try {
    const provider = getProvider(chainId);
    const chain = Object.values(SUPPORTED_CHAINS).find(c => c.id === chainId);
    if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

    const contract = getUSDCContract(chainId);
    const db = await getDb();

    contract.on('Transfer', async (from, to, amount, event) => {
      try {
        if (!db) return;

        const block = await provider.getBlock(event.blockNumber);
        if (!block) return;

        // 识别交易类型
        const type = from === '0x0000000000000000000000000000000000000000' 
          ? 'CIRCLE_MINT' 
          : to === '0x0000000000000000000000000000000000000000' 
          ? 'CIRCLE_BURN' 
          : 'OTHER';

        if (type === 'OTHER') return;

        // 检查是否已存在
        const existing = await db.select().from(transactions).where(
          eq(transactions.txHash, event.transactionHash)
        ).limit(1);

        if (existing.length > 0) return;

        // 插入交易
        await db.insert(transactions).values({
          txHash: event.transactionHash,
          chainId,
          chainName: chain.name,
          blockNumber: event.blockNumber,
          timestamp: new Date(block.timestamp * 1000),
          fromAddress: from,
          toAddress: to,
          amount: (amount / BigInt(10 ** 6)).toString(),
          type: type as any,
          status: 'CONFIRMED',
        });

        console.log(`[${chain.name}] Captured ${type} transaction: ${event.transactionHash}`);
      } catch (error) {
        console.error(`Error processing real-time event:`, error);
      }
    });

    console.log(`Listening to USDC transfers on ${chain.name}...`);
  } catch (error) {
    console.error(`Error setting up listener for chain ${chainId}:`, error);
  }
}
