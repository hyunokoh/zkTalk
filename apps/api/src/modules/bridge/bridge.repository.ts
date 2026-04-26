import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import { channelBridges, messageBridgeOrigins } from '../../lib/db/schema.js';

export type BridgePlatform = 'telegram' | 'discord';

export interface BridgeRow {
  id: string;
  channelId: string;
  platform: BridgePlatform;
  externalLabel: string | null;
  config: string;
  inboundSecret: string | null;
  enabled: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function listByChannel(channelId: string): Promise<BridgeRow[]> {
  return db
    .select()
    .from(channelBridges)
    .where(eq(channelBridges.channelId, channelId)) as Promise<BridgeRow[]>;
}

export async function findById(id: string): Promise<BridgeRow | null> {
  const [row] = await db
    .select()
    .from(channelBridges)
    .where(eq(channelBridges.id, id))
    .limit(1);
  return (row as BridgeRow | undefined) ?? null;
}

export async function findByInboundSecret(secret: string): Promise<BridgeRow | null> {
  const [row] = await db
    .select()
    .from(channelBridges)
    .where(eq(channelBridges.inboundSecret, secret))
    .limit(1);
  return (row as BridgeRow | undefined) ?? null;
}

export async function insert(input: {
  channelId: string;
  platform: BridgePlatform;
  externalLabel: string | null;
  config: string;
  inboundSecret: string | null;
  createdByUserId: string;
}): Promise<BridgeRow> {
  const id = uuidv7();
  const [row] = await db
    .insert(channelBridges)
    .values({
      id,
      channelId: input.channelId,
      platform: input.platform,
      externalLabel: input.externalLabel,
      config: input.config,
      inboundSecret: input.inboundSecret,
      createdByUserId: input.createdByUserId,
    })
    .returning();
  return row as BridgeRow;
}

export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  await db
    .update(channelBridges)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(channelBridges.id, id));
}

export async function remove(id: string, channelId: string): Promise<void> {
  await db
    .delete(channelBridges)
    .where(and(eq(channelBridges.id, id), eq(channelBridges.channelId, channelId)));
}

export async function recordOrigin(input: {
  messageId: string;
  bridgeId: string;
  platform: BridgePlatform;
  externalAuthorName: string | null;
  externalAuthorId: string | null;
  externalMessageId: string | null;
}): Promise<void> {
  await db.insert(messageBridgeOrigins).values(input);
}

export async function findOriginByMessage(messageId: string) {
  const [row] = await db
    .select()
    .from(messageBridgeOrigins)
    .where(eq(messageBridgeOrigins.messageId, messageId))
    .limit(1);
  return row ?? null;
}
