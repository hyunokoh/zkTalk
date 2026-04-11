import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DmConversation } from '../DmConversation';

const { mockApi, mockShowToast, mockPush, mockMessageBody, mockAiRuntimeUsable } = vi.hoisted(() => ({
  mockApi: vi.fn(),
  mockShowToast: vi.fn(),
  mockPush: vi.fn(),
  mockMessageBody: {
    value: 'Need status update by noon.',
  },
  mockAiRuntimeUsable: {
    value: true,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    setQueriesData: vi.fn(),
    fetchQuery: vi.fn(),
  }),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
    const key = queryKey[0];

    if (key === 'dm-conversation') {
      return {
        data: {
          conversation: {
            id: 'dm-1',
            type: 'direct',
            name: null,
          },
          participants: [
            {
              id: 'participant-1',
              userId: 'user-1',
              user: {
                id: 'user-1',
                displayName: 'Me',
                username: 'me',
              },
            },
            {
              id: 'participant-2',
              userId: 'user-2',
              user: {
                id: 'user-2',
                displayName: 'Alice',
                username: 'alice',
              },
            },
          ],
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

    return { data: undefined };
  },
  useQueries: () => [],
  useInfiniteQuery: () => ({
    data: {
      pages: [
        {
          messages: [
            {
              message: {
                id: 'message-1',
                conversationId: 'dm-1',
                authorUserId: 'user-2',
                bodyMarkdown: mockMessageBody.value,
                createdAt: '2026-04-10T09:00:00.000Z',
                isEdited: false,
                isDeleted: false,
                isEncrypted: false,
              },
              author: {
                id: 'user-2',
                displayName: 'Alice',
                username: 'alice',
              },
              attachments: [],
            },
          ],
          hasMore: false,
          unreadCounts: {},
        },
      ],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/lib/api', () => ({
  api: mockApi,
  ApiError: class ApiError extends Error {
    code?: string;
    constructor(public status: number, message: string, code?: string) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
    }
  },
  assertOkResponse: vi.fn(),
}));

vi.mock('@/lib/ai-runtime', () => ({
  fetchAiRuntime: vi.fn(),
  getAiRuntimePresentation: () => ({
    label: 'Mock AI',
    description: 'Mock AI output must be verified before sending.',
    tone: 'mock',
    mock: true,
  }),
  isAiRuntimeUsable: () => mockAiRuntimeUsable.value,
}));

vi.mock('@/lib/error-copy', () => ({
  getActionErrorMessage: vi.fn(() => 'action error'),
  getAttachmentSendErrorMessage: vi.fn(() => 'attachment error'),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  t: (key: string) => key,
}));

vi.mock('@/stores/toast', () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: (selector: (state: {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
  }) => unknown) =>
    selector({
      user: {
        id: 'user-1',
        displayName: 'Me',
        avatarUrl: null,
      },
    }),
}));

vi.mock('@/lib/desktop-files', () => ({
  isDesktopPickedFile: () => false,
  pickDesktopFiles: vi.fn(),
  readDesktopFileChunk: vi.fn(),
}));

vi.mock('@/lib/file-mime', () => ({
  resolveFileMimeType: () => 'text/plain',
}));

vi.mock('@/lib/file-preview', () => ({
  createFilePreviewUrl: vi.fn(),
  revokeFilePreviewUrl: vi.fn(),
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div>UserAvatar</div>,
}));

vi.mock('@/components/AttachmentPreview/AttachmentPreview', () => ({
  AttachmentPreview: () => <div>AttachmentPreview</div>,
}));

vi.mock('@/hooks/useWebSocket', () => ({
  send: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
}));

vi.mock('@/hooks/useE2EE', () => ({
  useE2EE: () => ({
    isReady: false,
    isLoading: false,
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  }),
}));

vi.mock('@/lib/upload-request', () => ({
  createUploadRequestInit: vi.fn(() => ({})),
  resolveUploadUrl: vi.fn((url: string) => url),
}));

describe('DmConversation selected-message AI actions', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockShowToast.mockReset();
    mockPush.mockReset();
    mockMessageBody.value = 'Need status update by noon.';
    mockAiRuntimeUsable.value = true;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('drafts a reply from the selected DM message into the composer', async () => {
    mockApi.mockResolvedValueOnce({ reply: 'I will send the status update shortly.' });

    render(<DmConversation conversationId="dm-1" />);

    expect(
      screen.getByText(
        'Mock AI output must be verified before sending. ai.selectedMessageScopeHint',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('dm-message-ai-reply-button'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
        method: 'POST',
      }));
    });

    expect((screen.getByTestId('dm-composer-input') as HTMLTextAreaElement).value).toBe(
      'I will send the status update shortly.',
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      tone: 'info',
      message: 'ai.replyDraftAppliedMock',
    });
  });

  it('requires a current draft before rewriting from a selected DM message', async () => {
    render(<DmConversation conversationId="dm-1" />);

    fireEvent.click(screen.getByTestId('dm-message-ai-rewrite-button'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'info',
        message: 'ai.rewriteNeedsDraft',
      });
    });

    expect(mockApi).not.toHaveBeenCalled();
  });

  it('blocks selected-message reply when the DM source message is empty', async () => {
    mockMessageBody.value = '   ';

    render(<DmConversation conversationId="dm-1" />);

    fireEvent.click(screen.getByTestId('dm-message-ai-reply-button'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'info',
        message: 'ai.selectedMessageUnavailable',
      });
    });

    expect(mockApi).not.toHaveBeenCalled();
  });

  it('uses a mock-specific toast after rewriting from a selected DM message', async () => {
    mockApi.mockResolvedValueOnce({ reply: 'More direct rewritten draft.' });

    render(<DmConversation conversationId="dm-1" />);

    fireEvent.change(screen.getByTestId('dm-composer-input'), {
      target: { value: 'Draft that needs tightening' },
    });
    fireEvent.click(screen.getByTestId('dm-message-ai-rewrite-button'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
        method: 'POST',
      }));
    });

    expect((screen.getByTestId('dm-composer-input') as HTMLTextAreaElement).value).toBe(
      'More direct rewritten draft.',
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      tone: 'info',
      message: 'ai.rewriteDraftAppliedMock',
    });
  });

  it('translates the selected DM message inline without touching the composer', async () => {
    mockApi.mockResolvedValueOnce({ translatedText: '정오 전까지 상태 업데이트가 필요합니다.' });

    render(<DmConversation conversationId="dm-1" />);

    fireEvent.click(screen.getByTestId('dm-message-ai-translate-button'));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/translate', expect.objectContaining({
        method: 'POST',
      }));
    });

    expect(screen.getByText('정오 전까지 상태 업데이트가 필요합니다.')).toBeTruthy();
    expect((screen.getByTestId('dm-composer-input') as HTMLTextAreaElement).value).toBe('');
  });

  it('reuses the cached inline translation and toggles visibility without another API call', async () => {
    mockApi.mockResolvedValueOnce({ translatedText: '정오 전까지 상태 업데이트가 필요합니다.' });

    render(<DmConversation conversationId="dm-1" />);

    fireEvent.click(screen.getByTestId('dm-message-ai-translate-button'));

    await waitFor(() => {
      expect(screen.getByText('정오 전까지 상태 업데이트가 필요합니다.')).toBeTruthy();
    });

    expect(mockApi).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('dm-message-ai-translate-button'));
    await waitFor(() => {
      expect(screen.queryByText('정오 전까지 상태 업데이트가 필요합니다.')).toBeNull();
    });

    fireEvent.click(screen.getByTestId('dm-message-ai-translate-button'));
    await waitFor(() => {
      expect(screen.getByText('정오 전까지 상태 업데이트가 필요합니다.')).toBeTruthy();
    });

    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it('disables selected-message inline translation when the AI runtime is unavailable', () => {
    mockAiRuntimeUsable.value = false;

    render(<DmConversation conversationId="dm-1" />);

    const translateButton = screen.getByTestId('dm-message-ai-translate-button');
    expect(translateButton).toHaveProperty('disabled', true);
    fireEvent.click(translateButton);
    expect(mockApi).not.toHaveBeenCalled();
  });
});
