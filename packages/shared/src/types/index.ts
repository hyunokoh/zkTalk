import type {
  MembershipStatus,
  CommunityVisibility,
  ChannelType,
  ChannelVisibility,
  MessageType,
  ReportStatus,
  PermissionKey,
  PermissionEffect,
} from '../constants/index';

export type { WSIncoming, WSOutgoing, RedisPubSubMessage } from './websocket';

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  visibility: CommunityVisibility;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMembership {
  id: string;
  communityId: string;
  userId: string;
  joinedAt: string;
  membershipStatus: MembershipStatus;
}

export interface Role {
  id: string;
  communityId: string;
  name: string;
  color: string | null;
  priority: number;
  isSystemRole: boolean;
}

export interface Category {
  id: string;
  communityId: string;
  name: string;
  position: number;
}

export interface Channel {
  id: string;
  communityId: string;
  categoryId: string | null;
  sourceDmConversationId?: string | null;
  name: string;
  description: string | null;
  type: ChannelType;
  visibility: ChannelVisibility;
  slowModeSeconds: number;
  position: number;
  isArchived: boolean;
  isE2eeEnabled: boolean;
  disappearingDuration: number | null;
  requireTopic: boolean;
  sourceDmConversation?: {
    id: string;
    name: string | null;
    type: 'direct' | 'group';
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelRolePermission {
  id: string;
  channelId: string;
  roleId: string;
  permissionKey: PermissionKey;
  effect: PermissionEffect;
}

export interface Thread {
  id: string;
  channelId: string;
  rootMessageId: string;
  title: string | null;
  createdByUserId: string;
  isLocked: boolean;
  isPinned: boolean;
  replyCount: number;
  lastActivityAt: string;
}

export interface Message {
  id: string;
  communityId: string;
  channelId: string;
  threadId: string | null;
  parentMessageId: string | null;
  authorUserId: string;
  bodyMarkdown: string;
  bodyPlaintext: string;
  messageType: MessageType;
  isEdited: boolean;
  isDeleted: boolean;
  isEncrypted: boolean;
  topic: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  messageId?: string | null;
  dmMessageId?: string | null;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Invite {
  id: string;
  communityId: string;
  code: string;
  createdByUserId: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
}

export interface Report {
  id: string;
  communityId: string;
  messageId: string | null;
  reportedUserId: string | null;
  reporterUserId: string;
  reasonCode: string;
  reasonText: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedByUserId: string | null;
}

export interface ModerationAction {
  id: string;
  communityId: string;
  actorUserId: string;
  targetUserId: string | null;
  targetMessageId: string | null;
  actionType: string;
  reason: string | null;
  createdAt: string;
}

export interface Webhook {
  id: string;
  communityId: string;
  channelId: string;
  name: string;
  token: string;
  avatarUrl: string | null;
  createdByUserId: string;
  isActive: boolean;
  createdAt: string;
}

export interface BotUser {
  id: string;
  communityId: string;
  name: string;
  avatarUrl: string | null;
  token: string;
  createdByUserId: string;
  isActive: boolean;
  permissions: string | null;
  createdAt: string;
}

export interface SlashCommand {
  id: string;
  botUserId: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export type AuthMethodType = 'phone' | 'email' | 'google' | 'apple';

export interface UserAuthMethod {
  id: string;
  userId: string;
  type: AuthMethodType;
  identifier: string;
  verifiedAt: string | null;
  createdAt: string;
}

export interface LastVisitedLocation {
  kind: 'community' | 'channel' | 'thread' | 'dm';
  communityId?: string;
  channelId?: string;
  threadId?: string;
  conversationId?: string;
}

export interface UserSettings {
  communityOrder: string[];
  collapsedSections: Record<string, boolean>;
  lastVisited: LastVisitedLocation | null;
  updatedAt: string;
}

export interface UpdateUserSettingsInput {
  communityOrder?: string[];
  collapsedSections?: Record<string, boolean>;
  lastVisited?: LastVisitedLocation | null;
}
