import { and, desc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import { apiKeys } from '../../lib/db/schema.js';

export interface ApiKeyRow {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export async function insert(row: {
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt: Date | null;
}): Promise<ApiKeyRow> {
  const id = uuidv7();
  const [created] = await db
    .insert(apiKeys)
    .values({
      id,
      userId: row.userId,
      name: row.name,
      keyPrefix: row.keyPrefix,
      keyHash: row.keyHash,
      scopes: row.scopes,
      expiresAt: row.expiresAt,
    })
    .returning();
  return created as ApiKeyRow;
}

export async function listByUser(userId: string): Promise<ApiKeyRow[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt)) as Promise<ApiKeyRow[]>;
}

export async function findActiveByHash(keyHash: string): Promise<ApiKeyRow | null> {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);
  return (row as ApiKeyRow | undefined) ?? null;
}

export async function findById(id: string, userId: string): Promise<ApiKeyRow | null> {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .limit(1);
  return (row as ApiKeyRow | undefined) ?? null;
}

export async function revoke(id: string, userId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function touchLastUsed(id: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
