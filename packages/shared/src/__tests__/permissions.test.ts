import { describe, it, expect } from 'vitest';
import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions.js';

describe('hasPermission', () => {
  const ownerRole = { roleId: 'r-owner', roleName: 'owner', priority: 100 };
  const adminRole = { roleId: 'r-admin', roleName: 'admin', priority: 90 };
  const moderatorRole = { roleId: 'r-mod', roleName: 'moderator', priority: 50 };
  const memberRole = { roleId: 'r-member', roleName: 'member', priority: 10 };
  const guestRole = { roleId: 'r-guest', roleName: 'guest', priority: 0 };

  describe('with no channel overrides', () => {
    it('grants owner all permissions', () => {
      expect(
        hasPermission([ownerRole], [], 'manage_channels', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([ownerRole], [], 'view_channel', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([ownerRole], [], 'manage_roles', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
    });

    it('grants admin all permissions', () => {
      expect(
        hasPermission([adminRole], [], 'manage_channels', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([adminRole], [], 'manage_roles', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
    });

    it('grants moderator moderation permissions but not management', () => {
      expect(
        hasPermission([moderatorRole], [], 'manage_messages', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([moderatorRole], [], 'moderate_members', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([moderatorRole], [], 'manage_channels', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(false);
      expect(
        hasPermission([moderatorRole], [], 'manage_roles', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(false);
    });

    it('grants member basic permissions only', () => {
      expect(
        hasPermission([memberRole], [], 'view_channel', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([memberRole], [], 'post_message', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([memberRole], [], 'manage_messages', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(false);
    });

    it('grants guest only view_channel', () => {
      expect(
        hasPermission([guestRole], [], 'view_channel', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
      expect(
        hasPermission([guestRole], [], 'post_message', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(false);
    });

    it('returns false for empty roles', () => {
      expect(hasPermission([], [], 'view_channel', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
    });

    it('uses highest-privilege role when user has multiple roles', () => {
      expect(
        hasPermission(
          [guestRole, moderatorRole],
          [],
          'manage_messages',
          DEFAULT_ROLE_PERMISSIONS,
        ),
      ).toBe(true);
    });
  });

  describe('with channel overrides', () => {
    it('allows permission when channel override says allow', () => {
      const overrides = [
        { roleId: 'r-member', permissionKey: 'manage_messages', effect: 'allow' as const },
      ];
      expect(
        hasPermission([memberRole], overrides, 'manage_messages', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
    });

    it('denies permission when channel override says deny', () => {
      const overrides = [
        { roleId: 'r-member', permissionKey: 'post_message', effect: 'deny' as const },
      ];
      expect(
        hasPermission([memberRole], overrides, 'post_message', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(false);
    });

    it('higher priority role override takes precedence', () => {
      // Moderator gets denied but admin gets allowed -> admin wins because higher priority
      const overrides = [
        { roleId: 'r-mod', permissionKey: 'post_message', effect: 'deny' as const },
        { roleId: 'r-admin', permissionKey: 'post_message', effect: 'allow' as const },
      ];
      expect(
        hasPermission(
          [moderatorRole, adminRole],
          overrides,
          'post_message',
          DEFAULT_ROLE_PERMISSIONS,
        ),
      ).toBe(true);
    });

    it('lower priority role deny is overridden by higher priority allow', () => {
      const overrides = [
        { roleId: 'r-member', permissionKey: 'view_channel', effect: 'deny' as const },
        { roleId: 'r-mod', permissionKey: 'view_channel', effect: 'allow' as const },
      ];
      expect(
        hasPermission(
          [memberRole, moderatorRole],
          overrides,
          'view_channel',
          DEFAULT_ROLE_PERMISSIONS,
        ),
      ).toBe(true);
    });

    it('falls back to defaults when no override matches the role', () => {
      // Override for a different role
      const overrides = [
        { roleId: 'r-other', permissionKey: 'post_message', effect: 'deny' as const },
      ];
      expect(
        hasPermission([memberRole], overrides, 'post_message', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(true);
    });

    it('channel deny overrides default allow', () => {
      // Member normally has view_channel, but channel denies it
      const overrides = [
        { roleId: 'r-member', permissionKey: 'view_channel', effect: 'deny' as const },
      ];
      expect(
        hasPermission([memberRole], overrides, 'view_channel', DEFAULT_ROLE_PERMISSIONS),
      ).toBe(false);
    });
  });

  describe('with custom default permissions', () => {
    it('uses custom defaults when provided', () => {
      const customDefaults = {
        custom_role: ['view_channel', 'special_action'],
      };
      const customRole = { roleId: 'r-custom', roleName: 'custom_role', priority: 5 };

      expect(
        hasPermission([customRole], [], 'special_action', customDefaults),
      ).toBe(true);
      expect(
        hasPermission([customRole], [], 'post_message', customDefaults),
      ).toBe(false);
    });
  });
});
