import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jose from 'jose';

// Mock the repository
vi.mock('../auth.repository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
}));

// Mock the auth middleware
vi.mock('../../../middleware/auth.js', () => ({
  createSessionToken: vi.fn().mockResolvedValue('mock-session-token'),
}));

import * as authService from '../auth.service.js';
import { findUserByEmail, findUserById, createUser } from '../auth.repository.js';
import { createSessionToken } from '../../../middleware/auth.js';

const mockFindUserByEmail = vi.mocked(findUserByEmail);
const mockFindUserById = vi.mocked(findUserById);
const mockCreateUser = vi.mocked(createUser);
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

      mockFindUserByEmail.mockResolvedValue(existingUser);
      mockCreateSessionToken.mockResolvedValue('session-token-123');

      const token = await createValidToken('test@example.com');
      const sessionToken = await authService.verifyMagicLink(token);

      expect(sessionToken).toBe('session-token-123');
      expect(mockFindUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(mockCreateSessionToken).toHaveBeenCalledWith({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'test',
        username: 'test_user',
      });
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

      mockFindUserByEmail.mockResolvedValue(null as any);
      mockCreateUser.mockResolvedValue(newUser);
      mockCreateSessionToken.mockResolvedValue('new-session-token');

      const token = await createValidToken('new@example.com');
      const sessionToken = await authService.verifyMagicLink(token);

      expect(sessionToken).toBe('new-session-token');
      expect(mockFindUserByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          displayName: 'new',
        }),
      );
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
});
