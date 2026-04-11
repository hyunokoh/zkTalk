import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getLocalMachineDispatchBlockMessage,
  prepareDesktopLocalMachineDispatch,
} from '../local-machine-dispatch';

describe('local-machine-dispatch', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    delete window.zkTalkDesktopConfig;
    delete window.zkTalkDesktop;
  });

  it('blocks dispatch from the normal browser runtime', () => {
    const result = prepareDesktopLocalMachineDispatch({
      commandId: 'command-1',
      currentUserId: 'user-1',
      machine: {
        id: 'machine-1',
        ownerUserId: 'user-1',
        presence: 'online',
      },
      source: {
        kind: 'control',
      },
      instruction: 'Inspect the current release blockers.',
      intent: 'analyze',
      runtime: 'web',
      createdAt: '2026-04-10T09:20:00.000Z',
    });

    expect(result).toEqual({
      ok: false,
      reason: 'desktop_only',
      message: 'Local machine commands can only start from the desktop bridge.',
    });
  });

  it('prepares the first command envelope when desktop runtime and ownership checks pass', () => {
    const result = prepareDesktopLocalMachineDispatch({
      commandId: 'command-2',
      currentUserId: 'user-1',
      machine: {
        id: 'machine-2',
        ownerUserId: 'user-1',
        presence: 'online',
      },
      source: {
        kind: 'control',
      },
      instruction: ' Summarize the selected operator notes. ',
      intent: 'summarize',
      selectedMessages: [
        {
          messageId: 'message-1',
          authorUserId: 'user-3',
          bodyPlaintext: 'Unsigned handoff is ready; signing remains external.',
          createdAt: '2026-04-10T09:00:00.000Z',
        },
      ],
      runtime: 'desktop',
      createdAt: '2026-04-10T09:21:00.000Z',
    });

    expect(result).toEqual({
      ok: true,
      envelope: {
        id: 'command-2',
        targetMachineId: 'machine-2',
        owningUserId: 'user-1',
        source: {
          kind: 'control',
        },
        instruction: 'Summarize the selected operator notes.',
        intent: 'summarize',
        selectedMessages: [
          {
            messageId: 'message-1',
            authorUserId: 'user-3',
            bodyPlaintext: 'Unsigned handoff is ready; signing remains external.',
            createdAt: '2026-04-10T09:00:00.000Z',
          },
        ],
        attachmentReferences: [],
        createdAt: '2026-04-10T09:21:00.000Z',
      },
    });
  });

  it('uses desktop runtime detection when no runtime override is provided', () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.zkTalkDesktopConfig = {
      apiUrl: 'https://desktop-api.example.com',
    };

    const result = prepareDesktopLocalMachineDispatch({
      commandId: 'command-3',
      currentUserId: 'user-1',
      machine: {
        id: 'machine-3',
        ownerUserId: 'user-1',
        presence: 'busy',
      },
      source: {
        kind: 'control',
      },
      instruction: 'Run the verification suite.',
      intent: 'run',
      createdAt: '2026-04-10T09:22:00.000Z',
    });

    expect(result).toEqual({
      ok: false,
      reason: 'busy',
      message: 'The selected machine is already running another local command.',
    });
  });
});

describe('getLocalMachineDispatchBlockMessage', () => {
  it('keeps bridge and auth failures explicit', () => {
    expect(getLocalMachineDispatchBlockMessage('auth_missing')).toContain('local Codex auth');
    expect(getLocalMachineDispatchBlockMessage('bridge_missing')).toContain('active local bridge');
  });

  it('keeps desktop-only, offline, and ownership failures distinct', () => {
    expect(getLocalMachineDispatchBlockMessage('desktop_only')).toContain('desktop bridge');
    expect(getLocalMachineDispatchBlockMessage('offline')).toContain('offline');
    expect(getLocalMachineDispatchBlockMessage('wrong_owner')).toContain('different zkTalk user');
  });
});
