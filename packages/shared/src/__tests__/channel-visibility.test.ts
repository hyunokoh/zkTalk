import { describe, expect, it } from 'vitest';
import {
  canUseChannelAsOnboardingStarter,
  getChannelBrowsePresentation,
  getChannelAccessSummaryKey,
  getCommunityChannelAccessSummaryKeys,
  getLockedChannelCopyKey,
  getLockedChannelPromptBodyKey,
  getLockedChannelReason,
  isLockedBrowseChannel,
  resolveChannelBrowseVisibilityState,
  shouldRenderBrowseChannel,
} from '../utils/channel-visibility';

describe('channel visibility helpers', () => {
  it('marks accessible channels as renderable without locked state', () => {
    const channel = { accessPolicy: 'public' as const, canView: true };

    expect(resolveChannelBrowseVisibilityState(channel)).toBe('accessible');
    expect(shouldRenderBrowseChannel(channel)).toBe(true);
    expect(isLockedBrowseChannel(channel)).toBe(false);
    expect(getLockedChannelReason(channel)).toBeNull();
  });

  it('marks members-only browse rows as locked and join-gated', () => {
    const channel = {
      accessPolicy: 'members_only' as const,
      canView: false,
      lockedReason: 'join_required' as const,
    };

    expect(resolveChannelBrowseVisibilityState(channel)).toBe('locked');
    expect(shouldRenderBrowseChannel(channel)).toBe(true);
    expect(isLockedBrowseChannel(channel)).toBe(true);
    expect(getLockedChannelReason(channel)).toBe('join_required');
    expect(getLockedChannelCopyKey(channel)).toBe('channel.lockedJoinRequired');
    expect(getLockedChannelPromptBodyKey(channel)).toBe('channel.lockedPromptJoinBody');
    expect(getChannelBrowsePresentation(channel)).toEqual({
      state: 'locked',
      isLocked: true,
      shouldRender: true,
      lockedReason: 'join_required',
      lockedCopyKey: 'channel.lockedJoinRequired',
      lockedPromptBodyKey: 'channel.lockedPromptJoinBody',
    });
  });

  it('marks invite-only browse rows as locked and invite-gated', () => {
    const channel = {
      accessPolicy: 'invite_only' as const,
      canView: false,
      lockedReason: 'invite_required' as const,
    };

    expect(resolveChannelBrowseVisibilityState(channel)).toBe('locked');
    expect(shouldRenderBrowseChannel(channel)).toBe(true);
    expect(getLockedChannelReason(channel)).toBe('invite_required');
    expect(getLockedChannelCopyKey(channel)).toBe('channel.lockedInviteRequired');
    expect(getLockedChannelPromptBodyKey(channel)).toBe('channel.lockedPromptInviteBody');
  });

  it('keeps private browse rows hidden instead of rendering a lock affordance', () => {
    const channel = {
      accessPolicy: 'private' as const,
      canView: false,
      lockedReason: 'invite_required' as const,
    };

    expect(resolveChannelBrowseVisibilityState(channel)).toBe('hidden');
    expect(shouldRenderBrowseChannel(channel)).toBe(false);
    expect(isLockedBrowseChannel(channel)).toBe(false);
    expect(getLockedChannelReason(channel)).toBeNull();
    expect(getLockedChannelCopyKey(channel)).toBeNull();
    expect(getLockedChannelPromptBodyKey(channel)).toBeNull();
    expect(getChannelBrowsePresentation(channel)).toEqual({
      state: 'hidden',
      isLocked: false,
      shouldRender: false,
      lockedReason: null,
      lockedCopyKey: null,
      lockedPromptBodyKey: null,
    });
  });

  it('keeps archived browse rows hidden even when they would otherwise be accessible', () => {
    const channel = {
      accessPolicy: 'public' as const,
      canView: true,
      isArchived: true,
    };

    expect(resolveChannelBrowseVisibilityState(channel)).toBe('hidden');
    expect(shouldRenderBrowseChannel(channel)).toBe(false);
    expect(isLockedBrowseChannel(channel)).toBe(false);
  });

  it('defaults missing locked reason to join gating for locked rows', () => {
    const channel = {
      accessPolicy: 'members_only' as const,
      canView: false,
    };

    expect(getLockedChannelReason(channel)).toBe('join_required');
    expect(getLockedChannelCopyKey(channel)).toBe('channel.lockedJoinRequired');
  });

  it('supports prompt-state objects that only retain the locked reason', () => {
    const promptState = { lockedReason: 'invite_required' as const };

    expect(getLockedChannelReason(promptState)).toBe('invite_required');
    expect(getLockedChannelPromptBodyKey(promptState)).toBe('channel.lockedPromptInviteBody');
  });

  it('returns the public-community access legend keys in product order', () => {
    expect(getCommunityChannelAccessSummaryKeys('public')).toEqual([
      'community.channelAccessOpenLabel',
      'community.channelAccessJoinLabel',
      'community.channelAccessInviteLabel',
    ]);
    expect(getCommunityChannelAccessSummaryKeys('invite_only')).toEqual([]);
    expect(getCommunityChannelAccessSummaryKeys('private')).toEqual([]);
  });

  it('maps channel policies to the shared access summary labels', () => {
    expect(getChannelAccessSummaryKey('public')).toBe('community.channelAccessOpenLabel');
    expect(getChannelAccessSummaryKey('members_only')).toBe('community.channelAccessJoinLabel');
    expect(getChannelAccessSummaryKey('invite_only')).toBe('community.channelAccessInviteLabel');
    expect(getChannelAccessSummaryKey('private')).toBeNull();
  });

  it('allows only visible starter-channel policies in onboarding', () => {
    expect(canUseChannelAsOnboardingStarter('public')).toBe(true);
    expect(canUseChannelAsOnboardingStarter('members_only')).toBe(true);
    expect(canUseChannelAsOnboardingStarter('invite_only')).toBe(true);
    expect(canUseChannelAsOnboardingStarter('private')).toBe(false);
  });
});
