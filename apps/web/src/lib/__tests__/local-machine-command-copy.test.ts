import { describe, expect, it } from 'vitest';
import {
  getLocalMachineCommandCopyKey,
  getLocalMachineCommandTone,
} from '../local-machine-command-copy';

describe('local-machine-command-copy', () => {
  it('maps accepted, streaming, and completed updates to explicit product copy keys', () => {
    expect(
      getLocalMachineCommandCopyKey({
        status: 'accepted',
        errorCode: null,
      }),
    ).toBe('localMachine.commandAccepted');

    expect(
      getLocalMachineCommandCopyKey({
        status: 'streaming',
        errorCode: null,
      }),
    ).toBe('localMachine.commandStreaming');

    expect(
      getLocalMachineCommandCopyKey({
        status: 'completed',
        errorCode: null,
      }),
    ).toBe('localMachine.commandCompleted');
  });

  it('keeps offline, busy, auth-missing, bridge-missing, and rejected failures distinct', () => {
    expect(
      getLocalMachineCommandCopyKey({
        status: 'failed',
        errorCode: 'offline',
      }),
    ).toBe('localMachine.commandOffline');

    expect(
      getLocalMachineCommandCopyKey({
        status: 'failed',
        errorCode: 'busy',
      }),
    ).toBe('localMachine.commandBusy');

    expect(
      getLocalMachineCommandCopyKey({
        status: 'failed',
        errorCode: 'auth_missing',
      }),
    ).toBe('localMachine.commandAuthMissing');

    expect(
      getLocalMachineCommandCopyKey({
        status: 'failed',
        errorCode: 'bridge_missing',
      }),
    ).toBe('localMachine.commandBridgeMissing');

    expect(
      getLocalMachineCommandCopyKey({
        status: 'rejected',
        errorCode: 'rejected',
      }),
    ).toBe('localMachine.commandRejected');
  });

  it('assigns inspectable UI tones without collapsing failure states into success', () => {
    expect(
      getLocalMachineCommandTone({
        status: 'accepted',
        errorCode: null,
      }),
    ).toBe('info');

    expect(
      getLocalMachineCommandTone({
        status: 'completed',
        errorCode: null,
      }),
    ).toBe('success');

    expect(
      getLocalMachineCommandTone({
        status: 'failed',
        errorCode: 'offline',
      }),
    ).toBe('warning');

    expect(
      getLocalMachineCommandTone({
        status: 'failed',
        errorCode: 'auth_missing',
      }),
    ).toBe('danger');
  });
});
