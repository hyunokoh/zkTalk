import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { db } from '../../lib/db/index.js';
import {
  agentDevices,
  agentThreads,
  deviceAgents,
  commandExecutions,
} from '../../lib/db/schema.js';
import type {
  AgentDevice,
  AgentThread,
  CommandApprovalDecision,
  CommandApprovalPolicy,
  CommandExecution,
  CommandExecutionStatus,
  DeviceAgent,
  DeviceHeartbeatSummary,
  DevicePlatform,
} from '@zktalk/shared';

// ── Row shapes & hydration helpers ───────────────────────────────────

type AgentDeviceRow = typeof agentDevices.$inferSelect;
type DeviceAgentRow = typeof deviceAgents.$inferSelect;
type CommandExecutionRow = typeof commandExecutions.$inferSelect;
type AgentThreadRow = typeof agentThreads.$inferSelect;

function parseJsonArray<T>(raw: string | null, fallback: T[]): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonObject<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function hydrateDevice(row: AgentDeviceRow): AgentDevice {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    slug: row.slug,
    platform: row.platform,
    state: row.state,
    lastHeartbeatAt: row.lastHeartbeatAt ? row.lastHeartbeatAt.toISOString() : null,
    lastStateChangedAt: row.lastStateChangedAt.toISOString(),
    sharedWithCommunityId: row.sharedWithCommunityId,
    sharedAllowedRoleIds: parseJsonArray<string>(row.sharedAllowedRoleIds, []),
    heartbeat: parseJsonObject<DeviceHeartbeatSummary>(row.heartbeatPayload),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function hydrateDeviceAgent(row: DeviceAgentRow): DeviceAgent {
  return {
    id: row.id,
    deviceId: row.deviceId,
    agentSlug: row.agentSlug,
    displayName: row.displayName,
    version: row.version,
    defaultVerb: row.defaultVerb,
    scopes: parseJsonArray<string>(row.scopes, []),
    isEnabled: row.isEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function hydrateCommand(row: CommandExecutionRow): CommandExecution {
  return {
    id: row.id,
    requesterUserId: row.requesterUserId,
    deviceId: row.deviceId,
    agentThreadId: row.agentThreadId,
    agentSlug: row.agentSlug,
    verb: row.verb,
    args: row.args,
    rawCommand: row.rawCommand,
    channelId: row.channelId,
    channelMessageId: row.channelMessageId,
    dmConversationId: row.dmConversationId,
    status: row.status,
    approvalPolicy: parseJsonObject<CommandApprovalPolicy>(row.approvalPolicy),
    approvals: parseJsonArray<CommandApprovalDecision>(row.approvals, []),
    stdoutTrunc: row.stdoutTrunc,
    stderrTrunc: row.stderrTrunc,
    exitCode: row.exitCode,
    queuedAt: row.queuedAt.toISOString(),
    startedAt: row.startedAt ? row.startedAt.toISOString() : null,
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Devices ──────────────────────────────────────────────────────────

export async function listDevicesByUser(userId: string): Promise<AgentDevice[]> {
  const rows = await db
    .select()
    .from(agentDevices)
    .where(eq(agentDevices.userId, userId))
    .orderBy(desc(agentDevices.lastHeartbeatAt));
  return rows.map(hydrateDevice);
}

export async function findDeviceById(id: string): Promise<AgentDevice | null> {
  const [row] = await db
    .select()
    .from(agentDevices)
    .where(eq(agentDevices.id, id))
    .limit(1);
  return row ? hydrateDevice(row) : null;
}

export async function findDeviceByUserSlug(
  userId: string,
  slug: string,
): Promise<AgentDevice | null> {
  const [row] = await db
    .select()
    .from(agentDevices)
    .where(and(eq(agentDevices.userId, userId), eq(agentDevices.slug, slug)))
    .limit(1);
  return row ? hydrateDevice(row) : null;
}

export async function createDevice(input: {
  userId: string;
  name: string;
  slug: string;
  platform: DevicePlatform;
  devicePublicKey?: string | null;
}): Promise<AgentDevice> {
  const id = uuidv7();
  const [row] = await db
    .insert(agentDevices)
    .values({
      id,
      userId: input.userId,
      name: input.name,
      slug: input.slug,
      platform: input.platform,
      devicePublicKey: input.devicePublicKey ?? null,
    })
    .returning();
  return hydrateDevice(row);
}

export async function updateDevice(
  id: string,
  patch: Partial<{
    name: string;
    sharedWithCommunityId: string | null;
    sharedAllowedRoleIds: string[];
  }>,
): Promise<AgentDevice | null> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.sharedWithCommunityId !== undefined)
    values.sharedWithCommunityId = patch.sharedWithCommunityId;
  if (patch.sharedAllowedRoleIds !== undefined)
    values.sharedAllowedRoleIds = JSON.stringify(patch.sharedAllowedRoleIds);

  const [row] = await db
    .update(agentDevices)
    .set(values)
    .where(eq(agentDevices.id, id))
    .returning();
  return row ? hydrateDevice(row) : null;
}

export async function recordHeartbeat(
  deviceId: string,
  summary: DeviceHeartbeatSummary,
): Promise<AgentDevice | null> {
  const now = new Date();
  const nextState = summary.runningCount > 0 ? 'busy' : 'online';
  const [row] = await db
    .update(agentDevices)
    .set({
      lastHeartbeatAt: now,
      lastStateChangedAt: now,
      state: nextState,
      heartbeatPayload: JSON.stringify(summary),
      updatedAt: now,
    })
    .where(eq(agentDevices.id, deviceId))
    .returning();
  return row ? hydrateDevice(row) : null;
}

export async function markDeviceState(
  deviceId: string,
  state: 'offline' | 'degraded' | 'suspended',
): Promise<AgentDevice | null> {
  const now = new Date();
  const [row] = await db
    .update(agentDevices)
    .set({ state, lastStateChangedAt: now, updatedAt: now })
    .where(eq(agentDevices.id, deviceId))
    .returning();
  return row ? hydrateDevice(row) : null;
}

export async function deleteDevice(id: string): Promise<void> {
  await db.delete(agentDevices).where(eq(agentDevices.id, id));
}

// ── Device agents ───────────────────────────────────────────────────

export async function listAgentsByDevice(deviceId: string): Promise<DeviceAgent[]> {
  const rows = await db
    .select()
    .from(deviceAgents)
    .where(eq(deviceAgents.deviceId, deviceId));
  return rows.map(hydrateDeviceAgent);
}

export async function listAgentsByDeviceIds(deviceIds: string[]): Promise<DeviceAgent[]> {
  if (deviceIds.length === 0) return [];
  const rows = await db
    .select()
    .from(deviceAgents)
    .where(inArray(deviceAgents.deviceId, deviceIds));
  return rows.map(hydrateDeviceAgent);
}

export async function findAgentByDeviceSlug(
  deviceId: string,
  agentSlug: string,
): Promise<DeviceAgent | null> {
  const [row] = await db
    .select()
    .from(deviceAgents)
    .where(and(eq(deviceAgents.deviceId, deviceId), eq(deviceAgents.agentSlug, agentSlug)))
    .limit(1);
  return row ? hydrateDeviceAgent(row) : null;
}

export async function upsertDeviceAgent(input: {
  deviceId: string;
  agentSlug: string;
  displayName: string;
  version?: string | null;
  defaultVerb?: string;
  scopes?: string[];
}): Promise<DeviceAgent> {
  const existing = await findAgentByDeviceSlug(input.deviceId, input.agentSlug);
  if (existing) {
    const [row] = await db
      .update(deviceAgents)
      .set({
        displayName: input.displayName,
        version: input.version ?? existing.version,
        defaultVerb: input.defaultVerb ?? existing.defaultVerb,
        scopes: input.scopes ? JSON.stringify(input.scopes) : JSON.stringify(existing.scopes),
        updatedAt: new Date(),
      })
      .where(eq(deviceAgents.id, existing.id))
      .returning();
    return hydrateDeviceAgent(row);
  }

  const id = uuidv7();
  const [row] = await db
    .insert(deviceAgents)
    .values({
      id,
      deviceId: input.deviceId,
      agentSlug: input.agentSlug,
      displayName: input.displayName,
      version: input.version ?? null,
      defaultVerb: input.defaultVerb ?? 'exec',
      scopes: JSON.stringify(input.scopes ?? []),
    })
    .returning();
  return hydrateDeviceAgent(row);
}

// ── Commands ─────────────────────────────────────────────────────────

export async function listCommandsByRequester(
  userId: string,
  opts: { deviceId?: string; threadId?: string | null; limit?: number } = {},
): Promise<CommandExecution[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const filters = [eq(commandExecutions.requesterUserId, userId)];
  if (opts.deviceId) {
    filters.push(eq(commandExecutions.deviceId, opts.deviceId));
  }
  if (opts.threadId === null) {
    // Explicit "default thread": commands with no agent_thread_id assigned.
    filters.push(isNull(commandExecutions.agentThreadId));
  } else if (typeof opts.threadId === 'string') {
    filters.push(eq(commandExecutions.agentThreadId, opts.threadId));
  }
  const rows = await db
    .select()
    .from(commandExecutions)
    .where(and(...filters))
    .orderBy(desc(commandExecutions.queuedAt))
    .limit(limit);
  return rows.map(hydrateCommand);
}

export async function listCommandsByDevice(deviceId: string, limit = 50): Promise<CommandExecution[]> {
  const rows = await db
    .select()
    .from(commandExecutions)
    .where(eq(commandExecutions.deviceId, deviceId))
    .orderBy(desc(commandExecutions.queuedAt))
    .limit(Math.min(Math.max(limit, 1), 200));
  return rows.map(hydrateCommand);
}

export async function findCommandById(id: string): Promise<CommandExecution | null> {
  const [row] = await db
    .select()
    .from(commandExecutions)
    .where(eq(commandExecutions.id, id))
    .limit(1);
  return row ? hydrateCommand(row) : null;
}

export async function createCommand(input: {
  requesterUserId: string;
  deviceId: string;
  agentThreadId?: string | null;
  agentSlug: string;
  verb: string;
  args: string;
  rawCommand: string;
  channelId?: string | null;
  dmConversationId?: string | null;
  approvalPolicy?: CommandApprovalPolicy | null;
  initialStatus?: CommandExecutionStatus;
}): Promise<CommandExecution> {
  const id = uuidv7();
  const [row] = await db
    .insert(commandExecutions)
    .values({
      id,
      requesterUserId: input.requesterUserId,
      deviceId: input.deviceId,
      agentThreadId: input.agentThreadId ?? null,
      agentSlug: input.agentSlug,
      verb: input.verb,
      args: input.args,
      rawCommand: input.rawCommand,
      channelId: input.channelId ?? null,
      dmConversationId: input.dmConversationId ?? null,
      status: input.initialStatus ?? 'queued',
      approvalPolicy: input.approvalPolicy ? JSON.stringify(input.approvalPolicy) : null,
    })
    .returning();
  if (input.agentThreadId) {
    // Bump lastMessageAt so the thread float-to-top works on next list.
    await db
      .update(agentThreads)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(agentThreads.id, input.agentThreadId));
  }
  return hydrateCommand(row);
}

// ── Agent threads ─────────────────────────────────────────────────────

export function hydrateThread(row: AgentThreadRow): AgentThread {
  return {
    id: row.id,
    userId: row.userId,
    deviceId: row.deviceId,
    title: row.title,
    isDefault: row.isDefault,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listThreadsByUserDevice(
  userId: string,
  deviceId: string,
): Promise<AgentThread[]> {
  const rows = await db
    .select()
    .from(agentThreads)
    .where(and(eq(agentThreads.userId, userId), eq(agentThreads.deviceId, deviceId)))
    .orderBy(desc(sql`coalesce(${agentThreads.lastMessageAt}, ${agentThreads.createdAt})`));
  return rows.map(hydrateThread);
}

export async function findThreadById(id: string): Promise<AgentThread | null> {
  const [row] = await db
    .select()
    .from(agentThreads)
    .where(eq(agentThreads.id, id))
    .limit(1);
  return row ? hydrateThread(row) : null;
}

export async function createThread(input: {
  userId: string;
  deviceId: string;
  title?: string;
  isDefault?: boolean;
}): Promise<AgentThread> {
  const id = uuidv7();
  const [row] = await db
    .insert(agentThreads)
    .values({
      id,
      userId: input.userId,
      deviceId: input.deviceId,
      title: input.title ?? '',
      isDefault: input.isDefault ?? false,
      lastMessageAt: new Date(),
    })
    .returning();
  return hydrateThread(row);
}

export async function updateThread(
  id: string,
  patch: { title?: string; archivedAt?: Date | null },
): Promise<AgentThread | null> {
  const updates: Partial<typeof agentThreads.$inferInsert> = { updatedAt: new Date() };
  if (typeof patch.title === 'string') updates.title = patch.title;
  if (patch.archivedAt !== undefined) updates.archivedAt = patch.archivedAt;
  const [row] = await db
    .update(agentThreads)
    .set(updates)
    .where(eq(agentThreads.id, id))
    .returning();
  return row ? hydrateThread(row) : null;
}

export async function deleteThread(id: string): Promise<void> {
  await db.delete(agentThreads).where(eq(agentThreads.id, id));
}

export async function updateCommandStatus(
  id: string,
  patch: {
    status?: CommandExecutionStatus;
    stdoutTrunc?: string | null;
    stderrTrunc?: string | null;
    exitCode?: number | null;
    startedAt?: Date | null;
    finishedAt?: Date | null;
    approvals?: CommandApprovalDecision[];
  },
): Promise<CommandExecution | null> {
  const values: Record<string, unknown> = {};
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.stdoutTrunc !== undefined) values.stdoutTrunc = patch.stdoutTrunc;
  if (patch.stderrTrunc !== undefined) values.stderrTrunc = patch.stderrTrunc;
  if (patch.exitCode !== undefined) values.exitCode = patch.exitCode;
  if (patch.startedAt !== undefined) values.startedAt = patch.startedAt;
  if (patch.finishedAt !== undefined) values.finishedAt = patch.finishedAt;
  if (patch.approvals !== undefined) values.approvals = JSON.stringify(patch.approvals);

  if (Object.keys(values).length === 0) {
    return findCommandById(id);
  }

  const [row] = await db
    .update(commandExecutions)
    .set(values)
    .where(eq(commandExecutions.id, id))
    .returning();
  return row ? hydrateCommand(row) : null;
}

export async function countDevicesByUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agentDevices)
    .where(eq(agentDevices.userId, userId));
  return Number(row?.count ?? 0);
}
