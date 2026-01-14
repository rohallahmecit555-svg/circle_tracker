import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, transactions, events, statistics, alertConfigs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Circle Tracker specific queries

export async function getTransactionByHash(txHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.txHash, txHash))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function getTransactions(filters: {
  chainId?: number;
  type?: string;
  startTime?: Date;
  endTime?: Date;
  minAmount?: string;
  maxAmount?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters.chainId) {
    conditions.push(eq(transactions.chainId, filters.chainId));
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type as any));
  }
  if (filters.startTime) {
    conditions.push(gte(transactions.timestamp, filters.startTime));
  }
  if (filters.endTime) {
    conditions.push(lte(transactions.timestamp, filters.endTime));
  }
  
  const result = await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.timestamp))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);
  
  return result;
}

export async function getStatistics(filters: {
  date?: string;
  chainId?: number;
  type?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters.date) {
    conditions.push(eq(statistics.date, filters.date));
  }
  if (filters.chainId) {
    conditions.push(eq(statistics.chainId, filters.chainId));
  }
  if (filters.type) {
    conditions.push(eq(statistics.type, filters.type));
  }
  
  const result = await db
    .select()
    .from(statistics)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  return result;
}

export async function getAlertConfig(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(alertConfigs)
    .where(eq(alertConfigs.userId, userId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}
