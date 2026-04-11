import {
  buildLocalMachineCommandEnvelope,
  resolveLocalMachineDispatchAvailability,
  type LocalMachine,
  type LocalMachineAttachmentReference,
  type LocalMachineCommandEnvelope,
  type LocalMachineCommandSource,
  type LocalMachineDispatchBlockReason,
  type LocalMachineDispatchRuntime,
  type LocalMachineSelectedMessageExcerpt,
  type MachineExecutionIntent,
} from '@zktalk/shared';
import { isDesktopRuntime } from '@/lib/runtime-config';

export interface PrepareDesktopLocalMachineDispatchInput {
  commandId: string;
  currentUserId: string;
  machine: Pick<LocalMachine, 'id' | 'ownerUserId' | 'presence'>;
  source: LocalMachineCommandSource;
  instruction: string;
  intent: MachineExecutionIntent;
  selectedMessages?: LocalMachineSelectedMessageExcerpt[];
  attachmentReferences?: LocalMachineAttachmentReference[];
  createdAt?: string;
  runtime?: LocalMachineDispatchRuntime;
}

export type DesktopLocalMachineDispatchPreparation =
  | {
      ok: true;
      envelope: LocalMachineCommandEnvelope;
    }
  | {
      ok: false;
      reason: LocalMachineDispatchBlockReason;
      message: string;
    };

export function getLocalMachineDispatchBlockMessage(
  reason: LocalMachineDispatchBlockReason,
): string {
  switch (reason) {
    case 'desktop_only':
      return 'Local machine commands can only start from the desktop bridge.';
    case 'wrong_owner':
      return 'This machine belongs to a different zkTalk user.';
    case 'busy':
      return 'The selected machine is already running another local command.';
    case 'auth_missing':
      return 'The selected machine is online, but local Codex auth is missing.';
    case 'bridge_missing':
      return 'The selected machine does not have an active local bridge.';
    case 'offline':
    default:
      return 'The selected machine is offline.';
  }
}

function resolveDispatchRuntime(runtime?: LocalMachineDispatchRuntime): LocalMachineDispatchRuntime {
  if (runtime) {
    return runtime;
  }

  return isDesktopRuntime() ? 'desktop' : 'web';
}

export function prepareDesktopLocalMachineDispatch(
  input: PrepareDesktopLocalMachineDispatchInput,
): DesktopLocalMachineDispatchPreparation {
  const availability = resolveLocalMachineDispatchAvailability({
    runtime: resolveDispatchRuntime(input.runtime),
    owningUserId: input.currentUserId,
    machineOwnerUserId: input.machine.ownerUserId,
    presence: input.machine.presence,
  });

  if (!availability.ok) {
    return {
      ok: false,
      reason: availability.reason,
      message: getLocalMachineDispatchBlockMessage(availability.reason),
    };
  }

  return {
    ok: true,
    envelope: buildLocalMachineCommandEnvelope({
      id: input.commandId,
      targetMachineId: input.machine.id,
      owningUserId: input.currentUserId,
      source: input.source,
      instruction: input.instruction,
      intent: input.intent,
      selectedMessages: input.selectedMessages,
      attachmentReferences: input.attachmentReferences,
      createdAt: input.createdAt,
    }),
  };
}
