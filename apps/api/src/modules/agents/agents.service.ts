import { AppError } from '../../lib/errors.js';
import { realtimeService } from '../realtime/realtime.service.js';
import { WebSocketEvent } from '@zktalk/shared';
import type {
  AgentDevice,
  CommandApprovalDecision,
  CommandExecution,
  DeviceAgent,
  DeviceHeartbeatSummary,
  DevicePlatform,
  QueueCommandInput,
  RegisterAgentDeviceInput,
  RegisterDeviceAgentInput,
} from '@zktalk/shared';
import * as repo from './agents.repository.js';

// ── Devices ──────────────────────────────────────────────────────────

export async function listDevices(userId: string): Promise<{
  devices: AgentDevice[];
  agentsByDevice: Record<string, DeviceAgent[]>;
}> {
  const devices = await repo.listDevicesByUser(userId);
  const agents = await repo.listAgentsByDeviceIds(devices.map((d) => d.id));
  const agentsByDevice: Record<string, DeviceAgent[]> = {};
  for (const device of devices) agentsByDevice[device.id] = [];
  for (const agent of agents) {
    agentsByDevice[agent.deviceId] = agentsByDevice[agent.deviceId] ?? [];
    agentsByDevice[agent.deviceId]!.push(agent);
  }
  return { devices, agentsByDevice };
}

export async function getOwnedDevice(userId: string, deviceId: string): Promise<AgentDevice> {
  const device = await repo.findDeviceById(deviceId);
  if (!device) {
    throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
  }
  if (device.userId !== userId) {
    // Allow read access when the device is shared with a community the user belongs to —
    // membership verification is handled at the route level before calling the richer APIs.
    if (!device.sharedWithCommunityId) {
      throw AppError.forbidden('Device belongs to another user', 'DEVICE_FORBIDDEN');
    }
  }
  return device;
}

export async function registerDevice(
  userId: string,
  input: RegisterAgentDeviceInput,
): Promise<AgentDevice> {
  const existing = await repo.findDeviceByUserSlug(userId, input.slug);
  if (existing) {
    throw AppError.conflict('Device slug already taken', 'DEVICE_SLUG_TAKEN');
  }
  const device = await repo.createDevice({
    userId,
    name: input.name,
    slug: input.slug,
    platform: input.platform as DevicePlatform,
    devicePublicKey: input.devicePublicKey ?? null,
  });
  realtimeService.sendToUser(userId, WebSocketEvent.DEVICE_REGISTERED, device);
  return device;
}

export async function updateDevice(
  userId: string,
  deviceId: string,
  patch: {
    name?: string;
    sharedWithCommunityId?: string | null;
    sharedAllowedRoleIds?: string[];
  },
): Promise<AgentDevice> {
  const device = await repo.findDeviceById(deviceId);
  if (!device || device.userId !== userId) {
    throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
  }
  const updated = await repo.updateDevice(deviceId, patch);
  if (!updated) {
    throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
  }
  realtimeService.sendToUser(userId, WebSocketEvent.DEVICE_UPDATED, updated);
  return updated;
}

export async function removeDevice(userId: string, deviceId: string): Promise<void> {
  const device = await repo.findDeviceById(deviceId);
  if (!device || device.userId !== userId) {
    throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
  }
  await repo.deleteDevice(deviceId);
  realtimeService.sendToUser(userId, WebSocketEvent.DEVICE_REMOVED, { deviceId });
}

export async function recordHeartbeat(
  userId: string,
  deviceId: string,
  summary: DeviceHeartbeatSummary,
): Promise<AgentDevice> {
  const device = await repo.findDeviceById(deviceId);
  if (!device || device.userId !== userId) {
    throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
  }
  const updated = await repo.recordHeartbeat(deviceId, summary);
  if (!updated) {
    throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
  }
  realtimeService.sendToUser(userId, WebSocketEvent.DEVICE_HEARTBEAT, {
    deviceId,
    state: updated.state,
    heartbeat: summary,
  });
  return updated;
}

// ── Device agents ───────────────────────────────────────────────────

export async function listDeviceAgents(userId: string, deviceId: string): Promise<DeviceAgent[]> {
  await getOwnedDevice(userId, deviceId);
  return repo.listAgentsByDevice(deviceId);
}

export async function registerDeviceAgent(
  userId: string,
  deviceId: string,
  input: RegisterDeviceAgentInput,
): Promise<DeviceAgent> {
  const device = await repo.findDeviceById(deviceId);
  if (!device || device.userId !== userId) {
    throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
  }
  const agent = await repo.upsertDeviceAgent({
    deviceId,
    agentSlug: input.agentSlug,
    displayName: input.displayName,
    version: input.version ?? null,
    defaultVerb: input.defaultVerb ?? 'exec',
    scopes: input.scopes ?? [],
  });
  return agent;
}

// ── Commands ─────────────────────────────────────────────────────────

async function resolveTargetDevice(
  userId: string,
  input: QueueCommandInput,
): Promise<AgentDevice> {
  if (input.deviceId) {
    const device = await repo.findDeviceById(input.deviceId);
    if (!device) throw AppError.notFound('Device not found', 'DEVICE_NOT_FOUND');
    if (device.userId !== userId && !device.sharedWithCommunityId) {
      throw AppError.forbidden('Device belongs to another user', 'DEVICE_FORBIDDEN');
    }
    return device;
  }
  if (!input.deviceSlug) {
    throw AppError.badRequest('deviceSlug or deviceId required', 'DEVICE_REQUIRED');
  }
  const device = await repo.findDeviceByUserSlug(userId, input.deviceSlug);
  if (!device) {
    throw AppError.notFound(
      `No device matches slug ${input.deviceSlug}`,
      'DEVICE_SLUG_NOT_FOUND',
    );
  }
  return device;
}

export async function queueCommand(
  userId: string,
  input: QueueCommandInput,
): Promise<CommandExecution> {
  const device = await resolveTargetDevice(userId, input);
  const agent = await repo.findAgentByDeviceSlug(device.id, input.agentSlug);
  if (!agent || !agent.isEnabled) {
    throw AppError.notFound(
      `Agent ${input.agentSlug} not installed on ${device.slug}`,
      'AGENT_NOT_INSTALLED',
    );
  }

  const command = await repo.createCommand({
    requesterUserId: userId,
    deviceId: device.id,
    agentSlug: input.agentSlug,
    verb: input.verb ?? agent.defaultVerb,
    args: input.args ?? '',
    rawCommand: input.rawCommand,
    channelId: input.channelId ?? null,
    dmConversationId: input.dmConversationId ?? null,
    // Shared-device approval is added in 9C. For now: self-execution for own devices.
    initialStatus: device.userId === userId ? 'queued' : 'awaiting_approval',
  });

  realtimeService.sendToUser(userId, WebSocketEvent.COMMAND_QUEUED, command);
  if (device.userId !== userId) {
    realtimeService.sendToUser(device.userId, WebSocketEvent.COMMAND_AWAITING_APPROVAL, command);
  }
  return command;
}

export async function listRecentCommands(
  userId: string,
  opts: { deviceId?: string; limit?: number } = {},
): Promise<CommandExecution[]> {
  if (opts.deviceId) {
    await getOwnedDevice(userId, opts.deviceId);
  }
  return repo.listCommandsByRequester(userId, opts);
}

export async function getCommand(userId: string, commandId: string): Promise<CommandExecution> {
  const command = await repo.findCommandById(commandId);
  if (!command) {
    throw AppError.notFound('Command not found', 'COMMAND_NOT_FOUND');
  }
  if (command.requesterUserId !== userId) {
    // Device owner can also read — e.g., when someone queued a command against a shared device.
    const device = await repo.findDeviceById(command.deviceId);
    if (!device || device.userId !== userId) {
      throw AppError.forbidden('Not allowed to read this command', 'COMMAND_FORBIDDEN');
    }
  }
  return command;
}

export async function recordCommandResult(
  commandId: string,
  payload: {
    exitCode: number;
    stdoutTrunc?: string | null;
    stderrTrunc?: string | null;
  },
): Promise<CommandExecution> {
  const finishedAt = new Date();
  const status = payload.exitCode === 0 ? 'completed' : 'failed';
  const updated = await repo.updateCommandStatus(commandId, {
    status,
    exitCode: payload.exitCode,
    stdoutTrunc: payload.stdoutTrunc ?? null,
    stderrTrunc: payload.stderrTrunc ?? null,
    finishedAt,
  });
  if (!updated) {
    throw AppError.notFound('Command not found', 'COMMAND_NOT_FOUND');
  }
  realtimeService.sendToUser(
    updated.requesterUserId,
    status === 'completed' ? WebSocketEvent.COMMAND_COMPLETED : WebSocketEvent.COMMAND_FAILED,
    updated,
  );
  return updated;
}

export async function markCommandRunning(commandId: string): Promise<CommandExecution> {
  const updated = await repo.updateCommandStatus(commandId, {
    status: 'running',
    startedAt: new Date(),
  });
  if (!updated) {
    throw AppError.notFound('Command not found', 'COMMAND_NOT_FOUND');
  }
  realtimeService.sendToUser(updated.requesterUserId, WebSocketEvent.COMMAND_RUNNING, updated);
  return updated;
}

/**
 * Bridge-facing: atomically flips queued/approved → running. Only the device
 * owner (whose auth is what the bridge daemon holds) may claim. Idempotent if
 * the command is already running for the same device.
 */
export async function claimCommand(
  userId: string,
  commandId: string,
): Promise<CommandExecution> {
  const command = await repo.findCommandById(commandId);
  if (!command) {
    throw AppError.notFound('Command not found', 'COMMAND_NOT_FOUND');
  }
  const device = await repo.findDeviceById(command.deviceId);
  if (!device || device.userId !== userId) {
    throw AppError.forbidden('Not allowed to claim this command', 'CLAIM_FORBIDDEN');
  }
  if (command.status === 'running') {
    return command;
  }
  if (command.status !== 'queued' && command.status !== 'approved') {
    throw AppError.conflict(
      `Command in status ${command.status} cannot be claimed`,
      'CLAIM_INVALID_STATUS',
    );
  }
  return markCommandRunning(commandId);
}

/**
 * Bridge-facing: report a finished command. Only the device owner may submit
 * results. Rejects submissions for commands already in a terminal state.
 */
export async function submitCommandResult(
  userId: string,
  commandId: string,
  payload: {
    exitCode: number;
    stdoutTrunc?: string | null;
    stderrTrunc?: string | null;
  },
): Promise<CommandExecution> {
  const command = await repo.findCommandById(commandId);
  if (!command) {
    throw AppError.notFound('Command not found', 'COMMAND_NOT_FOUND');
  }
  const device = await repo.findDeviceById(command.deviceId);
  if (!device || device.userId !== userId) {
    throw AppError.forbidden(
      'Not allowed to submit a result for this command',
      'RESULT_FORBIDDEN',
    );
  }
  const terminal = ['completed', 'failed', 'rejected', 'timeout', 'cancelled'] as const;
  if ((terminal as readonly string[]).includes(command.status)) {
    throw AppError.conflict(
      `Command already in terminal status ${command.status}`,
      'RESULT_ALREADY_FINAL',
    );
  }
  return recordCommandResult(commandId, payload);
}

export async function recordCommandApproval(
  userId: string,
  commandId: string,
  decision: 'approved' | 'rejected',
): Promise<CommandExecution> {
  const command = await repo.findCommandById(commandId);
  if (!command) {
    throw AppError.notFound('Command not found', 'COMMAND_NOT_FOUND');
  }
  // Minimal eligibility model for 9B: only the device owner can approve/reject.
  // 9C adds role-based N-of-M policies.
  const device = await repo.findDeviceById(command.deviceId);
  if (!device || device.userId !== userId) {
    throw AppError.forbidden('Not eligible to approve this command', 'APPROVAL_FORBIDDEN');
  }
  const already = command.approvals.find((a) => a.userId === userId);
  if (already) {
    throw AppError.conflict('Already recorded a decision', 'APPROVAL_DUPLICATE');
  }
  const entry: CommandApprovalDecision = {
    userId,
    decision,
    at: new Date().toISOString(),
  };
  const approvals = [...command.approvals, entry];
  const nextStatus = decision === 'rejected' ? 'rejected' : 'approved';
  const updated = await repo.updateCommandStatus(commandId, {
    approvals,
    status: nextStatus,
  });
  if (!updated) {
    throw AppError.notFound('Command not found', 'COMMAND_NOT_FOUND');
  }
  realtimeService.sendToUser(
    updated.requesterUserId,
    decision === 'approved' ? WebSocketEvent.COMMAND_APPROVED : WebSocketEvent.COMMAND_REJECTED,
    updated,
  );
  return updated;
}
