import { SystemRole } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import * as repo from './emoji.repository.js';
import type { CreateEmojiInput } from './emoji.schema.js';

// ---------------------------------------------------------------------------
// Permission helper
// ---------------------------------------------------------------------------

const ADMIN_ROLES: readonly string[] = [SystemRole.OWNER, SystemRole.ADMIN];

async function requireAdmin(userId: string, communityId: string) {
  const userRoles = await repo.getUserRolesInCommunity(userId, communityId);
  const hasRole = userRoles.some((r) => ADMIN_ROLES.includes(r.roleName));
  if (!hasRole) {
    throw AppError.forbidden('You do not have permission to manage custom emojis');
  }
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

export async function createEmoji(
  communityId: string,
  userId: string,
  data: CreateEmojiInput,
) {
  await requireAdmin(userId, communityId);

  // Check for duplicate name
  const existing = await repo.findByName(communityId, data.name);
  if (existing) {
    throw AppError.conflict(`An emoji with the name "${data.name}" already exists`);
  }

  return repo.createEmoji({
    id: uuidv7(),
    communityId,
    name: data.name,
    imageUrl: data.imageUrl,
    uploadedByUserId: userId,
  });
}

export async function getEmojis(communityId: string) {
  return repo.findByCommunity(communityId);
}

export async function deleteEmoji(emojiId: string, userId: string) {
  const emoji = await repo.findById(emojiId);
  if (!emoji) {
    throw AppError.notFound('Custom emoji not found');
  }

  await requireAdmin(userId, emoji.communityId);

  return repo.deleteEmoji(emojiId);
}
