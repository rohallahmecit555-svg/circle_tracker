import { decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Transactions table: stores all captured USDC-related transactions
 */
export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    txHash: varchar("txHash", { length: 66 }).notNull().unique(),
    chainId: int("chainId").notNull(),
    chainName: varchar("chainName", { length: 50 }).notNull(),
    blockNumber: bigint("blockNumber", { mode: "number" }).notNull(),
    timestamp: timestamp("timestamp").notNull(),
    fromAddress: varchar("fromAddress", { length: 42 }).notNull(),
    toAddress: varchar("toAddress", { length: 42 }).notNull(),
    amount: decimal("amount", { precision: 38, scale: 6 }).notNull(),
    type: mysqlEnum("type", ["CIRCLE_MINT", "CIRCLE_BURN", "CCTP_BURN", "CCTP_MINT", "OTHER"]).notNull(),
    sourceChain: varchar("sourceChain", { length: 50 }),
    targetChain: varchar("targetChain", { length: 50 }),
    messageHash: varchar("messageHash", { length: 66 }),
    status: mysqlEnum("status", ["PENDING", "CONFIRMED", "FAILED"]).default("CONFIRMED").notNull(),
    rawData: json("rawData"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    txHashIdx: index("txHash_idx").on(table.txHash),
    chainIdIdx: index("chainId_idx").on(table.chainId),
    typeIdx: index("type_idx").on(table.type),
    timestampIdx: index("timestamp_idx").on(table.timestamp),
  })
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Events table: stores all captured smart contract event logs
 */
export const events = mysqlTable(
  "events",
  {
    id: int("id").autoincrement().primaryKey(),
    txHash: varchar("txHash", { length: 66 }).notNull(),
    logIndex: int("logIndex").notNull(),
    chainId: int("chainId").notNull(),
    contractAddress: varchar("contractAddress", { length: 42 }).notNull(),
    eventName: varchar("eventName", { length: 100 }).notNull(),
    topics: json("topics"),
    data: json("data"),
    blockNumber: bigint("blockNumber", { mode: "number" }).notNull(),
    timestamp: timestamp("timestamp").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    txHashIdx: index("event_txHash_idx").on(table.txHash),
    chainIdIdx: index("event_chainId_idx").on(table.chainId),
    eventNameIdx: index("eventName_idx").on(table.eventName),
  })
);

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Statistics table: stores aggregated statistics for dashboard display
 */
export const statistics = mysqlTable(
  "statistics",
  {
    id: int("id").autoincrement().primaryKey(),
    date: varchar("date", { length: 10 }).notNull(),
    chainId: int("chainId").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    count: int("count").default(0).notNull(),
    totalAmount: decimal("totalAmount", { precision: 38, scale: 6 }).default("0").notNull(),
    avgAmount: decimal("avgAmount", { precision: 38, scale: 6 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    dateChainTypeIdx: index("date_chain_type_idx").on(table.date, table.chainId, table.type),
  })
);

export type Statistic = typeof statistics.$inferSelect;
export type InsertStatistic = typeof statistics.$inferInsert;

/**
 * Alerts configuration table: stores user alert settings
 */
export const alertConfigs = mysqlTable(
  "alertConfigs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    thresholdAmount: decimal("thresholdAmount", { precision: 38, scale: 6 }).default("1000000").notNull(),
    enabled: int("enabled").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("alertConfig_userId_idx").on(table.userId),
  })
);

export type AlertConfig = typeof alertConfigs.$inferSelect;
export type InsertAlertConfig = typeof alertConfigs.$inferInsert;