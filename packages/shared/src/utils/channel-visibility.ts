import type { ChannelAccessPolicy, CommunityVisibility } from '../constants/index';

export type LockedChannelReason = 'join_required' | 'invite_required';
export type ChannelBrowseVisibilityState = 'accessible' | 'locked' | 'hidden';
export type CommunityChannelAccessLabelKey =
  | 'community.channelAccessOpenLabel'
  | 'community.channelAccessJoinLabel'
  | 'community.channelAccessInviteLabel';
export type LockedChannelCopyKey =
  | 'channel.lockedJoinRequired'
  | 'channel.lockedInviteRequired';
export type LockedChannelPromptBodyKey =
  | 'channel.lockedPromptJoinBody'
  | 'channel.lockedPromptInviteBody';

export const PUBLIC_COMMUNITY_CHANNEL_ACCESS_LABEL_KEYS: readonly CommunityChannelAccessLabelKey[] = [
  'community.channelAccessOpenLabel',
  'community.channelAccessJoinLabel',
  'community.channelAccessInviteLabel',
];

export const ONBOARDING_STARTER_CHANNEL_ACCESS_POLICIES: readonly ChannelAccessPolicy[] = [
  'public',
  'members_only',
  'invite_only',
];

export interface ChannelBrowseVisibilityLike {
  accessPolicy?: ChannelAccessPolicy;
  canView?: boolean;
  lockedReason?: LockedChannelReason;
  isArchived?: boolean;
}

export interface ChannelBrowsePresentation {
  state: ChannelBrowseVisibilityState;
  isLocked: boolean;
  shouldRender: boolean;
  lockedReason: LockedChannelReason | null;
  lockedCopyKey: LockedChannelCopyKey | null;
  lockedPromptBodyKey: LockedChannelPromptBodyKey | null;
}

export function getCommunityChannelAccessSummaryKeys(
  visibility?: CommunityVisibility,
): readonly CommunityChannelAccessLabelKey[] {
  return visibility === 'public' ? PUBLIC_COMMUNITY_CHANNEL_ACCESS_LABEL_KEYS : [];
}

export function getChannelAccessSummaryKey(
  accessPolicy?: ChannelAccessPolicy,
): CommunityChannelAccessLabelKey | null {
  if (accessPolicy === 'public') {
    return 'community.channelAccessOpenLabel';
  }

  if (accessPolicy === 'invite_only') {
    return 'community.channelAccessInviteLabel';
  }

  if (accessPolicy === 'members_only') {
    return 'community.channelAccessJoinLabel';
  }

  return null;
}

export function canUseChannelAsOnboardingStarter(accessPolicy?: ChannelAccessPolicy): boolean {
  if (!accessPolicy) {
    return false;
  }

  return ONBOARDING_STARTER_CHANNEL_ACCESS_POLICIES.includes(accessPolicy);
}

export function resolveChannelBrowseVisibilityState(
  channel: ChannelBrowseVisibilityLike,
): ChannelBrowseVisibilityState {
  if (channel.isArchived) {
    return 'hidden';
  }

  if (channel.canView === false) {
    return channel.accessPolicy === 'private' ? 'hidden' : 'locked';
  }

  return 'accessible';
}

export function isLockedBrowseChannel(channel: ChannelBrowseVisibilityLike): boolean {
  return resolveChannelBrowseVisibilityState(channel) === 'locked';
}

export function shouldRenderBrowseChannel(channel: ChannelBrowseVisibilityLike): boolean {
  return resolveChannelBrowseVisibilityState(channel) !== 'hidden';
}

export function getLockedChannelReason(
  channel: ChannelBrowseVisibilityLike,
): LockedChannelReason | null {
  if (channel.canView === false) {
    if (channel.accessPolicy === 'private') {
      return null;
    }

    return channel.lockedReason === 'invite_required' ? 'invite_required' : 'join_required';
  }

  if (channel.lockedReason === 'invite_required') {
    return 'invite_required';
  }

  if (channel.lockedReason === 'join_required') {
    return 'join_required';
  }

  return null;
}

export function getLockedChannelCopyKey(
  channel: ChannelBrowseVisibilityLike,
): LockedChannelCopyKey | null {
  const reason = getLockedChannelReason(channel);
  if (!reason) {
    return null;
  }

  return reason === 'invite_required'
    ? 'channel.lockedInviteRequired'
    : 'channel.lockedJoinRequired';
}

export function getLockedChannelPromptBodyKey(
  channel: ChannelBrowseVisibilityLike,
): LockedChannelPromptBodyKey | null {
  const reason = getLockedChannelReason(channel);
  if (!reason) {
    return null;
  }

  return reason === 'invite_required'
    ? 'channel.lockedPromptInviteBody'
    : 'channel.lockedPromptJoinBody';
}

export function getChannelBrowsePresentation(
  channel: ChannelBrowseVisibilityLike,
): ChannelBrowsePresentation {
  const state = resolveChannelBrowseVisibilityState(channel);
  const lockedReason = getLockedChannelReason(channel);

  return {
    state,
    isLocked: state === 'locked',
    shouldRender: state !== 'hidden',
    lockedReason,
    lockedCopyKey: getLockedChannelCopyKey(channel),
    lockedPromptBodyKey: getLockedChannelPromptBodyKey(channel),
  };
}
