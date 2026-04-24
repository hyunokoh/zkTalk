import { pgTable, text, timestamp, integer, bigint, boolean, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const authMethodTypeEnum = pgEnum('auth_method_type', ['phone', 'email', 'google', 'apple']);
export const membershipStatusEnum = pgEnum('membership_status', ['active', 'muted', 'banned', 'left']);
export const communityVisibilityEnum = pgEnum('community_visibility', ['public', 'invite_only', 'private']);
export const channelTypeEnum = pgEnum('channel_type', ['chat', 'announcement', 'forum', 'voice']);
export const channelVisibilityEnum = pgEnum('channel_visibility', ['public', 'role_restricted']);
export const channelAccessPolicyEnum = pgEnum('channel_access_policy', ['public', 'members_only', 'invite_only', 'private']);
export const messageTypeEnum = pgEnum('message_type', ['user', 'system']);
export const reportStatusEnum = pgEnum('report_status', ['open', 'resolved', 'dismissed']);
export const dmConversationTypeEnum = pgEnum('dm_conversation_type', ['direct', 'group']);
export const permissionEffectEnum = pgEnum('permission_effect', ['allow', 'deny']);
export const rsvpStatusEnum = pgEnum('rsvp_status', ['interested', 'going']);
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'blocked']);
export const autoModRuleTypeEnum = pgEnum('automod_rule_type', ['keyword_filter', 'spam_filter', 'link_filter']);
export const autoModActionEnum = pgEnum('automod_action', ['block', 'flag', 'mute']);
export const uploadTargetKindEnum = pgEnum('upload_target_kind', ['channel_message', 'thread_reply', 'dm_message', 'user_avatar', 'community_icon']);
export const uploadSessionStatusEnum = pgEnum('upload_session_status', ['created', 'single_ready', 'multipart_ready', 'uploading', 'completed', 'aborted', 'expired']);
export const devicePlatformEnum = pgEnum('device_platform', ['macos', 'linux', 'windows', 'mobile', 'other']);
export const deviceStateEnum = pgEnum('device_state', ['online', 'busy', 'degraded', 'offline', 'suspended']);
export const commandExecutionStatusEnum = pgEnum('command_execution_status', ['queued', 'awaiting_approval', 'approved', 'running', 'completed', 'failed', 'rejected', 'timeout', 'cancelled']);

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

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id),
  communityOrder: text('community_order').notNull().default('[]'),
  collapsedSections: text('collapsed_sections').notNull().default('{}'),
  lastVisited: text('last_visited'),
  translationDisplay: text('translation_display').notNull().default('{"uiLocale":"en","mode":"manual_only","targetLanguage":null,"readableLanguages":[]}'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


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
  sourceDmConversationId: text('source_dm_conversation_id'),
  name: text('name').notNull(),
  description: text('description'),
  type: channelTypeEnum('type').notNull().default('chat'),
  visibility: channelVisibilityEnum('visibility').notNull().default('public'),
  accessPolicy: channelAccessPolicyEnum('access_policy').notNull().default('members_only'),
  slowModeSeconds: integer('slow_mode_seconds').notNull().default(0),
  position: integer('position').notNull().default(0),
  isArchived: boolean('is_archived').notNull().default(false),
  isE2eeEnabled: boolean('is_e2ee_enabled').notNull().default(false),
  disappearingDuration: integer('disappearing_duration'), // seconds, null = disabled
  requireTopic: boolean('require_topic').notNull().default(false),
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
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  isSealed: boolean('is_sealed').notNull().default(false),
  encryptedPayload: text('encrypted_payload'),
  forwardedFromMessageId: text('forwarded_from_message_id'),
  topic: text('topic'), // Zulip-style topic-based threading
  expiresAt: timestamp('expires_at', { withTimezone: true }), // disappearing messages
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('messages_channel_idx').on(t.channelId),
  index('messages_thread_idx').on(t.threadId),
]);

export const uploadSessions = pgTable('upload_sessions', {
  id: text('id').primaryKey(),
  uploaderUserId: text('uploader_user_id').notNull().references(() => users.id),
  targetKind: uploadTargetKindEnum('target_kind').notNull(),
  communityId: text('community_id').references(() => communities.id),
  channelId: text('channel_id').references(() => channels.id),
  threadId: text('thread_id').references(() => threads.id),
  conversationId: text('conversation_id').references(() => dmConversations.id),
  fileName: text('file_name').notNull(),
  sanitizedFileName: text('sanitized_file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  bucket: text('bucket').notNull(),
  objectKey: text('object_key').notNull(),
  multipartUploadId: text('multipart_upload_id'),
  partSize: integer('part_size'),
  partCount: integer('part_count'),
  status: uploadSessionStatusEnum('status').notNull().default('created'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  abortedAt: timestamp('aborted_at', { withTimezone: true }),
}, (t) => [
  index('upload_sessions_uploader_idx').on(t.uploaderUserId),
  index('upload_sessions_status_idx').on(t.status),
  index('upload_sessions_channel_idx').on(t.channelId),
  index('upload_sessions_conversation_idx').on(t.conversationId),
  uniqueIndex('upload_sessions_object_key_idx').on(t.objectKey),
]);

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  messageId: text('message_id').references(() => messages.id),
  dmMessageId: text('dm_message_id').references(() => dmMessages.id),
  uploadSessionId: text('upload_session_id').references(() => uploadSessions.id),
  storageKey: text('storage_key').notNull(),
  bucket: text('bucket').notNull().default('zktalk-uploads'),
  objectKey: text('object_key').notNull().default(''),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  width: integer('width'),
  height: integer('height'),
}, (t) => [
  index('attachments_message_idx').on(t.messageId),
  index('attachments_dm_message_idx').on(t.dmMessageId),
  index('attachments_upload_session_idx').on(t.uploadSessionId),
]);

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

// Message pins
export const messagePins = pgTable('message_pins', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  messageId: text('message_id').notNull().references(() => messages.id),
  pinnedByUserId: text('pinned_by_user_id').notNull().references(() => users.id),
  pinnedAt: timestamp('pinned_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('message_pins_channel_message_idx').on(t.channelId, t.messageId),
]);

// Bookmarks (saved messages)
export const bookmarks = pgTable('bookmarks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  messageId: text('message_id').notNull().references(() => messages.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('bookmarks_user_message_idx').on(t.userId, t.messageId),
]);

// Polls
export const polls = pgTable('polls', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  messageId: text('message_id').references(() => messages.id),
  question: text('question').notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  allowMultiple: boolean('allow_multiple').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pollOptions = pgTable('poll_options', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => polls.id),
  text: text('text').notNull(),
  position: integer('position').notNull().default(0),
});

export const pollVotes = pgTable('poll_votes', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => polls.id),
  optionId: text('option_id').notNull().references(() => pollOptions.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('poll_votes_user_option_idx').on(t.userId, t.optionId),
]);

// ── User Keys (E2EE) ─────────────────────────────────────────────────

export const userKeys = pgTable('user_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  publicKey: text('public_key').notNull(), // base64-encoded JWK
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('user_keys_user_id_idx').on(t.userId),
]);

// ── Direct Messages ──────────────────────────────────────────────────

export const dmConversations = pgTable('dm_conversations', {
  id: text('id').primaryKey(),
  type: dmConversationTypeEnum('type').notNull(),
  name: text('name'),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  promotedCommunityId: text('promoted_community_id').references(() => communities.id),
  promotedChannelId: text('promoted_channel_id').references(() => channels.id),
  promotedAt: timestamp('promoted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dmParticipants = pgTable('dm_participants', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => dmConversations.id),
  userId: text('user_id').notNull().references(() => users.id),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  lastReadMessageId: text('last_read_message_id'),
}, (t) => [
  uniqueIndex('dm_participants_conversation_user_idx').on(t.conversationId, t.userId),
  index('dm_participants_user_idx').on(t.userId),
]);

export const dmMessages = pgTable('dm_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => dmConversations.id),
  authorUserId: text('author_user_id').notNull().references(() => users.id),
  bodyMarkdown: text('body_markdown').notNull(),
  bodyPlaintext: text('body_plaintext').notNull(),
  messageType: messageTypeEnum('message_type').notNull().default('user'),
  isEdited: boolean('is_edited').notNull().default(false),
  isDeleted: boolean('is_deleted').notNull().default(false),
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  isSealed: boolean('is_sealed').notNull().default(false),
  encryptedPayload: text('encrypted_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('dm_messages_conversation_idx').on(t.conversationId),
]);

// ── AutoMod ──────────────────────────────────────────────────────────

export const autoModRules = pgTable('automod_rules', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  name: text('name').notNull(),
  type: autoModRuleTypeEnum('type').notNull(),
  config: text('config').notNull(), // JSON string
  isEnabled: boolean('is_enabled').notNull().default(true),
  action: autoModActionEnum('action').notNull().default('block'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('automod_rules_community_idx').on(t.communityId),
]);

// ── Custom Emoji ─────────────────────────────────────────────────────

export const customEmojis = pgTable('custom_emojis', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  name: text('name').notNull(),
  imageUrl: text('image_url').notNull(),
  uploadedByUserId: text('uploaded_by_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('custom_emojis_community_name_idx').on(t.communityId, t.name),
]);

// ── Community Onboarding ─────────────────────────────────────────────

export const communityOnboarding = pgTable('community_onboarding', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  welcomeMessage: text('welcome_message'),
  rules: text('rules'), // JSON array of strings
  defaultChannelIds: text('default_channel_ids'), // JSON array of channel IDs
  isEnabled: boolean('is_enabled').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('community_onboarding_community_idx').on(t.communityId),
]);

// ── Scheduled Events ─────────────────────────────────────────────────

export const communityEvents = pgTable('community_events', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'), // channel ID or external URL
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('community_events_community_idx').on(t.communityId),
]);

export const eventRsvps = pgTable('event_rsvps', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull().references(() => communityEvents.id),
  userId: text('user_id').notNull().references(() => users.id),
  status: rsvpStatusEnum('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('event_rsvps_event_user_idx').on(t.eventId, t.userId),
]);

// ── Friendships ──────────────────────────────────────────────────────

export const friendships = pgTable('friendships', {
  id: text('id').primaryKey(),
  requesterId: text('requester_id').notNull().references(() => users.id),
  addresseeId: text('addressee_id').notNull().references(() => users.id),
  status: friendshipStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('friendships_requester_addressee_idx').on(t.requesterId, t.addresseeId),
  index('friendships_addressee_idx').on(t.addresseeId),
]);

// ── Webhooks & Bots ──────────────────────────────────────────────────

export const webhooks = pgTable('webhooks', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  channelId: text('channel_id').notNull().references(() => channels.id),
  name: text('name').notNull(),
  token: text('token').notNull(),
  avatarUrl: text('avatar_url'),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('webhooks_token_idx').on(t.token),
  index('webhooks_community_idx').on(t.communityId),
]);

export const botUsers = pgTable('bot_users', {
  id: text('id').primaryKey(),
  communityId: text('community_id').notNull().references(() => communities.id),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  token: text('token').notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
  isActive: boolean('is_active').notNull().default(true),
  permissions: text('permissions'), // JSON string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('bot_users_token_idx').on(t.token),
  index('bot_users_community_idx').on(t.communityId),
]);

export const slashCommands = pgTable('slash_commands', {
  id: text('id').primaryKey(),
  botUserId: text('bot_user_id').notNull().references(() => botUsers.id),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('slash_commands_bot_name_idx').on(t.botUserId, t.name),
]);

// ── P2P File Sharing ─────────────────────────────────────────────────

export const p2pFiles = pgTable('p2p_files', {
  id: text('id').primaryKey(),
  messageId: text('message_id').references(() => messages.id),
  channelId: text('channel_id').references(() => channels.id),
  conversationId: text('conversation_id'),
  uploaderUserId: text('uploader_user_id').notNull().references(() => users.id),
  fileName: text('file_name').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),
  mimeType: text('mime_type').notNull(),
  fileHash: text('file_hash').notNull(),
  chunkCount: integer('chunk_count').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('p2p_files_channel_idx').on(t.channelId),
  index('p2p_files_message_idx').on(t.messageId),
  index('p2p_files_hash_idx').on(t.fileHash),
]);

// ── Auth Methods (multi-method auth) ─────────────────────────────────

export const userAuthMethods = pgTable('user_auth_methods', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  type: authMethodTypeEnum('type').notNull(),
  identifier: text('identifier').notNull(), // phone number, email, or OAuth sub
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('user_auth_methods_type_identifier_idx').on(t.type, t.identifier),
  index('user_auth_methods_user_id_idx').on(t.userId),
]);

// ── OTP Codes (phone verification) ───────────────────────────────────

export const otpCodes = pgTable('otp_codes', {
  id: text('id').primaryKey(),
  phoneNumber: text('phone_number').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('otp_codes_phone_number_idx').on(t.phoneNumber),
]);

// ── Contact Hashes (phone contact matching) ──────────────────────────

export const contactHashes = pgTable('contact_hashes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  phoneHash: text('phone_hash').notNull(), // SHA-256 of normalized E.164 phone number
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('contact_hashes_phone_hash_idx').on(t.phoneHash),
  index('contact_hashes_user_id_idx').on(t.userId),
]);

// ── Channel E2EE Keys ────────────────────────────────────────────────

// ── Scheduled Messages ────────────────────────────────────────────────

export const scheduledMessages = pgTable('scheduled_messages', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').references(() => channels.id),
  conversationId: text('conversation_id'),
  authorUserId: text('author_user_id').notNull().references(() => users.id),
  bodyMarkdown: text('body_markdown').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  isCancelled: boolean('is_cancelled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('scheduled_messages_author_idx').on(t.authorUserId),
  index('scheduled_messages_scheduled_at_idx').on(t.scheduledAt),
]);

// ── Channel E2EE Keys ────────────────────────────────────────────────

export const channelKeys = pgTable('channel_keys', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  userId: text('user_id').notNull().references(() => users.id),
  encryptedGroupKey: text('encrypted_group_key').notNull(), // encrypted with user's public key
  keyVersion: integer('key_version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('channel_keys_channel_user_version_idx').on(t.channelId, t.userId, t.keyVersion),
]);

// ── ZK Votes (anonymous voting) ──────────────────────────────────────

export const zkVotes = pgTable('zk_votes', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => polls.id),
  voteHash: text('vote_hash').notNull(),
  nullifier: text('nullifier').notNull(),
  optionId: text('option_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('zk_votes_poll_nullifier_idx').on(t.pollId, t.nullifier),
  index('zk_votes_poll_idx').on(t.pollId),
]);

// ── ZK Credentials (privacy-preserving identity) ─────────────────────

export const zkCredentials = pgTable('zk_credentials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  credentialType: text('credential_type').notNull(),
  credentialHash: text('credential_hash').notNull(),
  metadata: text('metadata'), // JSON string
  isVerified: boolean('is_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('zk_credentials_user_idx').on(t.userId),
]);

// ── Push Tokens (mobile push notifications) ───────────────────────────

export const pushTokenPlatformEnum = pgEnum('push_token_platform', ['ios', 'android', 'web']);

export const pushTokens = pgTable('push_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  token: text('token').notNull(),
  platform: pushTokenPlatformEnum('platform').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('push_tokens_user_token_idx').on(t.userId, t.token),
  index('push_tokens_user_idx').on(t.userId),
]);

// ── Agent Devices (Phase 9B: multi-device AI agent) ─────────────────

export const agentDevices = pgTable('agent_devices', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  platform: devicePlatformEnum('platform').notNull().default('other'),
  state: deviceStateEnum('state').notNull().default('offline'),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
  lastStateChangedAt: timestamp('last_state_changed_at', { withTimezone: true }).notNull().defaultNow(),
  devicePublicKey: text('device_public_key'),
  sharedWithCommunityId: text('shared_with_community_id').references(() => communities.id),
  sharedAllowedRoleIds: text('shared_allowed_role_ids').notNull().default('[]'), // JSON string[]
  heartbeatPayload: text('heartbeat_payload'), // JSON snapshot of latest heartbeat
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('agent_devices_user_slug_idx').on(t.userId, t.slug),
  index('agent_devices_user_idx').on(t.userId),
  index('agent_devices_shared_community_idx').on(t.sharedWithCommunityId),
]);

export const deviceAgents = pgTable('device_agents', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').notNull().references(() => agentDevices.id, { onDelete: 'cascade' }),
  agentSlug: text('agent_slug').notNull(),
  displayName: text('display_name').notNull(),
  version: text('version'),
  defaultVerb: text('default_verb').notNull().default('exec'),
  scopes: text('scopes').notNull().default('[]'), // JSON string[]
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('device_agents_device_slug_idx').on(t.deviceId, t.agentSlug),
  index('device_agents_device_idx').on(t.deviceId),
]);

export const commandExecutions = pgTable('command_executions', {
  id: text('id').primaryKey(),
  requesterUserId: text('requester_user_id').notNull().references(() => users.id),
  deviceId: text('device_id').notNull().references(() => agentDevices.id),
  agentSlug: text('agent_slug').notNull(),
  verb: text('verb').notNull(),
  args: text('args').notNull().default(''),
  rawCommand: text('raw_command').notNull(),
  channelId: text('channel_id').references(() => channels.id),
  channelMessageId: text('channel_message_id').references(() => messages.id),
  dmConversationId: text('dm_conversation_id'),
  status: commandExecutionStatusEnum('status').notNull().default('queued'),
  approvalPolicy: text('approval_policy'), // JSON { kind, n, m, roleIds }
  approvals: text('approvals').notNull().default('[]'), // JSON [{userId, decision, at}]
  stdoutTrunc: text('stdout_trunc'),
  stderrTrunc: text('stderr_trunc'),
  exitCode: integer('exit_code'),
  queuedAt: timestamp('queued_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('command_executions_requester_idx').on(t.requesterUserId),
  index('command_executions_device_idx').on(t.deviceId),
  index('command_executions_channel_idx').on(t.channelId),
  index('command_executions_status_idx').on(t.status),
  index('command_executions_queued_at_idx').on(t.queuedAt),
]);
