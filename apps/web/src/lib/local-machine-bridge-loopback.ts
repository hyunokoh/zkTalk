import type {
  LocalMachine,
  LocalMachineCommandUpdate,
  LocalMachinePresence,
} from '@zktalk/shared';

import {
  getLocalMachineCommandCopyKey,
  getLocalMachineCommandTone,
  type LocalMachineCommandTone,
} from '@/lib/local-machine-command-copy';

export interface DesktopLocalMachineBridgeSnapshot {
  machine: LocalMachine | null;
  presence: LocalMachinePresence | null;
  lastCommand?: LocalMachineCommandUpdate | null;
  recentCommandUpdates?: LocalMachineCommandUpdate[];
  heartbeatTimeoutMs: number;
  registered: boolean;
}

export interface DesktopLocalMachineCommandDispatchResult {
  accepted: boolean;
  machine: LocalMachine;
  presence: LocalMachinePresence;
  updates: LocalMachineCommandUpdate[];
}

export interface LocalMachineCommandTimelineEntry {
  id: string;
  commandId: string;
  machineId: string;
  machineName: string;
  status: LocalMachineCommandUpdate['status'];
  tone: LocalMachineCommandTone;
  copyKey: string;
  summary: string | null;
  outputText: string | null;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isLocalMachine(value: unknown): value is LocalMachine {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.ownerUserId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.type === 'string' &&
    typeof value.bridgeIdentifier === 'string' &&
    typeof value.codexAuthState === 'string' &&
    typeof value.presence === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isLocalMachinePresence(value: unknown): value is LocalMachinePresence {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.machineId === 'string' &&
    typeof value.ownerUserId === 'string' &&
    typeof value.status === 'string' &&
    typeof value.codexAuthState === 'string' &&
    (typeof value.activeCommandId === 'string' || value.activeCommandId === null) &&
    (typeof value.lastSeenAt === 'string' || value.lastSeenAt === null) &&
    (typeof value.expiresAt === 'string' || value.expiresAt === null)
  );
}

function isLocalMachineCommandUpdate(value: unknown): value is LocalMachineCommandUpdate {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.commandId === 'string' &&
    typeof value.targetMachineId === 'string' &&
    typeof value.owningUserId === 'string' &&
    typeof value.status === 'string' &&
    (typeof value.summary === 'string' || value.summary === null) &&
    (typeof value.outputText === 'string' || value.outputText === null) &&
    (typeof value.errorCode === 'string' || value.errorCode === null) &&
    typeof value.createdAt === 'string'
  );
}

function isBridgeSnapshot(value: unknown): value is DesktopLocalMachineBridgeSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as Partial<DesktopLocalMachineBridgeSnapshot>;
  return (
    typeof candidate.heartbeatTimeoutMs === 'number' &&
    typeof candidate.registered === 'boolean' &&
    (candidate.machine === null || isLocalMachine(candidate.machine)) &&
    (candidate.presence === null || isLocalMachinePresence(candidate.presence)) &&
    (candidate.lastCommand === undefined ||
      candidate.lastCommand === null ||
      isLocalMachineCommandUpdate(candidate.lastCommand)) &&
    (candidate.recentCommandUpdates === undefined ||
      (Array.isArray(candidate.recentCommandUpdates) &&
        candidate.recentCommandUpdates.every((item) => isLocalMachineCommandUpdate(item))))
  );
}

export function normalizeDesktopLocalMachineCommandDispatchResult(
  value: unknown,
): DesktopLocalMachineCommandDispatchResult | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.accepted !== 'boolean' ||
    !isLocalMachine(value.machine) ||
    !isLocalMachinePresence(value.presence) ||
    !Array.isArray(value.updates) ||
    !value.updates.every((item) => isLocalMachineCommandUpdate(item))
  ) {
    return null;
  }

  return {
    accepted: value.accepted,
    machine: value.machine,
    presence: value.presence,
    updates: value.updates,
  };
}

export function buildDesktopLocalMachineCommandTimelineEntries(input: {
  machine: Pick<LocalMachine, 'id' | 'name'>;
  updates: LocalMachineCommandUpdate[];
}): LocalMachineCommandTimelineEntry[] {
  return input.updates.map((update, index) => ({
    id: `${update.commandId}:${update.createdAt}:${index}`,
    commandId: update.commandId,
    machineId: input.machine.id,
    machineName: input.machine.name,
    status: update.status,
    tone: getLocalMachineCommandTone(update),
    copyKey: getLocalMachineCommandCopyKey(update),
    summary: update.summary,
    outputText: update.outputText,
    createdAt: update.createdAt,
  }));
}

export function buildDesktopLocalMachineLastCommandEntry(
  snapshot: DesktopLocalMachineBridgeSnapshot,
): LocalMachineCommandTimelineEntry | null {
  if (!snapshot.machine || !snapshot.lastCommand) {
    return null;
  }

  return (
    buildDesktopLocalMachineCommandTimelineEntries({
      machine: snapshot.machine,
      updates: [snapshot.lastCommand],
    })[0] ?? null
  );
}

export async function readDesktopLocalMachineBridgeState(): Promise<DesktopLocalMachineBridgeSnapshot | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const snapshot = await window.zkTalkDesktop?.getLocalMachineBridgeState?.();
  return isBridgeSnapshot(snapshot) ? snapshot : null;
}

export async function ensureDesktopLocalMachineBridgeOnline(input: {
  ownerUserId: string;
  name?: string;
  type?: 'desktop' | 'laptop' | 'buildbox' | 'other';
}): Promise<DesktopLocalMachineBridgeSnapshot | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const snapshot = await window.zkTalkDesktop?.ensureLocalMachineOnline?.(input);
  return isBridgeSnapshot(snapshot) ? snapshot : null;
}

export async function disconnectDesktopLocalMachineBridge(input?: {
  ownerUserId?: string;
}): Promise<DesktopLocalMachineBridgeSnapshot | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const snapshot = await window.zkTalkDesktop?.disconnectLocalMachineBridge?.(input);
  return isBridgeSnapshot(snapshot) ? snapshot : null;
}
