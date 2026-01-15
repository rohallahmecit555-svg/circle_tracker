import { drizzle } from "drizzle-orm/mysql2";
import { transactions } from "../drizzle/schema";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function seedTransactions() {
  try {
    // Parse connection string
    const url = new URL(DATABASE_URL);
    const connection = await mysql.createConnection({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      port: url.port ? parseInt(url.port) : 3306,
      ssl: {},
    });

    const db = drizzle(connection);

    // Sample transaction data
    const sampleTransactions = [
      // Circle Mint transactions (法币兑换)
      {
        txHash: "0x92964bf839cfeb26d61b0270eb10d11461974f1f47d127b81b8f6ab14c550ddc",
        chainId: 1,
        chainName: "Ethereum",
        type: "CIRCLE_MINT",
        amount: "500000",
        fromAddress: "0xE7ed1fa7f45D05C308232b7d0BFF3E0E5f81985c",
        toAddress: "0x1234567890123456789012345678901234567890",
        timestamp: new Date("2026-01-10T10:30:00Z"),
        status: "CONFIRMED",
        blockNumber: 19500000,
      },
      {
        txHash: "0x8f7f452d851283ad11bbb8399e6e28636bb4787a230abf738025269f291aa4bf",
        chainId: 8453,
        chainName: "Base",
        type: "CIRCLE_MINT",
        amount: "1000000",
        fromAddress: "0x1234567890123456789012345678901234567890",
        toAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        timestamp: new Date("2026-01-11T14:20:00Z"),
        status: "CONFIRMED",
        blockNumber: 15200000,
      },
      // CCTP transactions (跨链结算)
      {
        txHash: "0xf0fa51c0292373668a499264e3eacfc22680d78d401cf22ed1669573ddcb98a7",
        chainId: 1,
        chainName: "Ethereum",
        type: "CCTP_MINT",
        amount: "7654862",
        fromAddress: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
        toAddress: "0x2222222222222222222222222222222222222222",
        timestamp: new Date("2026-01-12T08:15:00Z"),
        status: "CONFIRMED",
        blockNumber: 19510000,
      },
      {
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        chainId: 8453,
        chainName: "Base",
        type: "CCTP_BURN",
        amount: "2500000",
        fromAddress: "0x3333333333333333333333333333333333333333",
        toAddress: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
        timestamp: new Date("2026-01-13T16:45:00Z"),
        status: "CONFIRMED",
        blockNumber: 15210000,
      },
      // Circle Burn transactions (法币赎回)
      {
        txHash: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        chainId: 1,
        chainName: "Ethereum",
        type: "CIRCLE_BURN",
        amount: "300000",
        fromAddress: "0x4444444444444444444444444444444444444444",
        toAddress: "0xE7ed1fa7f45D05C308232b7d0BFF3E0E5f81985c",
        timestamp: new Date("2026-01-14T09:00:00Z"),
        status: "CONFIRMED",
        blockNumber: 19520000,
      },
      // More CCTP transactions
      {
        txHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
        chainId: 42161,
        chainName: "Arbitrum",
        type: "CCTP_MINT",
        amount: "1500000",
        fromAddress: "0xC30362313FBBA5cf280f2D7A855D289a8711B820",
        toAddress: "0x6666666666666666666666666666666666666666",
        timestamp: new Date("2026-01-09T12:30:00Z"),
        status: "CONFIRMED",
        blockNumber: 220000000,
      },
      {
        txHash: "0x7777777777777777777777777777777777777777777777777777777777777777",
        chainId: 137,
        chainName: "Polygon",
        type: "CCTP_BURN",
        amount: "800000",
        fromAddress: "0x8888888888888888888888888888888888888888",
        toAddress: "0x9f3B8679c73C2Fef8b59f54c9A711e3812ee217D",
        timestamp: new Date("2026-01-08T11:20:00Z"),
        status: "CONFIRMED",
        blockNumber: 54000000,
      },
      {
        txHash: "0x9999999999999999999999999999999999999999999999999999999999999999",
        chainId: 10,
        chainName: "Optimism",
        type: "CIRCLE_MINT",
        amount: "2000000",
        fromAddress: "0xE7ed1fa7f45D05C308232b7d0BFF3E0E5f81985c",
        toAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        timestamp: new Date("2026-01-07T15:10:00Z"),
        status: "CONFIRMED",
        blockNumber: 125000000,
      },
      {
        txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        chainId: 43114,
        chainName: "Avalanche",
        type: "CCTP_MINT",
        amount: "3500000",
        fromAddress: "0x6F475642a6e85809B1c36Fa62763669b1b98c237",
        toAddress: "0xcccccccccccccccccccccccccccccccccccccccc",
        timestamp: new Date("2026-01-06T13:45:00Z"),
        status: "CONFIRMED",
        blockNumber: 38000000,
      },
      {
        txHash: "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        chainId: 1,
        chainName: "Ethereum",
        type: "CCTP_BURN",
        amount: "1200000",
        fromAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        toAddress: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
        timestamp: new Date("2026-01-05T10:00:00Z"),
        status: "CONFIRMED",
        blockNumber: 19490000,
      },
    ];

    console.log("开始插入测试交易数据...");
    
    for (const tx of sampleTransactions) {
      await db.insert(transactions).values(tx);
      console.log(`✓ 插入交易: ${tx.txHash.slice(0, 10)}...`);
    }

    console.log(`\n✅ 成功插入 ${sampleTransactions.length} 条测试交易数据`);
    
    await connection.end();
  } catch (error) {
    console.error("❌ 插入数据失败:", error);
    process.exit(1);
  }
}

seedTransactions();
