import { pgTable, text, timestamp, integer, boolean, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const membershipStatusEnum = pgEnum('membership_status', ['active', 'muted', 'banned', 'left']);
export const communityVisibilityEnum = pgEnum('community_visibility', ['public', 'invite_only', 'private']);
export const channelTypeEnum = pgEnum('channel_type', ['chat', 'announcement', 'forum']);
export const channelVisibilityEnum = pgEnum('channel_visibility', ['public', 'role_restricted']);
export const messageTypeEnum = pgEnum('message_type', ['user', 'system']);
export const reportStatusEnum = pgEnum('report_status', ['open', 'resolved', 'dismissed']);
export const permissionEffectEnum = pgEnum('permission_effect', ['allow', 'deny']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  username: text('username').notNull(),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('users_email_idx').on(t.email),
  uniqueIndex('users_username_idx').on(t.username),
]);

export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  iconUrl: text('icon_url'),
  bannerUrl: text('banner_url'),
  visibility: communityVisibilityEnum('visibility').notNull().default('public'),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('communities_slug_idx').on(t.slug),
]);

export const communityMemberships = pgTable('community_memberships', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  userId: text('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  membershipStatus: membershipStatusEnum('membership_status').notNull().default('active'),
  lastReadInboxAt: timestamp('last_read_inbox_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('memberships_community_user_idx').on(t.communityId, t.userId),
]);

export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  name: text('name').notNull(),
  color: text('color'),
  priority: integer('priority').notNull().default(0),
  isSystemRole: boolean('is_system_role').notNull().default(false),
});

export const membershipRoles = pgTable('membership_roles', {
  membershipId: text('membership_id').notNull().references(() => communityMemberships.id),
  roleId: text('role_id').notNull().references(() => roles.id),
}, (t) => [
  uniqueIndex('membership_roles_idx').on(t.membershipId, t.roleId),
]);

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
});

export const channels = pgTable('channels', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  categoryId: text('category_id').references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  type: channelTypeEnum('type').notNull().default('chat'),
  visibility: channelVisibilityEnum('visibility').notNull().default('public'),
  slowModeSeconds: integer('slow_mode_seconds').notNull().default(0),
  position: integer('position').notNull().default(0),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('channels_community_idx').on(t.communityId),
]);

export const channelRolePermissions = pgTable('channel_role_permissions', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  roleId: text('role_id').notNull().references(() => roles.id),
  permissionKey: text('permission_key').notNull(),
  effect: permissionEffectEnum('effect').notNull(),
});

export const threads = pgTable('threads', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  rootMessageId: text('root_message_id').notNull(),
  title: text('title'),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  isLocked: boolean('is_locked').notNull().default(false),
  isPinned: boolean('is_pinned').notNull().default(false),
  replyCount: integer('reply_count').notNull().default(0),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  channelId: text('channel_id').notNull().references(() => channels.id),
  threadId: text('thread_id').references(() => threads.id),
  parentMessageId: text('parent_message_id'),
  authorUserId: text('author_user_id').notNull().references(() => users.id),
  bodyMarkdown: text('body_markdown').notNull(),
  bodyPlaintext: text('body_plaintext').notNull(),
  messageType: messageTypeEnum('message_type').notNull().default('user'),
  isEdited: boolean('is_edited').notNull().default(false),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('messages_channel_idx').on(t.channelId),
  index('messages_thread_idx').on(t.threadId),
]);

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id),
  storageKey: text('storage_key').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  width: integer('width'),
  height: integer('height'),
});

export const reactions = pgTable('reactions', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id),
  userId: text('user_id').notNull().references(() => users.id),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('reactions_unique_idx').on(t.messageId, t.userId, t.emoji),
]);

export const threadFollows = pgTable('thread_follows', {
  threadId: text('thread_id').notNull().references(() => threads.id),
  userId: text('user_id').notNull().references(() => users.id),
  lastReadMessageId: text('last_read_message_id'),
}, (t) => [
  uniqueIndex('thread_follows_idx').on(t.threadId, t.userId),
]);

export const channelReads = pgTable('channel_reads', {
  channelId: text('channel_id').notNull().references(() => channels.id),
  userId: text('user_id').notNull().references(() => users.id),
  lastReadMessageId: text('last_read_message_id'),
  unreadCountCache: integer('unread_count_cache').default(0),
  mentionCountCache: integer('mention_count_cache').default(0),
}, (t) => [
  uniqueIndex('channel_reads_idx').on(t.channelId, t.userId),
]);

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  messageId: text('message_id').references(() => messages.id),
  reportedUserId: text('reported_user_id').references(() => users.id),
  reporterUserId: text('reporter_user_id').notNull().references(() => users.id),
  reasonCode: text('reason_code').notNull(),
  reasonText: text('reason_text'),
  status: reportStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedByUserId: text('resolved_by_user_id').references(() => users.id),
});

export const moderationActions = pgTable('moderation_actions', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  actorUserId: text('actor_user_id').notNull().references(() => users.id),
  targetUserId: text('target_user_id').references(() => users.id),
  targetMessageId: text('target_message_id').references(() => messages.id),
  actionType: text('action_type').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  code: text('code').notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxUses: integer('max_uses'),
  useCount: integer('use_count').notNull().default(0),
}, (t) => [
  uniqueIndex('invites_code_idx').on(t.code),
]);
