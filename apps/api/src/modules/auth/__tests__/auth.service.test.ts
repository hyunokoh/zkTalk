import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jose from 'jose';
import { getMagicLinkSecretBytes } from '../../../lib/env.js';

vi.mock('../../../lib/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
  },
}));

// Mock the repository
vi.mock('../auth.repository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  upsertUserKey: vi.fn(),
  getUserKey: vi.fn(),
  findAuthMethod: vi.fn(),
  createAuthMethod: vi.fn(),
  findAuthMethodsByUserId: vi.fn().mockResolvedValue([]),
  findAuthMethodById: vi.fn(),
  deleteAuthMethod: vi.fn(),
  countAuthMethodsByUserId: vi.fn().mockResolvedValue(1),
  createOtpCode: vi.fn(),
  findValidOtpCode: vi.fn(),
  markOtpCodeUsed: vi.fn(),
  countRecentOtpCodes: vi.fn().mockResolvedValue(0),
  ensureUserSettings: vi.fn(),
  upsertUserSettings: vi.fn(),
  parseCommunityOrder: vi.fn(),
  parseLastVisited: vi.fn(),
  parseTranslationDisplay: vi.fn(),
}));

// Mock the auth middleware
vi.mock('../../../middleware/auth.js', () => ({
  createSessionToken: vi.fn().mockResolvedValue('mock-session-token'),
}));

vi.mock('../../channel/channel-access.service.js', () => ({
  assertCanAccessChannel: vi.fn().mockResolvedValue({ id: 'channel-9' }),
}));

vi.mock('../../dm/dm.repository.js', () => ({
  isParticipant: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../community/community.repository.js', () => ({
  findById: vi.fn(),
  findMembership: vi.fn(),
}));

import * as authService from '../auth.service.js';
import {
  createUser,
  ensureUserSettings,
  findUserByEmail,
  findUserById,
  parseCommunityOrder,
  parseTranslationDisplay,
  upsertUserSettings,
} from '../auth.repository.js';
import { createSessionToken } from '../../../middleware/auth.js';
import { assertCanAccessChannel } from '../../channel/channel-access.service.js';
import { isParticipant } from '../../dm/dm.repository.js';
import { findById, findMembership } from '../../community/community.repository.js';

const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockFindUserById = vi.mocked(findUserById);
const mockCreateUser = vi.mocked(createUser);
const mockEnsureUserSettings = vi.mocked(ensureUserSettings);
const mockUpsertUserSettings = vi.mocked(upsertUserSettings);
const mockParseCommunityOrder = vi.mocked(parseCommunityOrder);
const mockParseTranslationDisplay = vi.mocked(parseTranslationDisplay);
const mockCreateSessionToken = vi.mocked(createSessionToken);
const mockAssertCanAccessChannel = vi.mocked(assertCanAccessChannel);
const mockIsParticipant = vi.mocked(isParticipant);
const mockFindCommunityById = vi.mocked(findById);
const mockFindCommunityMembership = vi.mocked(findMembership);

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestMagicLink', () => {
    it('should return a valid JWT token for the given email', async () => {
      const email = 'test@example.com';
      const token = await authService.requestMagicLink(email);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token is a valid JWT containing the email
      const { payload } = await jose.jwtVerify(token, getMagicLinkSecretBytes(), {
        issuer: 'zktalk',
        audience: 'zktalk-magic-link',
      });

      expect(payload.email).toBe(email);
    });

    it('should generate tokens with 15-minute expiration', async () => {
      const token = await authService.requestMagicLink('test@example.com');

      const { payload } = await jose.jwtVerify(token, getMagicLinkSecretBytes(), {
        issuer: 'zktalk',
        audience: 'zktalk-magic-link',
      });

      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp!;
      // Should expire in ~15 minutes (900 seconds), allow some margin
      expect(exp - now).toBeGreaterThan(890);
      expect(exp - now).toBeLessThanOrEqual(900);
    });
  });

  describe('verifyMagicLink', () => {
    async function createValidToken(email: string): Promise<string> {
      return new jose.SignJWT({ email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('zktalk')
        .setAudience('zktalk-magic-link')
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(getMagicLinkSecretBytes());
    }

    it('should find existing user and return session token', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'test',
        username: 'test_user',
        avatarUrl: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findOrCreateUserByAuth flow: findAuthMethod → findUserById
      const { findAuthMethod, findUserById: mockFindById } = await import('../auth.repository.js');
      vi.mocked(findAuthMethod).mockResolvedValue({ id: 'am-1', userId: 'user-1', type: 'email', identifier: 'test@example.com', verifiedAt: new Date(), createdAt: new Date() } as any);
      vi.mocked(mockFindById).mockResolvedValue(existingUser);
      mockCreateSessionToken.mockResolvedValue('session-token-123');

      const token = await createValidToken('test@example.com');
      const sessionToken = await authService.verifyMagicLink(token);

      expect(sessionToken).toBe('session-token-123');
    });

    it('should create new user if not found', async () => {
      const newUser = {
        id: 'user-new',
        email: 'new@example.com',
        displayName: 'new',
        username: 'new_abc1',
        avatarUrl: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { findAuthMethod, createAuthMethod } = await import('../auth.repository.js');
      vi.mocked(findAuthMethod).mockResolvedValue(null as any);
      mockFindUserByEmail.mockResolvedValue(null as any);
      mockCreateUser.mockResolvedValue(newUser);
      vi.mocked(createAuthMethod).mockResolvedValue({} as any);
      mockCreateSessionToken.mockResolvedValue('new-session-token');

      const token = await createValidToken('new@example.com');
      const sessionToken = await authService.verifyMagicLink(token);

      expect(sessionToken).toBe('new-session-token');
    });

    it('should throw on invalid token', async () => {
      await expect(authService.verifyMagicLink('invalid-token')).rejects.toThrow(
        'Invalid or expired magic link token',
      );
    });

    it('should throw on expired token', async () => {
      const expiredToken = await new jose.SignJWT({ email: 'test@example.com' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('zktalk')
        .setAudience('zktalk-magic-link')
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
        .sign(getMagicLinkSecretBytes());

      await expect(authService.verifyMagicLink(expiredToken)).rejects.toThrow(
        'Invalid or expired magic link token',
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when found', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
        username: 'testuser',
        avatarUrl: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindUserById.mockResolvedValue(user);

      const result = await authService.getCurrentUser('user-1');
      expect(result).toEqual(user);
      expect(mockFindUserById).toHaveBeenCalledWith('user-1');
    });

    it('should throw not found when user does not exist', async () => {
      mockFindUserById.mockResolvedValue(null as any);

      await expect(authService.getCurrentUser('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('settings', () => {
    it('should return parsed user settings', async () => {
      mockEnsureUserSettings.mockResolvedValue({
        userId: 'user-1',
        communityOrder: '["community-2","community-1"]',
        collapsedSections: '{"community-2:true":true}',
        lastVisited: '{"kind":"channel","communityId":"community-2","channelId":"channel-9"}',
        translationDisplay: '{"uiLocale":"ko","mode":"target_language_except_readable","targetLanguage":"ko","readableLanguages":["ko","en"]}',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      } as any);
      mockParseCommunityOrder.mockReturnValue(['community-2', 'community-1']);
      mockParseTranslationDisplay.mockReturnValue({
        uiLocale: 'ko',
        mode: 'target_language_except_readable',
        targetLanguage: 'ko',
        readableLanguages: ['ko', 'en'],
      });
      const lastVisited = {
        kind: 'channel' as const,
        communityId: 'community-2',
        channelId: 'channel-9',
      };
      const { parseLastVisited } = await import('../auth.repository.js');
      vi.mocked(parseLastVisited).mockReturnValue(lastVisited as any);

      const result = await authService.getSettings('user-1');

      expect(result).toEqual({
        communityOrder: ['community-2', 'community-1'],
        collapsedSections: { 'community-2:true': true },
        lastVisited,
        translationDisplay: {
          uiLocale: 'ko',
          mode: 'target_language_except_readable',
          targetLanguage: 'ko',
          readableLanguages: ['ko', 'en'],
        },
        updatedAt: '2026-04-03T00:00:00.000Z',
      });
    });

    it('should update and return parsed user settings', async () => {
      mockUpsertUserSettings.mockResolvedValue({
        userId: 'user-1',
        communityOrder: '["community-3","community-1"]',
        collapsedSections: '{"community-3:false":false}',
        lastVisited: '{"kind":"dm","conversationId":"dm-1"}',
        translationDisplay: '{"uiLocale":"en","mode":"target_language_all","targetLanguage":"en","readableLanguages":["en"]}',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T01:00:00.000Z'),
      } as any);
      mockParseCommunityOrder.mockReturnValue(['community-3', 'community-1']);
      mockParseTranslationDisplay.mockReturnValue({
        uiLocale: 'en',
        mode: 'target_language_all',
        targetLanguage: 'en',
        readableLanguages: ['en'],
      });
      const lastVisited = {
        kind: 'dm' as const,
        conversationId: 'dm-1',
      };
      const { parseLastVisited } = await import('../auth.repository.js');
      vi.mocked(parseLastVisited).mockReturnValue(lastVisited as any);

      const result = await authService.updateSettings('user-1', {
        communityOrder: ['community-3', 'community-1'],
        lastVisited,
        translationDisplay: {
          uiLocale: 'EN',
          mode: 'target_language_all',
          targetLanguage: null,
          readableLanguages: ['EN'],
        },
      });

      expect(mockUpsertUserSettings).toHaveBeenCalledWith('user-1', {
        communityOrder: ['community-3', 'community-1'],
        lastVisited,
        translationDisplay: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
      });
      expect(result).toEqual({
        communityOrder: ['community-3', 'community-1'],
        collapsedSections: { 'community-3:false': false },
        lastVisited,
        translationDisplay: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
        updatedAt: '2026-04-03T01:00:00.000Z',
      });
    });

    it('should clear inaccessible channel lastVisited on read', async () => {
      mockEnsureUserSettings.mockResolvedValue({
        userId: 'user-1',
        communityOrder: '[]',
        collapsedSections: '{}',
        lastVisited: '{"kind":"channel","communityId":"community-2","channelId":"channel-9"}',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      } as any);
      mockParseCommunityOrder.mockReturnValue([]);
      const { parseLastVisited } = await import('../auth.repository.js');
      vi.mocked(parseLastVisited).mockReturnValue({
        kind: 'channel',
        communityId: 'community-2',
        channelId: 'channel-9',
      } as any);
      mockAssertCanAccessChannel.mockRejectedValueOnce(new Error('forbidden'));

      const result = await authService.getSettings('user-1');

      expect(result.lastVisited).toBeNull();
    });

    it('should clear inaccessible community lastVisited on read', async () => {
      mockEnsureUserSettings.mockResolvedValue({
        userId: 'user-1',
        communityOrder: '[]',
        collapsedSections: '{}',
        lastVisited: '{"kind":"community","communityId":"community-secret"}',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      } as any);
      mockParseCommunityOrder.mockReturnValue([]);
      const { parseLastVisited } = await import('../auth.repository.js');
      vi.mocked(parseLastVisited).mockReturnValue({
        kind: 'community',
        communityId: 'community-secret',
      } as any);
      mockFindCommunityById.mockResolvedValueOnce({
        id: 'community-secret',
        visibility: 'private',
      } as any);
      mockFindCommunityMembership.mockResolvedValueOnce(null);

      const result = await authService.getSettings('user-1');

      expect(result.lastVisited).toBeNull();
    });

    it('should clear inaccessible dm lastVisited on update', async () => {
      mockUpsertUserSettings.mockResolvedValue({
        userId: 'user-1',
        communityOrder: '[]',
        collapsedSections: '{}',
        lastVisited: 'null',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T01:00:00.000Z'),
      } as any);
      mockParseCommunityOrder.mockReturnValue([]);
      const { parseLastVisited } = await import('../auth.repository.js');
      vi.mocked(parseLastVisited).mockReturnValue(null as any);
      mockIsParticipant.mockResolvedValueOnce(false);

      const result = await authService.updateSettings('user-1', {
        lastVisited: {
          kind: 'dm',
          conversationId: 'dm-secret',
        },
      });

      expect(mockUpsertUserSettings).toHaveBeenCalledWith('user-1', {
        lastVisited: null,
      });
      expect(result.lastVisited).toBeNull();
    });
  });
});
