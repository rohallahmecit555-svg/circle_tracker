// Chain configurations
export const CHAINS = {
  1: { id: 1, name: "Ethereum", symbol: "ETH", rpcUrl: "https://eth.llamarpc.com" },
  8453: { id: 8453, name: "Base", symbol: "BASE", rpcUrl: "https://base.llamarpc.com" },
  42161: { id: 42161, name: "Arbitrum", symbol: "ARB", rpcUrl: "https://arbitrum.llamarpc.com" },
  137: { id: 137, name: "Polygon", symbol: "MATIC", rpcUrl: "https://polygon.llamarpc.com" },
  10: { id: 10, name: "Optimism", symbol: "OP", rpcUrl: "https://optimism.llamarpc.com" },
  43114: { id: 43114, name: "Avalanche", symbol: "AVAX", rpcUrl: "https://avalanche.llamarpc.com" },
} as const;

export const CHAIN_OPTIONS = Object.values(CHAINS).map(chain => ({
  value: chain.id.toString(),
  label: chain.name,
}));

// Transaction types
export const TRANSACTION_TYPES = {
  CIRCLE_MINT: "Circle Mint (法币兑换)",
  CIRCLE_BURN: "Circle Burn (法币赎回)",
  CCTP_BURN: "CCTP Burn (跨链销毁)",
  CCTP_MINT: "CCTP Mint (跨链铸造)",
  OTHER: "Other",
} as const;

export const TRANSACTION_TYPE_OPTIONS = Object.entries(TRANSACTION_TYPES).map(([key, label]) => ({
  value: key,
  label,
}));

// USDC contract addresses
export const USDC_ADDRESSES = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b1566dA3C95",
  42161: "0xAF88d065e77c8cC2239327C5EDb3A432268e5831",
  137: "0x2791Bca1f2de4661ED88A928da36B3fF2D7f7D23",
  10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
} as const;

// Circle Mint addresses (official minters)
export const CIRCLE_MINTERS = {
  1: "0xE7ed1fa7f45D05C308232b7d0BFF3E0E5f81985c", // Ethereum
  8453: "0x1LD100arWBvEeE9a8y9wxYkEab69dEFqFvkqP6AP8", // Base
  42161: "0xcE2CC46682E8C2a1F718f5C8169B8ea3714A4654", // Arbitrum
  137: "0x1LD100arWBvEeE9a8y9wxYkEab69dEFqFvkqP6AP8", // Polygon
  10: "0xE7ed1fa7f45D05C308232b7d0BFF3E0E5f81985c", // Optimism
  43114: "0x1LD100arWBvEeE9a8y9wxYkEab69dEFqFvkqP6AP8", // Avalanche
} as const;

// CCTP contract addresses
export const CCTP_CONTRACTS = {
  tokenMessenger: {
    1: "0xBd3fa81B58ba92a82136038B25aDec7066e1C60a",
    8453: "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962",
    42161: "0x19330d10B9afb16F576Ddf19cbFb1B79daC60AAe",
    137: "0x9f3B8679c73C2Fef8b59f54c9A711e3812ee217D",
    10: "0x2B4069517957735bE00ceE0fadAE88a26365528F",
    43114: "0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982",
  },
  messageTransmitter: {
    1: "0x0a992d191DEeC32aFe36203Ad87D7d289a738F81",
    8453: "0xAD09780d193884d503182aD4588450C416D6F9D4",
    42161: "0xC30362313FBBA5cf280f2D7A855D289a8711B820",
    137: "0x05ca63b0072E39A7f27f2E80DBc65b1c7db76d09",
    10: "0x4D41f90D15Dac74C94F5B6f97c4d3257e4882da7",
    43114: "0x6F475642a6e85809B1c36Fa62763669b1b98c237",
  },
} as const;

// Date format
export const DATE_FORMAT = "YYYY-MM-DD";
export const TIME_FORMAT = "HH:mm:ss";
export const DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Alert threshold (in USDC)
export const DEFAULT_ALERT_THRESHOLD = 1000000; // 1 million USDC
