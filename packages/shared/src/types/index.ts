import type {
  MembershipStatus,
  CommunityVisibility,
  ChannelType,
  ChannelVisibility,
  ChannelAccessPolicy,
  MessageType,
  ReportStatus,
  PermissionKey,
  PermissionEffect,
  MachineType,
  MachinePresenceStatus,
  MachineCodexAuthState,
  MachineExecutionIntent,
  MachineCommandStatus,
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
  discovery?: {
    isDiscoverable: boolean;
    canSelfJoin: boolean;
  };
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
  accessPolicy: ChannelAccessPolicy;
  slowModeSeconds: number;
  position: number;
  isArchived: boolean;
  isE2eeEnabled: boolean;
  disappearingDuration: number | null;
  requireTopic: boolean;
  canView?: boolean;
  lockedReason?: 'join_required' | 'invite_required';
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

export type TranslationDisplayMode =
  | 'manual_only'
  | 'target_language_all'
  | 'target_language_except_readable';

export type TranslationDisplayPresetId =
  | 'english_only'
  | 'korean_preferred_english_readable'
  | 'manual_only';

export interface TranslationDisplayPreference {
  uiLocale: string;
  mode: TranslationDisplayMode;
  targetLanguage: string | null;
  readableLanguages: string[];
}

export interface TranslationDisplayPreset {
  id: TranslationDisplayPresetId;
  label: string;
  description: string;
  bridgeInstruction: string;
  translationDisplay: TranslationDisplayPreference;
}

export interface UserSettings {
  communityOrder: string[];
  collapsedSections: Record<string, boolean>;
  lastVisited: LastVisitedLocation | null;
  translationDisplay: TranslationDisplayPreference;
  updatedAt: string;
}

export interface UpdateUserSettingsInput {
  communityOrder?: string[];
  collapsedSections?: Record<string, boolean>;
  lastVisited?: LastVisitedLocation | null;
  translationDisplay?: TranslationDisplayPreference;
}

export interface LocalMachine {
  id: string;
  ownerUserId: string;
  name: string;
  type: MachineType;
  bridgeIdentifier: string;
  codexAuthState: MachineCodexAuthState;
  presence: MachinePresenceStatus;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterLocalMachineInput {
  name: string;
  type: MachineType;
  bridgeIdentifier: string;
}

export interface LocalMachinePresence {
  machineId: string;
  ownerUserId: string;
  status: MachinePresenceStatus;
  codexAuthState: MachineCodexAuthState;
  activeCommandId: string | null;
  lastSeenAt: string;
  expiresAt: string;
}

export interface LocalMachineCommandSource {
  kind: 'channel' | 'thread' | 'dm' | 'control';
  communityId?: string | null;
  channelId?: string | null;
  threadId?: string | null;
  conversationId?: string | null;
}

export interface LocalMachineSelectedMessageExcerpt {
  messageId: string;
  authorUserId: string;
  bodyPlaintext: string;
  createdAt: string;
}

export interface LocalMachineAttachmentReference {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
}

export interface LocalMachineCommandEnvelope {
  id: string;
  targetMachineId: string;
  owningUserId: string;
  source: LocalMachineCommandSource;
  instruction: string;
  intent: MachineExecutionIntent;
  selectedMessages: LocalMachineSelectedMessageExcerpt[];
  attachmentReferences: LocalMachineAttachmentReference[];
  createdAt: string;
}

export interface LocalMachineCommandUpdate {
  commandId: string;
  targetMachineId: string;
  owningUserId: string;
  status: MachineCommandStatus;
  summary: string | null;
  outputText: string | null;
  errorCode:
    | 'offline'
    | 'busy'
    | 'auth_missing'
    | 'bridge_missing'
    | 'timed_out'
    | 'rejected'
    | null;
  createdAt: string;
}

// ── Phase 9B: Agent Devices & Commands ─────────────────────────────

export type DevicePlatform = 'macos' | 'linux' | 'windows' | 'mobile' | 'other';

export type DeviceState = 'online' | 'busy' | 'degraded' | 'offline' | 'suspended';

export type CommandExecutionStatus =
  | 'queued'
  | 'awaiting_approval'
  | 'approved'
  | 'running'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'timeout'
  | 'cancelled';

export interface AgentDevice {
  id: string;
  userId: string;
  name: string;
  slug: string;
  platform: DevicePlatform;
  state: DeviceState;
  lastHeartbeatAt: string | null;
  lastStateChangedAt: string;
  sharedWithCommunityId: string | null;
  sharedAllowedRoleIds: string[];
  heartbeat: DeviceHeartbeatSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceHeartbeatSummary {
  at: string;
  cpu: number;          // 0..1 normalised
  ramUsed: number;      // bytes
  ramTotal: number;     // bytes
  runningCount: number;
  agents: string[];     // slug@version list
}

export interface DeviceAgent {
  id: string;
  deviceId: string;
  agentSlug: string;     // e.g., "shell", "claude-code"
  displayName: string;
  version: string | null;
  defaultVerb: string;
  scopes: string[];      // e.g., ["read:~/Documents", "exec:git"]
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommandApprovalPolicy {
  kind: 'self' | 'owner' | 'n_of_m' | 'role';
  n?: number;            // approvals required
  m?: number;            // eligible pool size
  roleIds?: string[];    // for 'role' or 'n_of_m' scoped to roles
}

export interface CommandApprovalDecision {
  userId: string;
  decision: 'approved' | 'rejected';
  at: string;
}

export interface CommandExecution {
  id: string;
  requesterUserId: string;
  deviceId: string;
  agentSlug: string;
  verb: string;
  args: string;
  rawCommand: string;    // original `/home-pc.shell find …` string
  channelId: string | null;
  channelMessageId: string | null;
  dmConversationId: string | null;
  status: CommandExecutionStatus;
  approvalPolicy: CommandApprovalPolicy | null;
  approvals: CommandApprovalDecision[];
  stdoutTrunc: string | null;
  stderrTrunc: string | null;
  exitCode: number | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface RegisterAgentDeviceInput {
  name: string;
  slug: string;
  platform: DevicePlatform;
  devicePublicKey?: string;
}

export interface RegisterDeviceAgentInput {
  agentSlug: string;
  displayName: string;
  version?: string;
  defaultVerb?: string;
  scopes?: string[];
}

export interface QueueCommandInput {
  // Supply either deviceSlug or deviceId. Validated at the schema layer.
  deviceSlug?: string;
  deviceId?: string;
  agentSlug: string;
  verb?: string;             // defaults to agent.defaultVerb
  args?: string;
  rawCommand: string;
  channelId?: string | null;
  dmConversationId?: string | null;
}
