import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import {
  autoModRules,
  communityMemberships,
  membershipRoles,
  roles,
  reports,
} from '../../lib/db/schema.js';

// ---------------------------------------------------------------------------
// AutoMod Rule CRUD
// ---------------------------------------------------------------------------

export async function createRule(data: {
  id: string;
  communityId: string;
  name: string;
  type: 'keyword_filter' | 'spam_filter' | 'link_filter';
  config: string;
  isEnabled: boolean;
  action: 'block' | 'flag' | 'mute';
}) {
  const [rule] = await db.insert(autoModRules).values(data).returning();
  return rule;
}

export async function findRuleById(id: string) {
  const [rule] = await db
    .select()
    .from(autoModRules)
    .where(eq(autoModRules.id, id))
    .limit(1);
  return rule ?? null;
}

export async function findRulesByCommunity(communityId: string) {
  return db
    .select()
    .from(autoModRules)
    .where(eq(autoModRules.communityId, communityId));
}

export async function findEnabledRulesByCommunity(communityId: string) {
  return db
    .select()
    .from(autoModRules)
    .where(
      and(
        eq(autoModRules.communityId, communityId),
        eq(autoModRules.isEnabled, true),
      ),
    );
}

export async function updateRule(
  id: string,
  data: Partial<{
    name: string;
    config: string;
    isEnabled: boolean;
    action: 'block' | 'flag' | 'mute';
  }>,
) {
  const [rule] = await db
    .update(autoModRules)
    .set(data)
    .where(eq(autoModRules.id, id))
    .returning();
  return rule ?? null;
}

export async function deleteRule(id: string) {
  const [rule] = await db
    .delete(autoModRules)
    .where(eq(autoModRules.id, id))
    .returning();
  return rule ?? null;
}

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

export async function getUserRolesInCommunity(userId: string, communityId: string) {
  return db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      priority: roles.priority,
    })
    .from(communityMemberships)
    .innerJoin(membershipRoles, eq(communityMemberships.id, membershipRoles.membershipId))
    .innerJoin(roles, eq(membershipRoles.roleId, roles.id))
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.membershipStatus, 'active'),
      ),
    );
}

// ---------------------------------------------------------------------------
// Auto-report creation (for 'flag' action)
// ---------------------------------------------------------------------------

export async function createAutoReport(data: {
  id: string;
  communityId: string;
  messageId: string;
  reportedUserId: string;
  reporterUserId: string;
  reasonCode: string;
  reasonText: string;
}) {
  const [report] = await db.insert(reports).values(data).returning();
  return report;
}
