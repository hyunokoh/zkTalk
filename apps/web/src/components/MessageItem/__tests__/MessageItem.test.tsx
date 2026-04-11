import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageItem } from '../MessageItem';
import type { Message, User } from '@zktalk/shared';

const { mockApi } = vi.hoisted(() => ({
  mockApi: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: mockApi,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'viewer-1' } }),
}));

vi.mock('@/stores/thread', () => ({
  useThreadStore: (selector: (state: { openThread: (threadId: string) => void }) => unknown) =>
    selector({ openThread: vi.fn() }),
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div>UserAvatar</div>,
}));

vi.mock('@/components/UserProfileCard', () => ({
  UserProfileCard: () => null,
}));

vi.mock('@/components/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@/components/P2PFileCard', () => ({
  P2PFileCard: () => null,
}));

vi.mock('@/components/AttachmentPreview/AttachmentPreview', () => ({
  AttachmentPreview: () => null,
}));

vi.mock('@/components/PollCard', () => ({
  PollCard: () => null,
}));

vi.mock('@/components/ReportButton', () => ({
  ReportButton: () => null,
}));

function renderMessageItem(props: Partial<React.ComponentProps<typeof MessageItem>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const author: User = {
    id: 'author-1',
    email: 'author@example.com',
    displayName: 'Alice',
    username: 'alice',
    avatarUrl: null,
    bio: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  };

  const message: Message = {
    id: 'message-1',
    communityId: 'community-1',
    channelId: 'channel-1',
    threadId: null,
    parentMessageId: null,
    authorUserId: author.id,
    bodyMarkdown: '회의는 오후 세 시에 시작합니다.',
    bodyPlaintext: '회의는 오후 세 시에 시작합니다.',
    messageType: 'user',
    isEdited: false,
    isDeleted: false,
    isEncrypted: false,
    topic: null,
    expiresAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <MessageItem
        message={message}
        author={author}
        channelId="channel-1"
        aiRuntime={{ provider: 'mock', status: 'mock', issue: 'mock runtime' }}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('MessageItem selected-message AI actions', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  it('shows selected-message AI buttons and forwards reply/rewrite actions', () => {
    const onRequestAiAction = vi.fn();
    renderMessageItem({ onRequestAiAction });

    fireEvent.mouseEnter(screen.getByTestId('message-row'));
    expect(screen.getByText('ai.runtimeMockHint ai.selectedMessageScopeHint')).toBeTruthy();
    fireEvent.click(screen.getByTestId('message-ai-reply-draft-button'));
    fireEvent.click(screen.getByTestId('message-ai-rewrite-draft-button'));

    expect(onRequestAiAction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'message-1' }),
      expect.objectContaining({ displayName: 'Alice' }),
      'reply-draft',
    );
    expect(onRequestAiAction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'message-1' }),
      expect.objectContaining({ displayName: 'Alice' }),
      'rewrite-draft',
    );
  });

  it('opens the action bar from keyboard focus so selected-message AI is reachable without hover', () => {
    const onRequestAiAction = vi.fn();
    renderMessageItem({ onRequestAiAction });

    fireEvent.focus(screen.getByTestId('message-row'));
    fireEvent.click(screen.getByTestId('message-ai-reply-draft-button'));

    expect(onRequestAiAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'message-1' }),
      expect.objectContaining({ displayName: 'Alice' }),
      'reply-draft',
    );
  });

  it('translates the selected message inline from the action bar', async () => {
    mockApi.mockResolvedValue({
      translatedText: 'The meeting starts at 3 PM.',
      runtime: { status: 'available' },
    });
    renderMessageItem();

    fireEvent.mouseEnter(screen.getByTestId('message-row'));
    fireEvent.click(screen.getByTestId('message-ai-translate-inline-button'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/translate', {
        method: 'POST',
        body: { text: '회의는 오후 세 시에 시작합니다.', targetLang: 'ko' },
      });
    });

    expect(screen.getByText('The meeting starts at 3 PM.')).toBeTruthy();
  });

  it('disables selected-message inline translation when the AI runtime is unavailable', () => {
    renderMessageItem({
      aiRuntime: {
        provider: 'anthropic',
        status: 'misconfigured',
        issue: 'AI_API_KEY must be set when AI_PROVIDER=anthropic',
      },
    });

    fireEvent.mouseEnter(screen.getByTestId('message-row'));

    const translateButton = screen.getByTestId('message-ai-translate-inline-button');
    expect(translateButton).toHaveProperty('disabled', true);
    fireEvent.click(translateButton);
    expect(mockApi).not.toHaveBeenCalled();
  });

  it('auto-translates unreadable messages when the user preference requires it', async () => {
    mockApi.mockResolvedValue({
      translatedText: 'The meeting starts at 3 PM.',
      runtime: { status: 'available' },
    });
    renderMessageItem({
      translationDisplayPreference: {
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: 'en',
        readableLanguages: ['en'],
      },
    });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/translate', {
        method: 'POST',
        body: { text: '회의는 오후 세 시에 시작합니다.', targetLang: 'en' },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('translate.autoTranslated')).toBeTruthy();
      expect(screen.getByText('The meeting starts at 3 PM.')).toBeTruthy();
    });
  });

  it('marks cached auto-translation stale after a message edit and refreshes it', async () => {
    mockApi
      .mockResolvedValueOnce({
        translatedText: 'The meeting starts at 3 PM.',
        runtime: { status: 'available' },
      })
      .mockResolvedValueOnce({
        translatedText: 'The meeting starts at 4 PM.',
        runtime: { status: 'available' },
      });

    const author: User = {
      id: 'author-1',
      email: 'author@example.com',
      displayName: 'Alice',
      username: 'alice',
      avatarUrl: null,
      bio: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    };

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const message: Message = {
      id: 'message-1',
      communityId: 'community-1',
      channelId: 'channel-1',
      threadId: null,
      parentMessageId: null,
      authorUserId: author.id,
      bodyMarkdown: '회의는 오후 세 시에 시작합니다.',
      bodyPlaintext: '회의는 오후 세 시에 시작합니다.',
      messageType: 'user',
      isEdited: false,
      isDeleted: false,
      isEncrypted: false,
      topic: null,
      expiresAt: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    };

    const view = render(
      <QueryClientProvider client={queryClient}>
        <MessageItem
          message={message}
          author={author}
          channelId="channel-1"
          translationDisplayPreference={{
            uiLocale: 'en',
            mode: 'target_language_except_readable',
            targetLanguage: 'en',
            readableLanguages: ['en'],
          }}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('translate.autoTranslated')).toBeTruthy();
      expect(screen.getByText('The meeting starts at 3 PM.')).toBeTruthy();
    });

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <MessageItem
          message={{
            ...message,
            bodyMarkdown: '회의는 오후 네 시에 시작합니다.',
            bodyPlaintext: '회의는 오후 네 시에 시작합니다.',
            isEdited: true,
            updatedAt: '2026-04-01T01:00:00.000Z',
          }}
          author={author}
          channelId="channel-1"
          translationDisplayPreference={{
            uiLocale: 'en',
            mode: 'target_language_except_readable',
            targetLanguage: 'en',
            readableLanguages: ['en'],
          }}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('translate.autoTranslatedStale')).toBeTruthy();
      expect(screen.getByText('The meeting starts at 3 PM.')).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText('The meeting starts at 4 PM.')).toBeTruthy();
    });
  });

  it('keeps mock-backed auto-translations explicitly labeled as mock', async () => {
    mockApi.mockResolvedValue({
      translatedText: 'The meeting starts at 3 PM.',
      runtime: { status: 'mock', issue: 'mock runtime' },
    });

    renderMessageItem({
      translationDisplayPreference: {
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: 'en',
        readableLanguages: ['en'],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('translate.autoTranslatedMock')).toBeTruthy();
      expect(screen.getByText('The meeting starts at 3 PM.')).toBeTruthy();
    });
  });

  it('shows an explicit disabled auto-translation state when the runtime is off', async () => {
    mockApi.mockResolvedValue({
      translatedText: null,
      runtime: {
        status: 'disabled',
        issue: 'Translation runtime disabled for this environment.',
      },
    });

    renderMessageItem({
      translationDisplayPreference: {
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: 'en',
        readableLanguages: ['en'],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('translate.autoTranslationDisabled')).toBeTruthy();
      expect(
        screen.getByText('Translation runtime disabled for this environment.'),
      ).toBeTruthy();
    });
  });
});
