import type {
  MachineCodexAuthState,
  MachineExecutionIntent,
  MachinePresenceStatus,
} from '../constants/index';
import type {
  LocalMachine,
  LocalMachineAttachmentReference,
  LocalMachineCommandUpdate,
  LocalMachineCommandEnvelope,
  LocalMachineCommandSource,
  LocalMachineSelectedMessageExcerpt,
} from '../types/index';

const MACHINE_NAME_MAX_LENGTH = 32;
const MACHINE_NAME_FALLBACK = 'machine';
const DEFAULT_LOCAL_MACHINE_HEARTBEAT_TIMEOUT_MS = 60_000;

export type LocalMachineRoutingFailureReason =
  | 'wrong_owner'
  | 'busy'
  | 'offline'
  | 'auth_missing'
  | 'bridge_missing';

export type LocalMachineRoutingDecision =
  | { ok: true; reason: 'online' }
  | { ok: false; reason: LocalMachineRoutingFailureReason };

export type LocalMachineDispatchRuntime = 'desktop' | 'web' | 'mobile';

export type LocalMachineDispatchBlockReason =
  | LocalMachineRoutingFailureReason
  | 'desktop_only'
  | 'timed_out';

export type LocalMachineDispatchAvailability =
  | { ok: true; reason: 'ready' }
  | { ok: false; reason: LocalMachineDispatchBlockReason };

export type LocalMachineCommandDeliveryState =
  | 'accepted'
  | 'streaming'
  | 'completed'
  | 'offline'
  | 'busy'
  | 'auth_missing'
  | 'bridge_missing'
  | 'timed_out'
  | 'rejected';

export type LocalMachineBridgeExecutor = 'target_machine_local_codex';

export interface PlanLocalMachineBridgeExecutionInput {
  envelope: LocalMachineCommandEnvelope;
  machine: Pick<
    LocalMachine,
    'id' | 'ownerUserId' | 'bridgeIdentifier' | 'codexAuthState' | 'presence'
  >;
  activeCommandId?: string | null;
  streamedOutput?: string[];
  completionSummary?: string | null;
  completionOutputText?: string | null;
  acceptedAt?: string;
  streamedAt?: string[];
  completedAt?: string;
}

export interface LocalMachineBridgeExecutionPlan {
  executor: LocalMachineBridgeExecutor;
  bridgeIdentifier: string;
  accepted: boolean;
  blockedReason: LocalMachineDispatchBlockReason | 'rejected' | null;
  updates: LocalMachineCommandUpdate[];
}

export interface ResolveLocalMachineHeartbeatPresenceInput {
  bridgeIdentifier: string | null | undefined;
  codexAuthState: MachineCodexAuthState;
  activeCommandId?: string | null;
  lastHeartbeatAt?: string | null;
  now?: string;
  heartbeatTimeoutMs?: number;
}

export interface LocalMachineHeartbeatPresenceSnapshot {
  status: MachinePresenceStatus;
  codexAuthState: MachineCodexAuthState;
  activeCommandId: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
}

export interface BuildLocalMachineCommandEnvelopeInput {
  id: string;
  targetMachineId: string;
  owningUserId: string;
  source: LocalMachineCommandSource;
  instruction: string;
  intent: MachineExecutionIntent;
  selectedMessages?: LocalMachineSelectedMessageExcerpt[];
  attachmentReferences?: LocalMachineAttachmentReference[];
  createdAt?: string;
}

export interface BuildLocalMachineCommandUpdateInput {
  commandId: string;
  targetMachineId: string;
  owningUserId: string;
  status: 'accepted' | 'streaming' | 'completed' | 'failed' | 'rejected';
  summary?: string | null;
  outputText?: string | null;
  errorCode?:
    | 'offline'
    | 'busy'
    | 'auth_missing'
    | 'bridge_missing'
    | 'timed_out'
    | 'rejected'
    | null;
  createdAt?: string;
}

export function normalizeMachineName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, MACHINE_NAME_MAX_LENGTH)
    .replace(/-+$/g, '');

  return normalized || MACHINE_NAME_FALLBACK;
}

export function isMachinePresenceRunnable(status: MachinePresenceStatus): boolean {
  return status === 'online';
}

export function resolveLocalMachineHeartbeatPresence(
  input: ResolveLocalMachineHeartbeatPresenceInput,
): LocalMachineHeartbeatPresenceSnapshot {
  const heartbeatTimeoutMs =
    typeof input.heartbeatTimeoutMs === 'number' && Number.isFinite(input.heartbeatTimeoutMs)
      ? Math.max(1, Math.trunc(input.heartbeatTimeoutMs))
      : DEFAULT_LOCAL_MACHINE_HEARTBEAT_TIMEOUT_MS;
  const activeCommandId = input.activeCommandId?.trim() || null;
  const bridgeIdentifier = input.bridgeIdentifier?.trim() || '';
  const heartbeatAt = input.lastHeartbeatAt?.trim() || null;
  const nowIso = input.now?.trim() || new Date().toISOString();
  const nowMs = Date.parse(nowIso);
  const heartbeatMs = heartbeatAt ? Date.parse(heartbeatAt) : Number.NaN;

  if (!bridgeIdentifier) {
    return {
      status: 'bridge_missing',
      codexAuthState: input.codexAuthState,
      activeCommandId,
      lastSeenAt: heartbeatAt,
      expiresAt: null,
    };
  }

  if (!heartbeatAt || !Number.isFinite(nowMs) || !Number.isFinite(heartbeatMs)) {
    return {
      status: 'bridge_missing',
      codexAuthState: input.codexAuthState,
      activeCommandId,
      lastSeenAt: heartbeatAt,
      expiresAt: heartbeatAt,
    };
  }

  const expiresAt = new Date(heartbeatMs + heartbeatTimeoutMs).toISOString();
  if (heartbeatMs + heartbeatTimeoutMs < nowMs) {
    return {
      status: 'bridge_missing',
      codexAuthState: input.codexAuthState,
      activeCommandId,
      lastSeenAt: heartbeatAt,
      expiresAt,
    };
  }

  if (input.codexAuthState === 'auth_missing') {
    return {
      status: 'auth_missing',
      codexAuthState: input.codexAuthState,
      activeCommandId,
      lastSeenAt: heartbeatAt,
      expiresAt,
    };
  }

  return {
    status: activeCommandId ? 'busy' : 'online',
    codexAuthState: input.codexAuthState,
    activeCommandId,
    lastSeenAt: heartbeatAt,
    expiresAt,
  };
}

export function resolveLocalMachineRoutingDecision(input: {
  owningUserId: string;
  machineOwnerUserId: string;
  presence: MachinePresenceStatus;
}): LocalMachineRoutingDecision {
  if (input.owningUserId !== input.machineOwnerUserId) {
    return { ok: false, reason: 'wrong_owner' };
  }

  switch (input.presence) {
    case 'online':
      return { ok: true, reason: 'online' };
    case 'busy':
      return { ok: false, reason: 'busy' };
    case 'auth_missing':
      return { ok: false, reason: 'auth_missing' };
    case 'bridge_missing':
      return { ok: false, reason: 'bridge_missing' };
    case 'offline':
    default:
      return { ok: false, reason: 'offline' };
  }
}

export function resolveLocalMachineDispatchAvailability(input: {
  runtime: LocalMachineDispatchRuntime;
  owningUserId: string;
  machineOwnerUserId: string;
  presence: MachinePresenceStatus;
}): LocalMachineDispatchAvailability {
  if (input.runtime !== 'desktop') {
    return { ok: false, reason: 'desktop_only' };
  }

  const routingDecision = resolveLocalMachineRoutingDecision({
    owningUserId: input.owningUserId,
    machineOwnerUserId: input.machineOwnerUserId,
    presence: input.presence,
  });

  return routingDecision.ok
    ? { ok: true, reason: 'ready' }
    : { ok: false, reason: routingDecision.reason };
}

export function buildLocalMachineCommandEnvelope(
  input: BuildLocalMachineCommandEnvelopeInput,
): LocalMachineCommandEnvelope {
  return {
    id: input.id.trim(),
    targetMachineId: input.targetMachineId.trim(),
    owningUserId: input.owningUserId.trim(),
    source: input.source,
    instruction: input.instruction.trim(),
    intent: input.intent,
    selectedMessages: [...(input.selectedMessages ?? [])],
    attachmentReferences: [...(input.attachmentReferences ?? [])],
    createdAt: input.createdAt?.trim() || new Date().toISOString(),
  };
}

export function buildLocalMachineCommandUpdate(
  input: BuildLocalMachineCommandUpdateInput,
): LocalMachineCommandUpdate {
  const status = input.status;
  const errorCode = input.errorCode ?? null;

  if (status === 'accepted' || status === 'streaming' || status === 'completed') {
    if (errorCode) {
      throw new Error(`Local machine command status "${status}" cannot include an error code.`);
    }
  }

  if (status === 'failed' && !errorCode) {
    throw new Error('Failed local machine command updates require an explicit error code.');
  }

  if (status === 'rejected' && errorCode !== 'rejected') {
    throw new Error('Rejected local machine command updates must use the "rejected" error code.');
  }

  if (status === 'failed' && errorCode === 'rejected') {
    throw new Error('Failed local machine command updates cannot use the "rejected" error code.');
  }

  if (status !== 'failed' && status !== 'rejected' && errorCode === 'rejected') {
    throw new Error('Only rejected local machine command updates may use the "rejected" error code.');
  }

  return {
    commandId: input.commandId.trim(),
    targetMachineId: input.targetMachineId.trim(),
    owningUserId: input.owningUserId.trim(),
    status,
    summary: input.summary?.trim() || null,
    outputText: input.outputText?.trim() || null,
    errorCode,
    createdAt: input.createdAt?.trim() || new Date().toISOString(),
  };
}

export function resolveLocalMachineCommandDeliveryState(
  update: Pick<LocalMachineCommandUpdate, 'status' | 'errorCode'>,
): LocalMachineCommandDeliveryState {
  switch (update.status) {
    case 'accepted':
      return 'accepted';
    case 'streaming':
      return 'streaming';
    case 'completed':
      return 'completed';
    case 'rejected':
      return 'rejected';
    case 'failed':
      switch (update.errorCode) {
        case 'offline':
          return 'offline';
        case 'busy':
          return 'busy';
        case 'auth_missing':
          return 'auth_missing';
        case 'bridge_missing':
          return 'bridge_missing';
        case 'timed_out':
          return 'timed_out';
        case 'rejected':
          return 'rejected';
        default:
          throw new Error('Failed local machine command updates require a recognized error code.');
      }
    default:
      return 'rejected';
  }
}

export function planLocalMachineBridgeExecution(
  input: PlanLocalMachineBridgeExecutionInput,
): LocalMachineBridgeExecutionPlan {
  const blockedUpdate = (
    status: 'failed' | 'rejected',
    errorCode: 'offline' | 'busy' | 'auth_missing' | 'bridge_missing' | 'timed_out' | 'rejected',
    summary: string,
  ): LocalMachineBridgeExecutionPlan => ({
    executor: 'target_machine_local_codex',
    bridgeIdentifier: input.machine.bridgeIdentifier.trim(),
    accepted: false,
    blockedReason: errorCode,
    updates: [
      buildLocalMachineCommandUpdate({
        commandId: input.envelope.id,
        targetMachineId: input.machine.id,
        owningUserId: input.envelope.owningUserId,
        status,
        errorCode,
        summary,
        createdAt: input.acceptedAt ?? input.envelope.createdAt,
      }),
    ],
  });

  if (input.envelope.targetMachineId.trim() !== input.machine.id.trim()) {
    return blockedUpdate(
      'rejected',
      'rejected',
      'The command target does not match the connected machine bridge.',
    );
  }

  const routingDecision = resolveLocalMachineRoutingDecision({
    owningUserId: input.envelope.owningUserId,
    machineOwnerUserId: input.machine.ownerUserId,
    presence: input.machine.presence,
  });

  if (!routingDecision.ok) {
    if (routingDecision.reason === 'wrong_owner') {
      return blockedUpdate(
        'rejected',
        'rejected',
        'The connected bridge does not belong to the owning zkTalk user.',
      );
    }

    return blockedUpdate(
      'failed',
      routingDecision.reason,
      routingDecision.reason === 'auth_missing'
        ? 'Local Codex auth is missing on the target machine.'
        : routingDecision.reason === 'bridge_missing'
          ? 'The target machine does not have an active local bridge.'
          : routingDecision.reason === 'busy'
            ? 'The target machine is already executing another local command.'
            : 'The target machine is offline.',
    );
  }

  if (input.machine.codexAuthState !== 'auth_present') {
    return blockedUpdate('failed', 'auth_missing', 'Local Codex auth is missing on the target machine.');
  }

  if (input.activeCommandId && input.activeCommandId !== input.envelope.id) {
    return blockedUpdate('failed', 'busy', 'The target machine is already executing another local command.');
  }

  const updates: LocalMachineCommandUpdate[] = [
    buildLocalMachineCommandUpdate({
      commandId: input.envelope.id,
      targetMachineId: input.machine.id,
      owningUserId: input.envelope.owningUserId,
      status: 'accepted',
      summary: 'The target machine bridge accepted the command using local Codex.',
      createdAt: input.acceptedAt ?? input.envelope.createdAt,
    }),
  ];

  for (const [index, chunk] of (input.streamedOutput ?? []).entries()) {
    updates.push(
      buildLocalMachineCommandUpdate({
        commandId: input.envelope.id,
        targetMachineId: input.machine.id,
        owningUserId: input.envelope.owningUserId,
        status: 'streaming',
        outputText: chunk,
        createdAt: input.streamedAt?.[index] ?? input.acceptedAt ?? input.envelope.createdAt,
      }),
    );
  }

  updates.push(
    buildLocalMachineCommandUpdate({
      commandId: input.envelope.id,
      targetMachineId: input.machine.id,
      owningUserId: input.envelope.owningUserId,
      status: 'completed',
      summary:
        input.completionSummary?.trim() ||
        'The target machine bridge completed the command using local Codex.',
      outputText: input.completionOutputText?.trim() || null,
      createdAt: input.completedAt ?? input.acceptedAt ?? input.envelope.createdAt,
    }),
  );

  return {
    executor: 'target_machine_local_codex',
    bridgeIdentifier: input.machine.bridgeIdentifier.trim(),
    accepted: true,
    blockedReason: null,
    updates,
  };
}
