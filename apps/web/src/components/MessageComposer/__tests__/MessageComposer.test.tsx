import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageComposer, type ComposerAiActionRequest } from '../MessageComposer';
import type { AIRuntimeSummary } from '@/lib/ai-runtime';
import { buildSelectedMessageAiContract } from '@zktalk/shared';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: mockApi,
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
  assertOkResponse: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}));

vi.mock('@/lib/ai-settings', () => ({
  AI_SETTINGS_UPDATED_EVENT: 'ai-settings-updated',
  isAiChannelSummaryEnabled: () => true,
  isAiComposerActionsEnabled: () => true,
}));

vi.mock('@/hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => ({
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
  }),
}));

vi.mock('@/components/PollCreator', () => ({
  PollCreator: () => null,
}));

vi.mock('@/lib/desktop-files', () => ({
  pickDesktopFiles: vi.fn(),
}));

vi.mock('@/lib/file-mime', () => ({
  resolveFileMimeType: () => 'text/plain',
}));

vi.mock('@/lib/file-preview', () => ({
  createFilePreviewUrl: vi.fn(),
  revokeFilePreviewUrl: vi.fn(),
}));

vi.mock('@/lib/offline-queue', () => ({
  enqueueMessage: vi.fn(),
}));

vi.mock('@/lib/offline-message-sync', () => ({
  ensureOfflineQueueAutoRetry: vi.fn(),
  flushOfflineQueueForChannel: vi.fn(),
  refreshOfflineChannelCounts: vi.fn(),
}));

vi.mock('@/lib/client-log', () => ({
  devLogError: vi.fn(),
}));

vi.mock('@/lib/error-copy', () => ({
  getAttachmentSendErrorMessage: vi.fn(() => 'attachment error'),
}));

vi.mock('@/lib/upload-request', () => ({
  createUploadRequestInit: vi.fn(() => ({})),
  resolveUploadUrl: vi.fn((url: string) => url),
}));

vi.mock('@/stores/toast', () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

function renderComposer(props: Partial<React.ComponentProps<typeof MessageComposer>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MessageComposer channelId="channel-1" {...props} />
    </QueryClientProvider>,
  );

  return {
    ...view,
    queryClient,
  };
}

describe('MessageComposer selected-message AI actions', () => {
  beforeEach(() => {
    mockApi.mockReset();
    mockShowToast.mockReset();
  });

  it('applies a reply draft from a selected message request', async () => {
    const onHandled = vi.fn();
    const request: ComposerAiActionRequest = {
      requestId: 'req-1',
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        id: 'message-1',
        bodyText: 'Need status update by noon.',
        authorDisplayName: 'Alice',
      },
    };

    mockApi.mockResolvedValue({ reply: 'I will send the update before noon.' });

    renderComposer({
      aiActionRequest: request,
      onAiActionRequestHandled: onHandled,
    });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
        method: 'POST',
      }));
    });

    const apiBody = mockApi.mock.calls[0]?.[1]?.body;
    const expectedContract = buildSelectedMessageAiContract({
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: 'Alice',
        bodyText: 'Need status update by noon.',
      },
    });
    expect(apiBody.messages).toEqual(expectedContract.chatMessages);
    expect((screen.getByTestId('channel-composer-input') as HTMLTextAreaElement).value).toBe('I will send the update before noon.');
    expect(mockShowToast).toHaveBeenCalledWith({ tone: 'success', message: 'ai.replyDraftApplied' });
    expect(onHandled).toHaveBeenCalledTimes(1);
  });

  it('blocks selected-message AI when the runtime is misconfigured', async () => {
    const onHandled = vi.fn();
    const request: ComposerAiActionRequest = {
      requestId: 'req-runtime-block',
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        id: 'message-runtime',
        bodyText: 'Need a response.',
        authorDisplayName: 'Alice',
      },
    };
    const aiRuntime: AIRuntimeSummary = {
      provider: 'anthropic',
      status: 'misconfigured',
      keyEnvVar: 'AI_API_KEY',
      issue: 'AI_API_KEY must be set when AI_PROVIDER=anthropic',
    };

    renderComposer({
      aiActionRequest: request,
      onAiActionRequestHandled: onHandled,
      aiRuntime,
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'info',
        message: 'ai.runtimeMisconfiguredHintWithIssue',
      });
    });

    expect(mockApi).not.toHaveBeenCalled();
    expect(onHandled).toHaveBeenCalledTimes(1);
  });

  it('blocks selected-message rewrite when the composer draft is empty', async () => {
    const onHandled = vi.fn();
    const request: ComposerAiActionRequest = {
      requestId: 'req-2',
      action: 'rewrite-draft',
      surface: 'channel',
      sourceMessage: {
        id: 'message-2',
        bodyText: 'Can you tighten this copy?',
        authorDisplayName: 'Bob',
      },
    };

    renderComposer({
      aiActionRequest: request,
      onAiActionRequestHandled: onHandled,
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({ tone: 'info', message: 'ai.rewriteNeedsDraft' });
    });

    expect(mockApi).not.toHaveBeenCalled();
    expect(onHandled).toHaveBeenCalledTimes(1);
  });

  it('rewrites the current draft using the selected message context', async () => {
    const onHandled = vi.fn();
    const request: ComposerAiActionRequest = {
      requestId: 'req-3',
      action: 'rewrite-draft',
      surface: 'channel',
      sourceMessage: {
        id: 'message-3',
        bodyText: 'Please make this more direct.',
        authorDisplayName: 'Carol',
      },
    };

    mockApi.mockResolvedValue({ reply: 'Here is the tightened draft.' });

    const view = renderComposer();
    fireEvent.change(screen.getByTestId('channel-composer-input'), {
      target: { value: 'Draft that needs help' },
    });

    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <MessageComposer
          channelId="channel-1"
          aiActionRequest={request}
          onAiActionRequestHandled={onHandled}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
    });

    const apiBody = mockApi.mock.calls[0]?.[1]?.body;
    const expectedContract = buildSelectedMessageAiContract({
      action: 'rewrite-draft',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: 'Carol',
        bodyText: 'Please make this more direct.',
      },
      currentDraft: 'Draft that needs help',
    });
    expect(apiBody.messages).toEqual(expectedContract.chatMessages);
    expect((screen.getByTestId('channel-composer-input') as HTMLTextAreaElement).value).toBe('Here is the tightened draft.');
    expect(mockShowToast).toHaveBeenCalledWith({ tone: 'success', message: 'ai.rewriteDraftApplied' });
    expect(onHandled).toHaveBeenCalledTimes(1);
  });

  it('uses a mock-specific toast after applying a mock AI reply draft', async () => {
    const onHandled = vi.fn();
    const request: ComposerAiActionRequest = {
      requestId: 'req-mock-1',
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        id: 'message-mock-1',
        bodyText: 'Need status update by noon.',
        authorDisplayName: 'Alice',
      },
    };
    const aiRuntime: AIRuntimeSummary = {
      provider: 'mock',
      status: 'mock',
      issue: 'Mock runtime',
    };

    mockApi.mockResolvedValue({ reply: 'Mocked reply draft.' });

    renderComposer({
      aiActionRequest: request,
      onAiActionRequestHandled: onHandled,
      aiRuntime,
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'info',
        message: 'ai.replyDraftAppliedMock',
      });
    });

    expect(mockApi).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
      method: 'POST',
    }));
    expect(onHandled).toHaveBeenCalledTimes(1);
  });

  it('shows the AI runtime status in the composer menu when mock mode is active', () => {
    renderComposer({
      aiRuntime: {
        provider: 'mock',
        status: 'mock',
        issue: 'Mock runtime',
      },
    });

    fireEvent.click(screen.getByTestId('channel-composer-more-button'));

    const runtimeStatus = screen.getByTestId('channel-composer-ai-runtime-status');
    expect(runtimeStatus.textContent).toContain('ai.runtimeMock');
    expect(runtimeStatus.textContent).toContain('ai.runtimeMockHint');
  });

  it('disables direct composer AI actions when the runtime is misconfigured', () => {
    renderComposer({
      aiRuntime: {
        provider: 'anthropic',
        status: 'misconfigured',
        keyEnvVar: 'AI_API_KEY',
        issue: 'AI_API_KEY must be set when AI_PROVIDER=anthropic',
      },
    });

    fireEvent.click(screen.getByTestId('channel-composer-more-button'));

    expect(screen.getByTestId('channel-composer-ai-reply-button')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('channel-composer-ai-translate-button')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('channel-composer-ai-rewrite-button')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('channel-composer-ai-summary-button')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('channel-composer-ai-runtime-status').textContent).toContain(
      'ai.runtimeMisconfiguredHintWithIssue',
    );
  });

  it('does not rerun the same selected-message AI request after a rerender', async () => {
    const onHandled = vi.fn();
    const request: ComposerAiActionRequest = {
      requestId: 'req-stable-1',
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        id: 'message-stable-1',
        bodyText: 'Need status update by noon.',
        authorDisplayName: 'Alice',
      },
    };

    mockApi.mockResolvedValue({ reply: 'I will send the update before noon.' });

    const view = renderComposer({
      aiActionRequest: request,
      onAiActionRequestHandled: onHandled,
    });

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledTimes(1);
    });

    view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <MessageComposer
          channelId="channel-1"
          aiActionRequest={request}
          onAiActionRequestHandled={onHandled}
          aiRuntime={{
            provider: 'mock',
            status: 'mock',
            issue: 'mock runtime',
          }}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(onHandled).toHaveBeenCalledTimes(1);
    });

    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it('blocks selected-message reply when the source message is empty', async () => {
    const onHandled = vi.fn();
    const request: ComposerAiActionRequest = {
      requestId: 'req-4',
      action: 'reply-draft',
      surface: 'thread',
      sourceMessage: {
        id: 'message-4',
        bodyText: '   ',
        authorDisplayName: 'Dana',
      },
    };

    renderComposer({
      aiActionRequest: request,
      onAiActionRequestHandled: onHandled,
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({ tone: 'info', message: 'ai.selectedMessageUnavailable' });
    });

    expect(mockApi).not.toHaveBeenCalled();
    expect(onHandled).toHaveBeenCalledTimes(1);
  });
});
