import { PermissionKey } from '../constants/index';

/**
 * Default permissions for each system role.
 * Owner and admin get all permissions.
 * Lower roles get progressively fewer permissions.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: Object.values(PermissionKey),
  admin: Object.values(PermissionKey),
  moderator: [
    'view_channel',
    'post_message',
    'create_thread',
    'upload_attachment',
    'react',
    'manage_messages',
    'pin_messages',
    'moderate_members',
  ],
  member: ['view_channel', 'post_message', 'create_thread', 'upload_attachment', 'react'],
  guest: ['view_channel'],
};

/**
 * Resolves whether a user has a specific permission given their roles,
 * channel-specific overrides, and default role permissions.
 *
 * Resolution order:
 * 1. Check channel-specific overrides for the user's roles (highest priority role wins)
 * 2. If no override exists, fall back to the default permissions for the user's highest priority role
 *
 * @param userRoles - The roles the user holds, with priority (higher = more authority)
 * @param channelPermissions - Channel-specific permission overrides
 * @param requiredPermission - The permission key to check
 * @param defaultPermissions - Map of role name to default permission keys
 * @returns true if the user has the permission, false otherwise
 */
export function hasPermission(
  userRoles: { roleId: string; roleName: string; priority: number }[],
  channelPermissions: { roleId: string; permissionKey: string; effect: 'allow' | 'deny' }[],
  requiredPermission: string,
  defaultPermissions: Record<string, string[]> = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  if (userRoles.length === 0) {
    return false;
  }

  // Sort roles by priority descending (highest priority first)
  const sortedRoles = [...userRoles].sort((a, b) => b.priority - a.priority);

  // Check channel-specific overrides first.
  // Walk roles from highest priority to lowest; the first explicit override wins.
  for (const role of sortedRoles) {
    const override = channelPermissions.find(
      (p) => p.roleId === role.roleId && p.permissionKey === requiredPermission,
    );
    if (override) {
      return override.effect === 'allow';
    }
  }

  // No channel override found - check default permissions.
  // The user has the permission if ANY of their roles grants it by default.
  for (const role of sortedRoles) {
    const roleDefaults = defaultPermissions[role.roleName];
    if (roleDefaults && roleDefaults.includes(requiredPermission)) {
      return true;
    }
  }

  return false;
}
