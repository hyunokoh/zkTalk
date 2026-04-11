import { describe, expect, it, vi } from 'vitest';
import { buildComposerSelectedMessageAiState } from '../selected-message-ai';

describe('buildComposerSelectedMessageAiState', () => {
  it('keeps the reply target for selected-message reply drafts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T08:50:28.775Z'));

    const state = buildComposerSelectedMessageAiState({
      action: 'reply-draft',
      surface: 'channel',
      message: {
        id: 'message-1',
        bodyMarkdown: 'Please share the update.',
        bodyPlaintext: 'Please share the update.',
      } as never,
      author: {
        displayName: 'Alice',
      } as never,
    });

    expect(state).toEqual({
      replyTo: {
        message: {
          id: 'message-1',
          bodyMarkdown: 'Please share the update.',
          bodyPlaintext: 'Please share the update.',
        },
        author: {
          displayName: 'Alice',
        },
      },
      aiActionRequest: {
        requestId: 'reply-draft:message-1:1775811028775',
        action: 'reply-draft',
        surface: 'channel',
        sourceMessage: {
          id: 'message-1',
          bodyText: 'Please share the update.',
          authorDisplayName: 'Alice',
        },
      },
    });

    vi.useRealTimers();
  });

  it('clears the reply target for selected-message rewrite drafts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T08:50:28.775Z'));

    const state = buildComposerSelectedMessageAiState({
      action: 'rewrite-draft',
      surface: 'thread',
      message: {
        id: 'message-2',
        bodyMarkdown: 'Tighten this draft.',
        bodyPlaintext: 'Tighten this draft.',
      } as never,
      author: {
        displayName: 'Bob',
      } as never,
    });

    expect(state).toEqual({
      replyTo: null,
      aiActionRequest: {
        requestId: 'rewrite-draft:message-2:1775811028775',
        action: 'rewrite-draft',
        surface: 'thread',
        sourceMessage: {
          id: 'message-2',
          bodyText: 'Tighten this draft.',
          authorDisplayName: 'Bob',
        },
      },
    });

    vi.useRealTimers();
  });

  it('leaves inline translation on the message surface', () => {
    const state = buildComposerSelectedMessageAiState({
      action: 'translate-inline',
      surface: 'channel',
      message: {
        id: 'message-3',
        bodyMarkdown: 'Translate this inline.',
        bodyPlaintext: 'Translate this inline.',
      } as never,
      author: {
        displayName: 'Carol',
      } as never,
    });

    expect(state).toBeNull();
  });

  it('prefers plaintext over markdown when building the composer AI request', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T08:50:28.775Z'));

    const state = buildComposerSelectedMessageAiState({
      action: 'reply-draft',
      surface: 'channel',
      message: {
        id: 'message-4',
        bodyMarkdown: '**Need** status update by noon.',
        bodyPlaintext: 'Need status update by noon.',
      } as never,
      author: {
        displayName: 'Dana',
      } as never,
    });

    expect(state?.aiActionRequest.sourceMessage.bodyText).toBe('Need status update by noon.');

    vi.useRealTimers();
  });

  it('falls back to markdown when the selected message plaintext is blank', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T08:50:28.775Z'));

    const state = buildComposerSelectedMessageAiState({
      action: 'reply-draft',
      surface: 'channel',
      message: {
        id: 'message-5',
        bodyMarkdown: '**Need** status update by noon.',
        bodyPlaintext: '   ',
      } as never,
      author: {
        displayName: 'Evan',
      } as never,
    });

    expect(state?.aiActionRequest.sourceMessage.bodyText).toBe('**Need** status update by noon.');

    vi.useRealTimers();
  });
});
