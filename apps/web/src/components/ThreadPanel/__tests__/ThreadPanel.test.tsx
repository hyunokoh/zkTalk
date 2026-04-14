import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThreadPanel } from '../ThreadPanel';

const mockCloseThread = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: vi.fn(),
  }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0];

    if (key === 'thread') {
      return {
        data: {
          thread: {
            id: 'thread-1',
            title: 'Thread title',
          },
          isFollowing: false,
          permissions: {
            canPostReply: true,
            canModerateThread: true,
          },
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
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}));

vi.mock('@/lib/ai-runtime', () => ({
  fetchAiRuntime: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/thread', () => ({
  useThreadStore: (selector: (state: {
    activeThreadId: string | null;
    closeThread: typeof mockCloseThread;
  }) => unknown) =>
    selector({
      activeThreadId: 'thread-1',
      closeThread: mockCloseThread,
    }),
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
      mode?: string;
      targetLanguage?: string | null;
    };
  }) => (
    <div>
      <div
        data-testid="thread-message-list"
        data-translation-mode={translationDisplayPreference?.mode ?? ''}
        data-translation-target={translationDisplayPreference?.targetLanguage ?? ''}
      />
      <button
        type="button"
        data-testid="thread-reply"
        onClick={() => onReplyToMessage?.({ id: 'message-reply' }, { displayName: 'Alice' })}
      >
        reply
      </button>
      <button
        type="button"
        data-testid="thread-ai-reply"
        onClick={() =>
          onRequestAiAction?.(
            {
              id: 'message-ai-reply',
              bodyMarkdown: '**Draft** a reply.',
              bodyPlaintext: 'Draft a reply.',
            },
            { displayName: 'Alice' },
            'reply-draft',
          )}
      >
        ai-reply
      </button>
      <button
        type="button"
        data-testid="thread-ai-rewrite"
        onClick={() =>
          onRequestAiAction?.(
            {
              id: 'message-ai-rewrite',
              bodyMarkdown: '**Rewrite** this draft.',
              bodyPlaintext: 'Rewrite this draft.',
            },
            { displayName: 'Bob' },
            'rewrite-draft',
          )}
      >
        ai-rewrite
      </button>
      <button
        type="button"
        data-testid="thread-ai-translate"
        onClick={() =>
          onRequestAiAction?.(
            {
              id: 'message-ai-translate',
              bodyMarkdown: '**Translate** this thread reply.',
              bodyPlaintext: 'Translate this thread reply.',
            },
            { displayName: 'Carol' },
            'translate-inline',
          )}
      >
        ai-translate
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
        data-testid="thread-composer"
        data-ai-action={aiActionRequest?.action ?? ''}
        data-ai-surface={aiActionRequest?.surface ?? ''}
        data-source-message-id={aiActionRequest?.sourceMessage.id ?? ''}
        data-source-body={aiActionRequest?.sourceMessage.bodyText ?? ''}
        data-source-author={aiActionRequest?.sourceMessage.authorDisplayName ?? ''}
        data-reply-target={replyTo?.message.id ?? ''}
      />
      <button
        type="button"
        data-testid="thread-handle-ai"
        onClick={() => onAiActionRequestHandled?.()}
      >
        handle-ai
      </button>
    </div>
  ),
}));

describe('ThreadPanel selected-message AI wiring', () => {
  it('passes the current translation display preference through to thread message rows', () => {
    render(<ThreadPanel channelId="channel-1" />);

    expect(screen.getByTestId('thread-message-list').getAttribute('data-translation-mode')).toBe(
      'target_language_except_readable',
    );
    expect(screen.getByTestId('thread-message-list').getAttribute('data-translation-target')).toBe(
      'en',
    );
  });

  it('keeps reply-draft on the reply path, clears it for rewrite, and leaves inline translation on the message surface', () => {
    render(<ThreadPanel channelId="channel-1" />);

    fireEvent.click(screen.getByTestId('thread-reply'));
    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe('message-reply');

    fireEvent.click(screen.getByTestId('thread-ai-reply'));

    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-action')).toBe('reply-draft');
    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-surface')).toBe('thread');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-message-id')).toBe('message-ai-reply');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-body')).toBe('Draft a reply.');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-author')).toBe('Alice');
    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe('message-ai-reply');

    fireEvent.click(screen.getByTestId('thread-handle-ai'));

    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-action')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-surface')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-message-id')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-body')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-author')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe('message-ai-reply');

    fireEvent.click(screen.getByTestId('thread-ai-rewrite'));

    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-action')).toBe('rewrite-draft');
    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-surface')).toBe('thread');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-message-id')).toBe('message-ai-rewrite');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-body')).toBe('Rewrite this draft.');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-author')).toBe('Bob');
    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe('');

    fireEvent.click(screen.getByTestId('thread-handle-ai'));

    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-action')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-surface')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-message-id')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-body')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-author')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe('');

    fireEvent.click(screen.getByTestId('thread-ai-translate'));

    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-action')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-surface')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-message-id')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-body')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-source-author')).toBe('');
  });

  it('clears a retained reply target when inline translation is triggered after a selected-message reply draft', () => {
    render(<ThreadPanel channelId="channel-1" />);

    fireEvent.click(screen.getByTestId('thread-ai-reply'));
    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe(
      'message-ai-reply',
    );

    fireEvent.click(screen.getByTestId('thread-handle-ai'));
    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe(
      'message-ai-reply',
    );

    fireEvent.click(screen.getByTestId('thread-ai-translate'));

    expect(screen.getByTestId('thread-composer').getAttribute('data-reply-target')).toBe('');
    expect(screen.getByTestId('thread-composer').getAttribute('data-ai-action')).toBe('');
  });
});
