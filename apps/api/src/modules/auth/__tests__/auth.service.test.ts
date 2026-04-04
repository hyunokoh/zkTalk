import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jose from 'jose';

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
}));

// Mock the auth middleware
vi.mock('../../../middleware/auth.js', () => ({
  createSessionToken: vi.fn().mockResolvedValue('mock-session-token'),
}));

import * as authService from '../auth.service.js';
import {
  createUser,
  ensureUserSettings,
  findUserByEmail,
  findUserById,
  parseCommunityOrder,
  upsertUserSettings,
} from '../auth.repository.js';
import { createSessionToken } from '../../../middleware/auth.js';

const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockFindUserById = vi.mocked(findUserById);
const mockCreateUser = vi.mocked(createUser);
const mockEnsureUserSettings = vi.mocked(ensureUserSettings);
const mockUpsertUserSettings = vi.mocked(upsertUserSettings);
const mockParseCommunityOrder = vi.mocked(parseCommunityOrder);
const mockCreateSessionToken = vi.mocked(createSessionToken);

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
      const secret = new TextEncoder().encode(
        process.env.MAGIC_LINK_SECRET || 'dev-magic-link-secret-change-in-production',
      );
      const { payload } = await jose.jwtVerify(token, secret, {
        issuer: 'zktalk',
        audience: 'zktalk-magic-link',
      });

      expect(payload.email).toBe(email);
    });

    it('should generate tokens with 15-minute expiration', async () => {
      const token = await authService.requestMagicLink('test@example.com');

      const secret = new TextEncoder().encode(
        process.env.MAGIC_LINK_SECRET || 'dev-magic-link-secret-change-in-production',
      );
      const { payload } = await jose.jwtVerify(token, secret, {
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
      const secret = new TextEncoder().encode(
        process.env.MAGIC_LINK_SECRET || 'dev-magic-link-secret-change-in-production',
      );
      return new jose.SignJWT({ email })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('zktalk')
        .setAudience('zktalk-magic-link')
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(secret);
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
      const secret = new TextEncoder().encode(
        process.env.MAGIC_LINK_SECRET || 'dev-magic-link-secret-change-in-production',
      );
      const expiredToken = await new jose.SignJWT({ email: 'test@example.com' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('zktalk')
        .setAudience('zktalk-magic-link')
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
        .sign(secret);

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
        lastVisited: '{"kind":"channel","communityId":"community-2","channelId":"channel-9"}',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      } as any);
      mockParseCommunityOrder.mockReturnValue(['community-2', 'community-1']);
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
        lastVisited,
        updatedAt: '2026-04-03T00:00:00.000Z',
      });
    });

    it('should update and return parsed user settings', async () => {
      mockUpsertUserSettings.mockResolvedValue({
        userId: 'user-1',
        communityOrder: '["community-3","community-1"]',
        lastVisited: '{"kind":"dm","conversationId":"dm-1"}',
        createdAt: new Date('2026-04-03T00:00:00.000Z'),
        updatedAt: new Date('2026-04-03T01:00:00.000Z'),
      } as any);
      mockParseCommunityOrder.mockReturnValue(['community-3', 'community-1']);
      const lastVisited = {
        kind: 'dm' as const,
        conversationId: 'dm-1',
      };
      const { parseLastVisited } = await import('../auth.repository.js');
      vi.mocked(parseLastVisited).mockReturnValue(lastVisited as any);

      const result = await authService.updateSettings('user-1', {
        communityOrder: ['community-3', 'community-1'],
        lastVisited,
      });

      expect(mockUpsertUserSettings).toHaveBeenCalledWith('user-1', {
        communityOrder: ['community-3', 'community-1'],
        lastVisited,
      });
      expect(result).toEqual({
        communityOrder: ['community-3', 'community-1'],
        lastVisited,
        updatedAt: '2026-04-03T01:00:00.000Z',
      });
    });
  });
});
