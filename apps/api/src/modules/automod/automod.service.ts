import { SystemRole } from '@zktalk/shared';
import { uuidv7 } from 'uuidv7';
import { AppError } from '../../lib/errors.js';
import { redis } from '../../lib/redis.js';
import * as repo from './automod.repository.js';
import type { CreateAutoModRuleInput, UpdateAutoModRuleInput } from './automod.schema.js';

// ---------------------------------------------------------------------------
// Permission helper
// ---------------------------------------------------------------------------

const ADMIN_ROLES: readonly string[] = [SystemRole.OWNER, SystemRole.ADMIN, SystemRole.MODERATOR];

async function requireAdmin(userId: string, communityId: string) {
  const userRoles = await repo.getUserRolesInCommunity(userId, communityId);
  const hasRole = userRoles.some((r) => ADMIN_ROLES.includes(r.roleName));
  if (!hasRole) {
    throw AppError.forbidden('You do not have permission to manage AutoMod rules');
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createRule(
  communityId: string,
  userId: string,
  data: CreateAutoModRuleInput,
) {
  await requireAdmin(userId, communityId);

  const rule = await repo.createRule({
    id: uuidv7(),
    communityId,
    name: data.name,
    type: data.type,
    config: JSON.stringify(data.config),
    isEnabled: data.isEnabled,
    action: data.action,
  });

  return rule;
}

export async function updateRule(
  ruleId: string,
  userId: string,
  data: UpdateAutoModRuleInput,
) {
  const existing = await repo.findRuleById(ruleId);
  if (!existing) {
    throw AppError.notFound('AutoMod rule not found');
  }

  await requireAdmin(userId, existing.communityId);

  const updateData: Parameters<typeof repo.updateRule>[1] = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
  if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
  if (data.action !== undefined) updateData.action = data.action;

  return repo.updateRule(ruleId, updateData);
}

export async function deleteRule(ruleId: string, userId: string) {
  const existing = await repo.findRuleById(ruleId);
  if (!existing) {
    throw AppError.notFound('AutoMod rule not found');
  }

  await requireAdmin(userId, existing.communityId);

  return repo.deleteRule(ruleId);
}

export async function getRules(communityId: string) {
  const rules = await repo.findRulesByCommunity(communityId);
  return rules.map((r) => ({
    ...r,
    config: JSON.parse(r.config),
  }));
}

// ---------------------------------------------------------------------------
// Message checking
// ---------------------------------------------------------------------------

export interface CheckResult {
  allowed: boolean;
  reason?: string;
  action?: 'block' | 'flag' | 'mute';
}

const URL_REGEX = /https?:\/\/[^\s<]+/i;

export async function checkMessage(
  communityId: string,
  bodyMarkdown: string,
  authorUserId: string,
): Promise<CheckResult> {
  const rules = await repo.findEnabledRulesByCommunity(communityId);

  for (const rule of rules) {
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(rule.config);
    } catch {
      continue;
    }

    switch (rule.type) {
      case 'keyword_filter': {
        const keywords = Array.isArray(config.keywords) ? (config.keywords as string[]) : [];
        const lowerBody = bodyMarkdown.toLowerCase();
        for (const keyword of keywords) {
          if (lowerBody.includes(keyword.toLowerCase())) {
            return {
              allowed: false,
              reason: `Message contains blocked keyword: ${keyword}`,
              action: rule.action,
            };
          }
        }
        break;
      }

      case 'spam_filter': {
        const maxMessages = typeof config.maxMessages === 'number' ? config.maxMessages : 5;
        const windowSeconds = typeof config.windowSeconds === 'number' ? config.windowSeconds : 10;

        const redisKey = `automod:spam:${communityId}:${authorUserId}`;
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.expire(redisKey, windowSeconds);
        }

        if (count > maxMessages) {
          return {
            allowed: false,
            reason: `Spam detected: too many messages in ${windowSeconds} seconds`,
            action: rule.action,
          };
        }
        break;
      }

      case 'link_filter': {
        const blockLinks = config.blockLinks === true;
        if (blockLinks && URL_REGEX.test(bodyMarkdown)) {
          return {
            allowed: false,
            reason: 'Links are not allowed in this community',
            action: rule.action,
          };
        }
        break;
      }
    }
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Auto-report helper (for 'flag' action)
// ---------------------------------------------------------------------------

export async function createAutoReport(
  communityId: string,
  messageId: string,
  authorUserId: string,
  reason: string,
) {
  return repo.createAutoReport({
    id: uuidv7(),
    communityId,
    messageId,
    reportedUserId: authorUserId,
    reporterUserId: authorUserId, // system-generated report
    reasonCode: 'automod',
    reasonText: reason,
  });
}
