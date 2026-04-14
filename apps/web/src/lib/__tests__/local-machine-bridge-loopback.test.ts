import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildDesktopLocalMachineCommandTimelineEntries,
  buildDesktopLocalMachineLastCommandEntry,
  disconnectDesktopLocalMachineBridge,
  normalizeDesktopLocalMachineCommandDispatchResult,
  readDesktopLocalMachineBridgeState,
} from '../local-machine-bridge-loopback';

describe('local-machine-bridge-loopback', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.zkTalkDesktop;
  });

  it('returns null when the desktop bridge API is unavailable', async () => {
    await expect(readDesktopLocalMachineBridgeState()).resolves.toBeNull();
    await expect(disconnectDesktopLocalMachineBridge()).resolves.toBeNull();
  });

  it('returns the typed desktop bridge snapshot when the desktop preload exposes it', async () => {
    window.zkTalkDesktop = {
      getLocalMachineBridgeState: vi.fn().mockResolvedValue({
        machine: {
          id: 'machine-1',
          ownerUserId: 'user-1',
          name: 'Operator Desktop',
          type: 'desktop',
          bridgeIdentifier: 'bridge-public-id-1',
          codexAuthState: 'auth_present',
          presence: 'online',
          lastSeenAt: '2026-04-12T14:00:10.000Z',
          createdAt: '2026-04-12T14:00:00.000Z',
          updatedAt: '2026-04-12T14:00:10.000Z',
        },
        presence: {
          machineId: 'machine-1',
          ownerUserId: 'user-1',
          status: 'online',
          codexAuthState: 'auth_present',
          activeCommandId: null,
          lastSeenAt: '2026-04-12T14:00:10.000Z',
          expiresAt: '2026-04-12T14:01:10.000Z',
        },
        lastCommand: {
          commandId: 'command-7',
          targetMachineId: 'machine-1',
          owningUserId: 'user-1',
          status: 'completed',
          summary: 'Bridge completed the command.',
          outputText: 'final output',
          errorCode: null,
          createdAt: '2026-04-12T14:00:11.000Z',
        },
        recentCommandUpdates: [
          {
            commandId: 'command-7',
            targetMachineId: 'machine-1',
            owningUserId: 'user-1',
            status: 'accepted',
            summary: 'Bridge accepted the command.',
            outputText: null,
            errorCode: null,
            createdAt: '2026-04-12T14:00:10.000Z',
          },
          {
            commandId: 'command-7',
            targetMachineId: 'machine-1',
            owningUserId: 'user-1',
            status: 'completed',
            summary: 'Bridge completed the command.',
            outputText: 'final output',
            errorCode: null,
            createdAt: '2026-04-12T14:00:11.000Z',
          },
        ],
        heartbeatTimeoutMs: 60000,
        registered: true,
      }),
    };

    await expect(readDesktopLocalMachineBridgeState()).resolves.toMatchObject({
      registered: true,
      heartbeatTimeoutMs: 60000,
      machine: {
        id: 'machine-1',
        presence: 'online',
      },
      presence: {
        status: 'online',
      },
      recentCommandUpdates: expect.arrayContaining([
        expect.objectContaining({
          commandId: 'command-7',
          status: 'accepted',
        }),
      ]),
    });
  });

  it('normalizes a desktop dispatch result into UI-ready command timeline entries', () => {
    const normalized = normalizeDesktopLocalMachineCommandDispatchResult({
      accepted: true,
      machine: {
        id: 'machine-2',
        ownerUserId: 'user-1',
        name: 'Mac Studio',
        type: 'desktop',
        bridgeIdentifier: 'bridge-public-id-2',
        codexAuthState: 'auth_present',
        presence: 'online',
        lastSeenAt: '2026-04-12T14:01:10.000Z',
        createdAt: '2026-04-12T14:00:00.000Z',
        updatedAt: '2026-04-12T14:01:10.000Z',
      },
      presence: {
        machineId: 'machine-2',
        ownerUserId: 'user-1',
        status: 'online',
        codexAuthState: 'auth_present',
        activeCommandId: null,
        lastSeenAt: '2026-04-12T14:01:10.000Z',
        expiresAt: '2026-04-12T14:02:10.000Z',
      },
      updates: [
        {
          commandId: 'command-2',
          targetMachineId: 'machine-2',
          owningUserId: 'user-1',
          status: 'accepted',
          summary: 'Accepted the command.',
          outputText: null,
          errorCode: null,
          createdAt: '2026-04-12T14:01:00.000Z',
        },
        {
          commandId: 'command-2',
          targetMachineId: 'machine-2',
          owningUserId: 'user-1',
          status: 'streaming',
          summary: null,
          outputText: 'partial output',
          errorCode: null,
          createdAt: '2026-04-12T14:01:05.000Z',
        },
        {
          commandId: 'command-2',
          targetMachineId: 'machine-2',
          owningUserId: 'user-1',
          status: 'completed',
          summary: 'Completed the command.',
          outputText: 'final output',
          errorCode: null,
          createdAt: '2026-04-12T14:01:10.000Z',
        },
      ],
    });

    expect(normalized).toMatchObject({
      accepted: true,
      machine: {
        id: 'machine-2',
        name: 'Mac Studio',
      },
    });

    const entries = buildDesktopLocalMachineCommandTimelineEntries({
      machine: normalized!.machine,
      updates: normalized!.updates,
    });

    expect(entries).toEqual([
      expect.objectContaining({
        commandId: 'command-2',
        machineId: 'machine-2',
        machineName: 'Mac Studio',
        status: 'accepted',
        tone: 'info',
        copyKey: 'localMachine.commandAccepted',
      }),
      expect.objectContaining({
        commandId: 'command-2',
        machineId: 'machine-2',
        machineName: 'Mac Studio',
        status: 'streaming',
        outputText: 'partial output',
        tone: 'info',
        copyKey: 'localMachine.commandStreaming',
      }),
      expect.objectContaining({
        commandId: 'command-2',
        machineId: 'machine-2',
        machineName: 'Mac Studio',
        status: 'completed',
        summary: 'Completed the command.',
        tone: 'success',
        copyKey: 'localMachine.commandCompleted',
      }),
    ]);
  });

  it('builds a last-command entry with explicit machine and failure attribution', () => {
    const entry = buildDesktopLocalMachineLastCommandEntry({
      machine: {
        id: 'machine-3',
        ownerUserId: 'user-1',
        name: 'Buildbox',
        type: 'buildbox',
        bridgeIdentifier: 'bridge-public-id-3',
        codexAuthState: 'auth_present',
        presence: 'online',
        lastSeenAt: '2026-04-12T14:02:10.000Z',
        createdAt: '2026-04-12T14:00:00.000Z',
        updatedAt: '2026-04-12T14:02:10.000Z',
      },
      presence: {
        machineId: 'machine-3',
        ownerUserId: 'user-1',
        status: 'online',
        codexAuthState: 'auth_present',
        activeCommandId: null,
        lastSeenAt: '2026-04-12T14:02:10.000Z',
        expiresAt: '2026-04-12T14:03:10.000Z',
      },
      lastCommand: {
        commandId: 'command-3',
        targetMachineId: 'machine-3',
        owningUserId: 'user-1',
        status: 'failed',
        summary: 'Local Codex auth is missing on the target machine.',
        outputText: null,
        errorCode: 'auth_missing',
        createdAt: '2026-04-12T14:02:00.000Z',
      },
      heartbeatTimeoutMs: 60000,
      registered: true,
    });

    expect(entry).toMatchObject({
      commandId: 'command-3',
      machineId: 'machine-3',
      machineName: 'Buildbox',
      status: 'failed',
      tone: 'danger',
      copyKey: 'localMachine.commandAuthMissing',
    });
  });

  it('normalizes a disconnect snapshot from the desktop preload bridge API', async () => {
    window.zkTalkDesktop = {
      disconnectLocalMachineBridge: vi.fn().mockResolvedValue({
        machine: {
          id: 'machine-4',
          ownerUserId: 'user-4',
          name: 'Laptop',
          type: 'laptop',
          bridgeIdentifier: 'bridge-public-id-4',
          codexAuthState: 'auth_present',
          presence: 'bridge_missing',
          lastSeenAt: '2026-04-12T14:05:10.000Z',
          createdAt: '2026-04-12T14:00:00.000Z',
          updatedAt: '2026-04-12T14:05:20.000Z',
        },
        presence: {
          machineId: 'machine-4',
          ownerUserId: 'user-4',
          status: 'bridge_missing',
          codexAuthState: 'auth_present',
          activeCommandId: null,
          lastSeenAt: '2026-04-12T14:05:10.000Z',
          expiresAt: '2026-04-12T14:05:20.000Z',
        },
        heartbeatTimeoutMs: 60000,
        registered: true,
      }),
    };

    await expect(disconnectDesktopLocalMachineBridge({ ownerUserId: 'user-4' })).resolves.toMatchObject(
      {
        registered: true,
        presence: {
          status: 'bridge_missing',
          lastSeenAt: '2026-04-12T14:05:10.000Z',
        },
      },
    );
  });
});
