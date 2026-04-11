import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChannelPage from '../page';

const mockMarkRead = vi.fn();
const mockSaveLastVisited = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({
    channelId: 'channel-1',
    slug: 'alpha-team',
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0];

    if (key === 'channel') {
      return {
        data: {
          id: 'channel-1',
          communityId: 'community-1',
          name: 'General',
          description: 'Channel description',
          type: 'chat',
        },
      };
    }

    if (key === 'community') {
      return {
        data: {
          id: 'community-1',
          name: 'Alpha Team',
        },
      };
    }

    if (key === 'channel-me-permissions') {
      return {
        data: {
          canPostMessage: true,
        },
      };
    }

    if (key === 'ai-runtime') {
      return {
        data: {
          provider: 'mock',
          status: 'mock',
          issue: 'mock runtime',
        },
      };
    }

    if (key === 'user-settings') {
      return {
        data: {
          translationDisplay: {
            uiLocale: 'en',
            mode: 'target_language_except_readable',
            targetLanguage: 'en',
            readableLanguages: ['en'],
          },
        },
      };
    }

    return { data: undefined };
  },
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  ApiError: class MockApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/lib/ai-runtime', () => ({
  fetchAiRuntime: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/user-settings', () => ({
  fetchUserSettings: vi.fn(),
  saveLastVisited: (...args: unknown[]) => mockSaveLastVisited(...args),
}));

vi.mock('@/stores/unread', () => ({
  useUnreadStore: (selector: (state: { markRead: typeof mockMarkRead }) => unknown) =>
    selector({ markRead: mockMarkRead }),
}));

vi.mock('@/components/ForumPostList', () => ({
  ForumPostList: () => <div>ForumPostListMock</div>,
}));

vi.mock('@/components/VoiceRoom', () => ({
  VoiceRoomButton: () => <div>VoiceRoomButtonMock</div>,
}));

vi.mock('@/components/MessageList', () => ({
  MessageList: ({
    onReplyToMessage,
    onRequestAiAction,
    translationDisplayPreference,
  }: {
    onReplyToMessage?: (message: { id: string }, author: { displayName: string } | null) => void;
    onRequestAiAction?: (
      message: { id: string; bodyMarkdown: string; bodyPlaintext: string },
      author: { displayName: string } | null,
      action: 'reply-draft' | 'rewrite-draft' | 'translate-inline'
    ) => void;
    translationDisplayPreference?: {
      mode: string;
      targetLanguage?: string | null;
    };
  }) => (
    <div>
      <div
        data-testid="channel-translation-mode"
        data-mode={translationDisplayPreference?.mode ?? ''}
        data-target-language={translationDisplayPreference?.targetLanguage ?? ''}
      />
      <button
        type="button"
        data-testid="channel-reply"
        onClick={() => onReplyToMessage?.({ id: 'message-reply' }, { displayName: 'Alice' })}
      >
        reply-target
      </button>
      <button
        type="button"
        data-testid="channel-ai-reply"
        onClick={() =>
          onRequestAiAction?.(
            {
              id: 'message-1',
              bodyMarkdown: '**Need** a reply draft.',
              bodyPlaintext: 'Need a reply draft.',
            },
            { displayName: 'Alice' },
            'reply-draft',
          )}
      >
        reply
      </button>
      <button
        type="button"
        data-testid="channel-ai-rewrite"
        onClick={() =>
          onRequestAiAction?.(
            {
              id: 'message-2',
              bodyMarkdown: '**Tighten** this draft.',
              bodyPlaintext: 'Tighten this draft.',
            },
            { displayName: 'Bob' },
            'rewrite-draft',
          )}
      >
        rewrite
      </button>
      <button
        type="button"
        data-testid="channel-ai-translate"
        onClick={() =>
          onRequestAiAction?.(
            {
              id: 'message-3',
              bodyMarkdown: '**Translate** this inline.',
              bodyPlaintext: 'Translate this inline.',
            },
            { displayName: 'Carol' },
            'translate-inline',
          )}
      >
        translate
      </button>
    </div>
  ),
}));

vi.mock('@/components/MessageComposer', () => ({
  MessageComposer: ({
    aiActionRequest,
    replyTo,
    onAiActionRequestHandled,
  }: {
    aiActionRequest?: {
      action: string;
      surface: string;
      sourceMessage: { id: string; bodyText: string; authorDisplayName?: string | null };
    } | null;
    replyTo?: { message: { id: string } } | null;
    onAiActionRequestHandled?: () => void;
  }) => (
    <div>
      <div
        data-testid="channel-composer"
        data-ai-action={aiActionRequest?.action ?? ''}
        data-ai-surface={aiActionRequest?.surface ?? ''}
        data-source-message-id={aiActionRequest?.sourceMessage.id ?? ''}
        data-source-body={aiActionRequest?.sourceMessage.bodyText ?? ''}
        data-source-author={aiActionRequest?.sourceMessage.authorDisplayName ?? ''}
        data-reply-target={replyTo?.message.id ?? ''}
      />
      <button
        type="button"
        data-testid="channel-handle-ai"
        onClick={() => onAiActionRequestHandled?.()}
      >
        handle-ai
      </button>
    </div>
  ),
}));

describe('ChannelPage selected-message AI wiring', () => {
  it('routes selected-message reply and rewrite actions into the composer with explicit targets while leaving inline translation on the message surface', () => {
    render(<ChannelPage />);

    expect(mockMarkRead).toHaveBeenCalledWith('channel-1');
    expect(mockSaveLastVisited).toHaveBeenCalledWith({
      kind: 'channel',
      communityId: 'community-1',
      channelId: 'channel-1',
    });
    expect(screen.getByTestId('channel-translation-mode').getAttribute('data-mode')).toBe(
      'target_language_except_readable',
    );
    expect(
      screen.getByTestId('channel-translation-mode').getAttribute('data-target-language'),
    ).toBe('en');

    fireEvent.click(screen.getByTestId('channel-reply'));
    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('message-reply');

    fireEvent.click(screen.getByTestId('channel-ai-reply'));

    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-action')).toBe('reply-draft');
    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-surface')).toBe('channel');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-message-id')).toBe('message-1');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-body')).toBe('Need a reply draft.');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-author')).toBe('Alice');
    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('message-1');

    fireEvent.click(screen.getByTestId('channel-handle-ai'));

    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-action')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-surface')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-message-id')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-body')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-author')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('message-1');

    fireEvent.click(screen.getByTestId('channel-ai-rewrite'));

    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-action')).toBe('rewrite-draft');
    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-surface')).toBe('channel');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-message-id')).toBe('message-2');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-body')).toBe('Tighten this draft.');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-author')).toBe('Bob');
    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('');

    fireEvent.click(screen.getByTestId('channel-handle-ai'));

    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-action')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-surface')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-message-id')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-body')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-author')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('');

    fireEvent.click(screen.getByTestId('channel-ai-translate'));

    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-action')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-surface')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-message-id')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-body')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-source-author')).toBe('');
  });

  it('clears a retained reply target when inline translation is triggered after a selected-message reply draft', () => {
    render(<ChannelPage />);

    fireEvent.click(screen.getByTestId('channel-ai-reply'));
    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('message-1');

    fireEvent.click(screen.getByTestId('channel-handle-ai'));
    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('message-1');

    fireEvent.click(screen.getByTestId('channel-ai-translate'));

    expect(screen.getByTestId('channel-composer').getAttribute('data-reply-target')).toBe('');
    expect(screen.getByTestId('channel-composer').getAttribute('data-ai-action')).toBe('');
  });
});
