import { describe, expect, it } from 'vitest';
import { resolveChannelSurfaceActionOrder } from '../utils/chat-surface-actions';

describe('resolveChannelSurfaceActionOrder', () => {
  it('keeps shared header actions in a stable primary and overflow order', () => {
    expect(
      resolveChannelSurfaceActionOrder({
        showSearch: true,
        showPins: true,
        showSourceDm: true,
        showPolls: true,
        showEditChannel: true,
        showCommunitySettings: true,
      }),
    ).toEqual({
      primary: ['search', 'pins'],
      overflow: ['source_dm', 'polls', 'edit_channel', 'community_settings'],
    });
  });

  it('drops unavailable actions without reordering the remaining model', () => {
    expect(
      resolveChannelSurfaceActionOrder({
        showPins: true,
        showEditChannel: true,
      }),
    ).toEqual({
      primary: ['pins'],
      overflow: ['edit_channel'],
    });
  });
});
