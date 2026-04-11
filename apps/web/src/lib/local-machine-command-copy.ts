import {
  resolveLocalMachineCommandDeliveryState,
  type LocalMachineCommandDeliveryState,
  type LocalMachineCommandUpdate,
} from '@zktalk/shared';

export type LocalMachineCommandTone = 'info' | 'success' | 'warning' | 'danger';

export function getLocalMachineCommandCopyKey(
  update: Pick<LocalMachineCommandUpdate, 'status' | 'errorCode'>,
): string {
  const state = resolveLocalMachineCommandDeliveryState(update);

  switch (state) {
    case 'accepted':
      return 'localMachine.commandAccepted';
    case 'streaming':
      return 'localMachine.commandStreaming';
    case 'completed':
      return 'localMachine.commandCompleted';
    case 'busy':
      return 'localMachine.commandBusy';
    case 'auth_missing':
      return 'localMachine.commandAuthMissing';
    case 'bridge_missing':
      return 'localMachine.commandBridgeMissing';
    case 'offline':
      return 'localMachine.commandOffline';
    case 'rejected':
    default:
      return 'localMachine.commandRejected';
  }
}

export function getLocalMachineCommandTone(
  update: Pick<LocalMachineCommandUpdate, 'status' | 'errorCode'>,
): LocalMachineCommandTone {
  const state: LocalMachineCommandDeliveryState = resolveLocalMachineCommandDeliveryState(update);

  switch (state) {
    case 'accepted':
    case 'streaming':
      return 'info';
    case 'completed':
      return 'success';
    case 'busy':
    case 'offline':
      return 'warning';
    case 'auth_missing':
    case 'bridge_missing':
    case 'rejected':
    default:
      return 'danger';
  }
}

