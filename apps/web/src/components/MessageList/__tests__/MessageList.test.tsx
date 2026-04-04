import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attachment, Message, User } from '@zktalk/shared';
import { MessageList } from '../MessageList';

const { mockApi, mockUseChannel } = vi.hoisted(() => ({
  mockApi: vi.fn(),
  mockUseChannel: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: mockApi,
}));

vi.mock('@/hooks/useChannel', () => ({
  useChannel: mockUseChannel,
}));

vi.mock('@/hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => ({ typingUsers: [] }),
}));

vi.mock('@/lib/offline-message-sync', () => ({
  ensureOfflineQueueAutoRetry: vi.fn(),
  flushOfflineQueueForChannel: vi.fn(),
  getRenderedOfflineMessageId: (id: string) => `offline-queued-${id}`,
  refreshOfflineChannelCounts: vi.fn(),
  removeOfflineQueuedMessage: vi.fn(),
  retryOfflineQueuedMessage: vi.fn(),
}));

vi.mock('@/stores/offline-queue', () => ({
  useOfflineQueueStore: (selector: (state: {
    pendingByChannel: Record<string, number>;
    failedByChannel: Record<string, number>;
    queuedMessagesByChannel: Record<string, unknown[]>;
  }) => unknown) =>
    selector({
      pendingByChannel: {},
      failedByChannel: {},
      queuedMessagesByChannel: {},
    }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) =>
    selector({ user: null }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/MessageItem', () => ({
  MessageItem: ({
    message,
    reactions = [],
    poll = null,
  }: {
    message: { id: string };
    reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
    poll?: { question?: string } | null;
  }) => (
    <div
      data-testid={`message-item-${message.id}`}
      data-reactions={JSON.stringify(reactions)}
      data-poll-question={poll?.question ?? ''}
    />
  ),
}));

function renderMessageList() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MessageList channelId="channel-1" />
    </QueryClientProvider>,
  );
}

describe('MessageList', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockUseChannel.mockReset();
    Object.defineProperty(globalThis.Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it('loads visible message reactions in a single batch request', async () => {
    const author: User = {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      username: 'alice',
      avatarUrl: null,
      bio: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    };

    const buildMessage = (id: string, bodyMarkdown: string): Message => ({
      id,
      communityId: 'community-1',
      channelId: 'channel-1',
      threadId: null,
      parentMessageId: null,
      authorUserId: author.id,
      bodyMarkdown,
      bodyPlaintext: bodyMarkdown,
      messageType: 'user',
      isEdited: false,
      isDeleted: false,
      isEncrypted: false,
      topic: null,
      expiresAt: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    });

    const rows: Array<{ message: Message; author: User; attachments?: Attachment[] }> = [
      { message: buildMessage('message-1', 'hello'), author, attachments: [] },
      { message: buildMessage('message-2', 'world'), author, attachments: [] },
    ];

    mockApi.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/channels/channel-1/messages?')) {
        return {
          messages: rows,
          hasMore: false,
          nextCursor: null,
        };
      }

      if (path.startsWith('/api/reactions?')) {
        return {
          reactionsByMessageId: {
            'message-1': [
              {
                emoji: '👍',
                count: 2,
                users: [{ id: 'user-1' }, { id: 'user-2' }],
              },
            ],
            'message-2': [
              {
                emoji: '🔥',
                count: 1,
                userIds: ['user-3'],
              },
            ],
          },
        };
      }

      if (path.startsWith('/api/polls?')) {
        return {
          pollsByMessageId: {},
        };
      }

      throw new Error(`Unexpected api call: ${path}`);
    });

    renderMessageList();

    await waitFor(() => {
      expect(screen.getByTestId('message-item-message-1').getAttribute('data-reactions')).toBe(
        JSON.stringify([{ emoji: '👍', count: 2, userIds: ['user-1', 'user-2'] }]),
      );
      expect(screen.getByTestId('message-item-message-2').getAttribute('data-reactions')).toBe(
        JSON.stringify([{ emoji: '🔥', count: 1, userIds: ['user-3'] }]),
      );
    });

    const reactionCalls = mockApi.mock.calls.filter(([path]) =>
      typeof path === 'string' && path.startsWith('/api/reactions?'),
    );
    expect(reactionCalls).toHaveLength(1);

    const reactionUrl = new URL(`http://localhost${reactionCalls[0][0] as string}`);
    const requestedIds = reactionUrl.searchParams.get('messageIds')?.split(',').sort();
    expect(requestedIds).toEqual(['message-1', 'message-2']);
  });
});
