import { describe, expect, it } from 'vitest';
import {
  buildLocalMachineCommandEnvelope,
  buildLocalMachineCommandUpdate,
  isMachinePresenceRunnable,
  normalizeMachineName,
  planLocalMachineBridgeExecution,
  resolveLocalMachineHeartbeatPresence,
  resolveLocalMachineCommandDeliveryState,
  resolveLocalMachineDispatchAvailability,
  resolveLocalMachineRoutingDecision,
} from '../utils/local-machine-bridge';
import { WebSocketEvent } from '../constants/index.js';

describe('normalizeMachineName', () => {
  it('normalizes free-form labels into addressable machine names', () => {
    expect(normalizeMachineName(' Mac Studio ')).toBe('mac-studio');
    expect(normalizeMachineName('Buildbox #01')).toBe('buildbox-01');
  });

  it('falls back when the label has no routable characters', () => {
    expect(normalizeMachineName('@@@')).toBe('machine');
  });
});

describe('resolveLocalMachineRoutingDecision', () => {
  it('allows routing only to the owning user machine when presence is online', () => {
    expect(
      resolveLocalMachineRoutingDecision({
        owningUserId: 'user-1',
        machineOwnerUserId: 'user-1',
        presence: 'online',
      }),
    ).toEqual({ ok: true, reason: 'online' });
  });

  it('keeps owner mismatch and bridge failure states explicit', () => {
    expect(
      resolveLocalMachineRoutingDecision({
        owningUserId: 'user-1',
        machineOwnerUserId: 'user-2',
        presence: 'online',
      }),
    ).toEqual({ ok: false, reason: 'wrong_owner' });

    expect(
      resolveLocalMachineRoutingDecision({
        owningUserId: 'user-1',
        machineOwnerUserId: 'user-1',
        presence: 'auth_missing',
      }),
    ).toEqual({ ok: false, reason: 'auth_missing' });

    expect(isMachinePresenceRunnable('busy')).toBe(false);
  });
});

describe('resolveLocalMachineDispatchAvailability', () => {
  it('blocks non-desktop runtimes before routing', () => {
    expect(
      resolveLocalMachineDispatchAvailability({
        runtime: 'web',
        owningUserId: 'user-1',
        machineOwnerUserId: 'user-1',
        presence: 'online',
      }),
    ).toEqual({ ok: false, reason: 'desktop_only' });
  });

  it('keeps machine failure states explicit for desktop dispatch', () => {
    expect(
      resolveLocalMachineDispatchAvailability({
        runtime: 'desktop',
        owningUserId: 'user-1',
        machineOwnerUserId: 'user-1',
        presence: 'busy',
      }),
    ).toEqual({ ok: false, reason: 'busy' });
  });
});

describe('resolveLocalMachineHeartbeatPresence', () => {
  it('keeps bridge registration, auth, and active-command states explicit', () => {
    expect(
      resolveLocalMachineHeartbeatPresence({
        bridgeIdentifier: 'bridge-1',
        codexAuthState: 'auth_present',
        lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
        now: '2026-04-12T14:00:30.000Z',
      }),
    ).toEqual({
      status: 'online',
      codexAuthState: 'auth_present',
      activeCommandId: null,
      lastSeenAt: '2026-04-12T14:00:00.000Z',
      expiresAt: '2026-04-12T14:01:00.000Z',
    });

    expect(
      resolveLocalMachineHeartbeatPresence({
        bridgeIdentifier: 'bridge-1',
        codexAuthState: 'auth_present',
        activeCommandId: 'command-1',
        lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
        now: '2026-04-12T14:00:30.000Z',
      }),
    ).toMatchObject({
      status: 'busy',
      activeCommandId: 'command-1',
    });

    expect(
      resolveLocalMachineHeartbeatPresence({
        bridgeIdentifier: 'bridge-1',
        codexAuthState: 'auth_missing',
        lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
        now: '2026-04-12T14:00:30.000Z',
      }),
    ).toMatchObject({
      status: 'auth_missing',
      codexAuthState: 'auth_missing',
    });
  });

  it('fails closed to bridge_missing when registration or heartbeat proof is absent/stale', () => {
    expect(
      resolveLocalMachineHeartbeatPresence({
        bridgeIdentifier: '',
        codexAuthState: 'auth_present',
        now: '2026-04-12T14:00:30.000Z',
      }),
    ).toMatchObject({
      status: 'bridge_missing',
      expiresAt: null,
    });

    expect(
      resolveLocalMachineHeartbeatPresence({
        bridgeIdentifier: 'bridge-2',
        codexAuthState: 'auth_present',
        lastHeartbeatAt: '2026-04-12T14:00:00.000Z',
        now: '2026-04-12T14:01:01.000Z',
      }),
    ).toMatchObject({
      status: 'bridge_missing',
      expiresAt: '2026-04-12T14:01:00.000Z',
    });
  });
});

describe('buildLocalMachineCommandEnvelope', () => {
  it('creates a stable first dispatch envelope without mutating optional arrays', () => {
    const selectedMessages = [
      {
        messageId: 'message-1',
        authorUserId: 'user-2',
        bodyPlaintext: 'Inspect the failing desktop handshake.',
        createdAt: '2026-04-10T09:00:00.000Z',
      },
    ];
    const attachmentReferences = [
      {
        attachmentId: 'attachment-1',
        fileName: 'operator-note.txt',
        mimeType: 'text/plain',
        downloadUrl: 'https://example.com/operator-note.txt',
      },
    ];

    const envelope = buildLocalMachineCommandEnvelope({
      id: ' command-1 ',
      targetMachineId: ' machine-1 ',
      owningUserId: ' user-1 ',
      source: {
        kind: 'control',
      },
      instruction: ' Summarize the selected evidence and propose the next command. ',
      intent: 'summarize',
      selectedMessages,
      attachmentReferences,
      createdAt: '2026-04-10T09:05:00.000Z',
    });

    expect(envelope).toEqual({
      id: 'command-1',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      source: {
        kind: 'control',
      },
      instruction: 'Summarize the selected evidence and propose the next command.',
      intent: 'summarize',
      selectedMessages,
      attachmentReferences,
      createdAt: '2026-04-10T09:05:00.000Z',
    });
    expect(envelope.selectedMessages).not.toBe(selectedMessages);
    expect(envelope.attachmentReferences).not.toBe(attachmentReferences);
  });
});

describe('buildLocalMachineCommandUpdate', () => {
  it('creates stable accepted, streaming, and completed result-delivery updates', () => {
    expect(
      buildLocalMachineCommandUpdate({
        commandId: ' command-1 ',
        targetMachineId: ' machine-1 ',
        owningUserId: ' user-1 ',
        status: 'accepted',
        summary: ' Worker accepted the command. ',
        createdAt: '2026-04-10T10:00:00.000Z',
      }),
    ).toEqual({
      commandId: 'command-1',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      status: 'accepted',
      summary: 'Worker accepted the command.',
      outputText: null,
      errorCode: null,
      createdAt: '2026-04-10T10:00:00.000Z',
    });

    expect(
      buildLocalMachineCommandUpdate({
        commandId: 'command-1',
        targetMachineId: 'machine-1',
        owningUserId: 'user-1',
        status: 'streaming',
        outputText: ' partial output ',
        createdAt: '2026-04-10T10:01:00.000Z',
      }),
    ).toEqual({
      commandId: 'command-1',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      status: 'streaming',
      summary: null,
      outputText: 'partial output',
      errorCode: null,
      createdAt: '2026-04-10T10:01:00.000Z',
    });

    expect(
      buildLocalMachineCommandUpdate({
        commandId: 'command-1',
        targetMachineId: 'machine-1',
        owningUserId: 'user-1',
        status: 'completed',
        summary: ' Completed summary ',
        outputText: ' Final output ',
        createdAt: '2026-04-10T10:02:00.000Z',
      }),
    ).toEqual({
      commandId: 'command-1',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      status: 'completed',
      summary: 'Completed summary',
      outputText: 'Final output',
      errorCode: null,
      createdAt: '2026-04-10T10:02:00.000Z',
    });

    expect(
      buildLocalMachineCommandUpdate({
        commandId: 'command-1',
        targetMachineId: 'machine-1',
        owningUserId: 'user-1',
        status: 'failed',
        summary: 'Local Codex command timed out.',
        outputText: 'Partial output before timeout',
        errorCode: 'timed_out',
        createdAt: '2026-04-10T10:03:00.000Z',
      }),
    ).toEqual({
      commandId: 'command-1',
      targetMachineId: 'machine-1',
      owningUserId: 'user-1',
      status: 'failed',
      summary: 'Local Codex command timed out.',
      outputText: 'Partial output before timeout',
      errorCode: 'timed_out',
      createdAt: '2026-04-10T10:03:00.000Z',
    });
  });

  it('keeps offline, busy, auth-missing, and rejected failures explicit', () => {
    expect(
      buildLocalMachineCommandUpdate({
        commandId: 'command-2',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
        errorCode: 'offline',
        summary: 'Machine is not reachable.',
        createdAt: '2026-04-10T10:03:00.000Z',
      }),
    ).toMatchObject({
      status: 'failed',
      errorCode: 'offline',
      summary: 'Machine is not reachable.',
    });

    expect(
      buildLocalMachineCommandUpdate({
        commandId: 'command-3',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
        errorCode: 'busy',
        summary: 'Machine is already working.',
        createdAt: '2026-04-10T10:04:00.000Z',
      }),
    ).toMatchObject({
      status: 'failed',
      errorCode: 'busy',
      summary: 'Machine is already working.',
    });

    expect(
      buildLocalMachineCommandUpdate({
        commandId: 'command-4',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
        errorCode: 'auth_missing',
        summary: 'Local Codex auth is missing.',
        createdAt: '2026-04-10T10:05:00.000Z',
      }),
    ).toMatchObject({
      status: 'failed',
      errorCode: 'auth_missing',
      summary: 'Local Codex auth is missing.',
    });

    expect(
      buildLocalMachineCommandUpdate({
        commandId: 'command-5',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'rejected',
        errorCode: 'rejected',
        summary: 'Policy rejected the command.',
        createdAt: '2026-04-10T10:06:00.000Z',
      }),
    ).toMatchObject({
      status: 'rejected',
      errorCode: 'rejected',
      summary: 'Policy rejected the command.',
    });
  });

  it('rejects impossible status and error combinations', () => {
    expect(() =>
      buildLocalMachineCommandUpdate({
        commandId: 'command-6',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'accepted',
        errorCode: 'busy',
      }),
    ).toThrow(/cannot include an error code/i);

    expect(() =>
      buildLocalMachineCommandUpdate({
        commandId: 'command-7',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
      }),
    ).toThrow(/require an explicit error code/i);

    expect(() =>
      buildLocalMachineCommandUpdate({
        commandId: 'command-8',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'rejected',
        errorCode: 'offline',
      }),
    ).toThrow(/must use the "rejected" error code/i);

    expect(() =>
      buildLocalMachineCommandUpdate({
        commandId: 'command-9',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        status: 'failed',
        errorCode: 'rejected',
      }),
    ).toThrow(/cannot use the "rejected" error code/i);
  });

  it('resolves the explicit delivery state surface from command updates', () => {
    expect(
      resolveLocalMachineCommandDeliveryState({
        status: 'accepted',
        errorCode: null,
      }),
    ).toBe('accepted');

    expect(
      resolveLocalMachineCommandDeliveryState({
        status: 'streaming',
        errorCode: null,
      }),
    ).toBe('streaming');

    expect(
      resolveLocalMachineCommandDeliveryState({
        status: 'completed',
        errorCode: null,
      }),
    ).toBe('completed');

    expect(
      resolveLocalMachineCommandDeliveryState({
        status: 'failed',
        errorCode: 'offline',
      }),
    ).toBe('offline');

    expect(
      resolveLocalMachineCommandDeliveryState({
        status: 'failed',
        errorCode: 'busy',
      }),
    ).toBe('busy');

    expect(
      resolveLocalMachineCommandDeliveryState({
        status: 'failed',
        errorCode: 'auth_missing',
      }),
    ).toBe('auth_missing');

    expect(
      resolveLocalMachineCommandDeliveryState({
        status: 'failed',
        errorCode: 'timed_out',
      }),
    ).toBe('timed_out');
  });
});

describe('planLocalMachineBridgeExecution', () => {
  it('models accepted, streaming, and completed updates through the target machine local Codex session', () => {
    const plan = planLocalMachineBridgeExecution({
      envelope: buildLocalMachineCommandEnvelope({
        id: 'command-10',
        targetMachineId: 'machine-10',
        owningUserId: 'user-1',
        source: {
          kind: 'control',
        },
        instruction: 'Inspect the current release blockers and summarize the next operator action.',
        intent: 'analyze',
        createdAt: '2026-04-10T11:00:00.000Z',
      }),
      machine: {
        id: 'machine-10',
        ownerUserId: 'user-1',
        bridgeIdentifier: 'bridge-public-id-999',
        codexAuthState: 'auth_present',
        presence: 'online',
      },
      streamedOutput: ['partial summary', 'next command suggestion'],
      completionSummary: 'Completed operator summary.',
      completionOutputText: 'Run verify, then capture the remaining signing blockers.',
      acceptedAt: '2026-04-10T11:01:00.000Z',
      streamedAt: ['2026-04-10T11:01:05.000Z', '2026-04-10T11:01:08.000Z'],
      completedAt: '2026-04-10T11:01:20.000Z',
    });

    expect(plan.executor).toBe('target_machine_local_codex');
    expect(plan.bridgeIdentifier).toBe('bridge-public-id-999');
    expect(plan.accepted).toBe(true);
    expect(plan.blockedReason).toBeNull();
    expect(plan.updates).toEqual([
      {
        commandId: 'command-10',
        targetMachineId: 'machine-10',
        owningUserId: 'user-1',
        status: 'accepted',
        summary: 'The target machine bridge accepted the command using local Codex.',
        outputText: null,
        errorCode: null,
        createdAt: '2026-04-10T11:01:00.000Z',
      },
      {
        commandId: 'command-10',
        targetMachineId: 'machine-10',
        owningUserId: 'user-1',
        status: 'streaming',
        summary: null,
        outputText: 'partial summary',
        errorCode: null,
        createdAt: '2026-04-10T11:01:05.000Z',
      },
      {
        commandId: 'command-10',
        targetMachineId: 'machine-10',
        owningUserId: 'user-1',
        status: 'streaming',
        summary: null,
        outputText: 'next command suggestion',
        errorCode: null,
        createdAt: '2026-04-10T11:01:08.000Z',
      },
      {
        commandId: 'command-10',
        targetMachineId: 'machine-10',
        owningUserId: 'user-1',
        status: 'completed',
        summary: 'Completed operator summary.',
        outputText: 'Run verify, then capture the remaining signing blockers.',
        errorCode: null,
        createdAt: '2026-04-10T11:01:20.000Z',
      },
    ]);
  });

  it('keeps owner mismatch, busy, and local auth gaps explicit before any fake cloud fallback appears', () => {
    const envelope = buildLocalMachineCommandEnvelope({
      id: 'command-11',
      targetMachineId: 'machine-11',
      owningUserId: 'user-1',
      source: {
        kind: 'control',
      },
      instruction: 'Run the local bridge smoke.',
      intent: 'run',
      createdAt: '2026-04-10T11:05:00.000Z',
    });

    expect(
      planLocalMachineBridgeExecution({
        envelope,
        machine: {
          id: 'machine-11',
          ownerUserId: 'user-2',
          bridgeIdentifier: 'bridge-public-id-1000',
          codexAuthState: 'auth_present',
          presence: 'online',
        },
      }),
    ).toMatchObject({
      executor: 'target_machine_local_codex',
      accepted: false,
      blockedReason: 'rejected',
      updates: [
        {
          status: 'rejected',
          errorCode: 'rejected',
        },
      ],
    });

    expect(
      planLocalMachineBridgeExecution({
        envelope,
        machine: {
          id: 'machine-11',
          ownerUserId: 'user-1',
          bridgeIdentifier: 'bridge-public-id-1001',
          codexAuthState: 'auth_present',
          presence: 'online',
        },
        activeCommandId: 'command-in-flight',
      }),
    ).toMatchObject({
      accepted: false,
      blockedReason: 'busy',
      updates: [
        {
          status: 'failed',
          errorCode: 'busy',
        },
      ],
    });

    expect(
      planLocalMachineBridgeExecution({
        envelope,
        machine: {
          id: 'machine-11',
          ownerUserId: 'user-1',
          bridgeIdentifier: 'bridge-public-id-1002',
          codexAuthState: 'auth_missing',
          presence: 'online',
        },
      }),
    ).toMatchObject({
      accepted: false,
      blockedReason: 'auth_missing',
      updates: [
        {
          status: 'failed',
          errorCode: 'auth_missing',
          summary: 'Local Codex auth is missing on the target machine.',
        },
      ],
    });
  });
});

describe('machine websocket events', () => {
  it('exposes stable event names for registration, presence, and command updates', () => {
    expect(WebSocketEvent.MACHINE_REGISTERED).toBe('machine.registered');
    expect(WebSocketEvent.MACHINE_PRESENCE_UPDATED).toBe('machine.presence.updated');
    expect(WebSocketEvent.MACHINE_COMMAND_UPDATED).toBe('machine.command.updated');
  });
});
