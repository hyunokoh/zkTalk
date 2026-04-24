import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../agents.repository.js', () => ({
  listDevicesByUser: vi.fn(),
  listAgentsByDeviceIds: vi.fn(),
  findDeviceById: vi.fn(),
  findDeviceByUserSlug: vi.fn(),
  createDevice: vi.fn(),
  updateDevice: vi.fn(),
  recordHeartbeat: vi.fn(),
  markDeviceState: vi.fn(),
  deleteDevice: vi.fn(),
  listAgentsByDevice: vi.fn(),
  findAgentByDeviceSlug: vi.fn(),
  upsertDeviceAgent: vi.fn(),
  listCommandsByRequester: vi.fn(),
  findCommandById: vi.fn(),
  createCommand: vi.fn(),
  updateCommandStatus: vi.fn(),
}));

vi.mock('../../realtime/realtime.service.js', () => ({
  realtimeService: {
    sendToUser: vi.fn(),
  },
}));

import * as agentsService from '../agents.service.js';
import * as repo from '../agents.repository.js';
import { realtimeService } from '../../realtime/realtime.service.js';
import { AppError } from '../../../lib/errors.js';

const mockRepo = vi.mocked(repo);
const mockRealtime = vi.mocked(realtimeService);

const deviceRow = (overrides: Partial<any> = {}): any => ({
  id: 'device-1',
  userId: 'user-1',
  name: 'home-pc',
  slug: 'home-pc',
  platform: 'macos',
  state: 'online',
  lastHeartbeatAt: null,
  lastStateChangedAt: '2026-04-24T00:00:00.000Z',
  sharedWithCommunityId: null,
  sharedAllowedRoleIds: [],
  heartbeat: null,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

const agentRow = (overrides: Partial<any> = {}): any => ({
  id: 'agent-1',
  deviceId: 'device-1',
  agentSlug: 'shell',
  displayName: 'Shell',
  version: '0.1.0',
  defaultVerb: 'exec',
  scopes: [],
  isEnabled: true,
  createdAt: '2026-04-24T00:00:00.000Z',
  updatedAt: '2026-04-24T00:00:00.000Z',
  ...overrides,
});

describe('agents.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('rejects duplicate slug for the same user', async () => {
      mockRepo.findDeviceByUserSlug.mockResolvedValueOnce(deviceRow());
      await expect(
        agentsService.registerDevice('user-1', {
          name: 'home-pc',
          slug: 'home-pc',
          platform: 'macos',
        }),
      ).rejects.toThrow(AppError);
      expect(mockRepo.createDevice).not.toHaveBeenCalled();
    });

    it('creates the device and notifies via realtime', async () => {
      mockRepo.findDeviceByUserSlug.mockResolvedValueOnce(null);
      mockRepo.createDevice.mockResolvedValueOnce(deviceRow());

      const device = await agentsService.registerDevice('user-1', {
        name: 'home-pc',
        slug: 'home-pc',
        platform: 'macos',
      });

      expect(device.slug).toBe('home-pc');
      expect(mockRealtime.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'device.registered',
        expect.objectContaining({ id: 'device-1' }),
      );
    });
  });

  describe('queueCommand', () => {
    it('rejects when the agent is not installed on the target device', async () => {
      mockRepo.findDeviceByUserSlug.mockResolvedValueOnce(deviceRow());
      mockRepo.findAgentByDeviceSlug.mockResolvedValueOnce(null);

      await expect(
        agentsService.queueCommand('user-1', {
          deviceSlug: 'home-pc',
          agentSlug: 'shell',
          rawCommand: '/home-pc.shell ls',
        }),
      ).rejects.toMatchObject({ code: 'AGENT_NOT_INSTALLED' });
      expect(mockRepo.createCommand).not.toHaveBeenCalled();
    });

    it('queues a command and sends a realtime notification to the requester', async () => {
      mockRepo.findDeviceByUserSlug.mockResolvedValueOnce(deviceRow());
      mockRepo.findAgentByDeviceSlug.mockResolvedValueOnce(agentRow());
      mockRepo.createCommand.mockResolvedValueOnce({
        id: 'cmd-1',
        requesterUserId: 'user-1',
        deviceId: 'device-1',
        agentSlug: 'shell',
        verb: 'exec',
        args: 'ls',
        rawCommand: '/home-pc.shell ls',
        channelId: null,
        channelMessageId: null,
        dmConversationId: null,
        status: 'queued',
        approvalPolicy: null,
        approvals: [],
        stdoutTrunc: null,
        stderrTrunc: null,
        exitCode: null,
        queuedAt: '2026-04-24T00:00:00.000Z',
        startedAt: null,
        finishedAt: null,
        createdAt: '2026-04-24T00:00:00.000Z',
      } as any);

      const command = await agentsService.queueCommand('user-1', {
        deviceSlug: 'home-pc',
        agentSlug: 'shell',
        verb: 'exec',
        args: 'ls',
        rawCommand: '/home-pc.shell ls',
      });

      expect(command.id).toBe('cmd-1');
      expect(mockRealtime.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'command.queued',
        expect.objectContaining({ id: 'cmd-1' }),
      );
    });
  });

  describe('recordCommandApproval', () => {
    it('only allows the device owner to decide', async () => {
      mockRepo.findCommandById.mockResolvedValueOnce({
        id: 'cmd-1',
        requesterUserId: 'other-user',
        deviceId: 'device-1',
        agentSlug: 'shell',
        verb: 'exec',
        args: '',
        rawCommand: '',
        channelId: null,
        channelMessageId: null,
        dmConversationId: null,
        status: 'awaiting_approval',
        approvalPolicy: null,
        approvals: [],
        stdoutTrunc: null,
        stderrTrunc: null,
        exitCode: null,
        queuedAt: '2026-04-24T00:00:00.000Z',
        startedAt: null,
        finishedAt: null,
        createdAt: '2026-04-24T00:00:00.000Z',
      } as any);
      mockRepo.findDeviceById.mockResolvedValueOnce(deviceRow({ userId: 'owner-user' }));

      await expect(
        agentsService.recordCommandApproval('not-the-owner', 'cmd-1', 'approved'),
      ).rejects.toMatchObject({ code: 'APPROVAL_FORBIDDEN' });
      expect(mockRepo.updateCommandStatus).not.toHaveBeenCalled();
    });
  });
});
