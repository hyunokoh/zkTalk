export const MembershipStatus = {
  ACTIVE: 'active',
  MUTED: 'muted',
  BANNED: 'banned',
  LEFT: 'left',
} as const;
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const CommunityVisibility = {
  PUBLIC: 'public',
  INVITE_ONLY: 'invite_only',
  PRIVATE: 'private',
} as const;
export type CommunityVisibility = (typeof CommunityVisibility)[keyof typeof CommunityVisibility];

export const ChannelType = {
  CHAT: 'chat',
  ANNOUNCEMENT: 'announcement',
  FORUM: 'forum',
  VOICE: 'voice',
} as const;
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export const ChannelVisibility = {
  PUBLIC: 'public',
  ROLE_RESTRICTED: 'role_restricted',
} as const;
export type ChannelVisibility = (typeof ChannelVisibility)[keyof typeof ChannelVisibility];

export const ChannelAccessPolicy = {
  PUBLIC: 'public',
  MEMBERS_ONLY: 'members_only',
  INVITE_ONLY: 'invite_only',
  PRIVATE: 'private',
} as const;
export type ChannelAccessPolicy = (typeof ChannelAccessPolicy)[keyof typeof ChannelAccessPolicy];

export const MessageType = {
  USER: 'user',
  SYSTEM: 'system',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const ReportStatus = {
  OPEN: 'open',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const SystemRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

export const PermissionKey = {
  VIEW_CHANNEL: 'view_channel',
  POST_MESSAGE: 'post_message',
  CREATE_THREAD: 'create_thread',
  UPLOAD_ATTACHMENT: 'upload_attachment',
  REACT: 'react',
  MANAGE_MESSAGES: 'manage_messages',
  PIN_MESSAGES: 'pin_messages',
  MANAGE_CHANNELS: 'manage_channels',
  MANAGE_ROLES: 'manage_roles',
  MODERATE_MEMBERS: 'moderate_members',
  MANAGE_INVITES: 'manage_invites',
} as const;
export type PermissionKey = (typeof PermissionKey)[keyof typeof PermissionKey];

export const PermissionEffect = {
  ALLOW: 'allow',
  DENY: 'deny',
} as const;
export type PermissionEffect = (typeof PermissionEffect)[keyof typeof PermissionEffect];

export const WebSocketEvent = {
  CHANNEL_CREATED: 'channel.created',
  CHANNEL_UPDATED: 'channel.updated',
  CHANNEL_ARCHIVED: 'channel.archived',
  MESSAGE_CREATED: 'message.created',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',
  MESSAGE_REACTION_ADDED: 'message.reaction_added',
  MESSAGE_REACTION_REMOVED: 'message.reaction_removed',
  THREAD_CREATED: 'thread.created',
  THREAD_UPDATED: 'thread.updated',
  THREAD_LOCKED: 'thread.locked',
  PRESENCE_UPDATED: 'presence.updated',
  PROFILE_UPDATED: 'profile.updated',
  TYPING_STARTED: 'typing.started',
  TYPING_STOPPED: 'typing.stopped',
  MEMBER_MUTED: 'member.muted',
  MEMBER_BANNED: 'member.banned',
  REPORT_CREATED: 'report.created',
  VOICE_USER_JOINED: 'voice.user_joined',
  VOICE_USER_LEFT: 'voice.user_left',
  DM_MESSAGE_CREATED: 'dm.message_created',
  DM_MESSAGE_UPDATED: 'dm.message_updated',
  DM_MESSAGE_DELETED: 'dm.message_deleted',
  DM_CONVERSATION_CREATED: 'dm.conversation_created',
  DM_CONVERSATION_UPDATED: 'dm.conversation_updated',
  P2P_SIGNAL: 'p2p.signal',
  P2P_FILE_REQUEST: 'p2p.file_request',
  P2P_FILE_AVAILABLE: 'p2p.file_available',
  MACHINE_REGISTERED: 'machine.registered',
  MACHINE_PRESENCE_UPDATED: 'machine.presence.updated',
  MACHINE_COMMAND_UPDATED: 'machine.command.updated',
} as const;
export type WebSocketEvent = (typeof WebSocketEvent)[keyof typeof WebSocketEvent];

export const MachineType = {
  DESKTOP: 'desktop',
  LAPTOP: 'laptop',
  BUILDBOX: 'buildbox',
  OTHER: 'other',
} as const;
export type MachineType = (typeof MachineType)[keyof typeof MachineType];

export const MachinePresenceStatus = {
  ONLINE: 'online',
  BUSY: 'busy',
  OFFLINE: 'offline',
  AUTH_MISSING: 'auth_missing',
  BRIDGE_MISSING: 'bridge_missing',
} as const;
export type MachinePresenceStatus =
  (typeof MachinePresenceStatus)[keyof typeof MachinePresenceStatus];

export const MachineCodexAuthState = {
  AUTH_PRESENT: 'auth_present',
  AUTH_MISSING: 'auth_missing',
} as const;
export type MachineCodexAuthState =
  (typeof MachineCodexAuthState)[keyof typeof MachineCodexAuthState];

export const MachineExecutionIntent = {
  ANALYZE: 'analyze',
  EDIT: 'edit',
  RUN: 'run',
  SUMMARIZE: 'summarize',
} as const;
export type MachineExecutionIntent =
  (typeof MachineExecutionIntent)[keyof typeof MachineExecutionIntent];

export const MachineCommandStatus = {
  QUEUED: 'queued',
  ACCEPTED: 'accepted',
  STREAMING: 'streaming',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REJECTED: 'rejected',
} as const;
export type MachineCommandStatus =
  (typeof MachineCommandStatus)[keyof typeof MachineCommandStatus];
