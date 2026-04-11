import { describe, expect, it } from 'vitest';
import {
  buildSelectedMessageAiContract,
  getSelectedMessageAiSourceText,
  getSelectedMessageAiBehavior,
  getSelectedMessageAiSuccessKey,
} from '../utils/ai-selected-message';
import { hasAiCapability, listAiCapabilities, type AiCapabilityId } from '../utils/ai-capabilities';

describe('buildSelectedMessageAiContract', () => {
  it('defines explicit output effects for every selected-message AI action', () => {
    expect(getSelectedMessageAiBehavior('reply-draft')).toEqual({
      action: 'reply-draft',
      target: 'composer-reply-draft',
      effect: 'create-reply-draft',
      requiresCurrentDraft: false,
      keepsReplyTarget: true,
    });
    expect(getSelectedMessageAiBehavior('rewrite-draft')).toEqual({
      action: 'rewrite-draft',
      target: 'composer-rewrite-draft',
      effect: 'replace-composer-draft',
      requiresCurrentDraft: true,
      keepsReplyTarget: false,
    });
    expect(getSelectedMessageAiBehavior('translate-inline')).toEqual({
      action: 'translate-inline',
      target: 'message-inline-translation',
      effect: 'show-inline-translation',
      requiresCurrentDraft: false,
      keepsReplyTarget: false,
    });
  });

  it('keeps platform capability facts aligned with the selected-message contract', () => {
    const mobileCapabilities = listAiCapabilities('mobile');
    const webCapabilities = listAiCapabilities('web');

    expect(mobileCapabilities).toEqual<AiCapabilityId[]>([
      'selected-message-reply-draft',
      'selected-message-rewrite-draft',
      'selected-message-translate-inline',
    ]);
    expect(webCapabilities).toContain('selected-message-reply-draft');
    expect(webCapabilities).toContain('selected-message-rewrite-draft');
    expect(webCapabilities).toContain('selected-message-translate-inline');
    expect(webCapabilities).toContain('rail-assistant');
    expect(hasAiCapability('mobile', 'rail-assistant')).toBe(false);
    expect(hasAiCapability('mobile', 'channel-summary')).toBe(false);
    expect(hasAiCapability('mobile', 'selected-message-translate-inline')).toBe(true);
  });

  it('builds a reply draft contract with a predictable composer target', () => {
    const contract = buildSelectedMessageAiContract({
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: 'Alice',
        bodyText: 'Need status update by noon.',
      },
    });

    expect(contract.target).toBe('composer-reply-draft');
    expect(contract.effect).toBe('create-reply-draft');
    expect(contract.errorKey).toBeUndefined();
    expect(contract.chatMessages?.[1]?.content).toContain('Selected message:');
    expect(contract.chatMessages?.[1]?.content).toContain('Need status update by noon.');
  });

  it('blocks rewrite when the current draft is empty', () => {
    const contract = buildSelectedMessageAiContract({
      action: 'rewrite-draft',
      surface: 'dm',
      sourceMessage: {
        authorDisplayName: 'Bob',
        bodyText: 'Can you tighten this copy?',
      },
      currentDraft: '   ',
    });

    expect(contract.target).toBe('composer-rewrite-draft');
    expect(contract.effect).toBe('replace-composer-draft');
    expect(contract.errorKey).toBe('ai.rewriteNeedsDraft');
    expect(contract.chatMessages).toBeUndefined();
  });

  it('keeps translation on the selected message surface', () => {
    const contract = buildSelectedMessageAiContract({
      action: 'translate-inline',
      surface: 'thread',
      sourceMessage: {
        authorDisplayName: 'Carol',
        bodyText: '회의 시작은 3시입니다.',
      },
    });

    expect(contract.target).toBe('message-inline-translation');
    expect(contract.effect).toBe('show-inline-translation');
    expect(contract.errorKey).toBeUndefined();
    expect(contract.chatMessages).toBeUndefined();
    expect(contract.sourceText).toBe('회의 시작은 3시입니다.');
  });

  it('marks missing translation source text as unavailable without changing the inline target', () => {
    const contract = buildSelectedMessageAiContract({
      action: 'translate-inline',
      surface: 'dm',
      sourceMessage: {
        authorDisplayName: 'Dana',
        bodyText: '   ',
      },
    });

    expect(contract.target).toBe('message-inline-translation');
    expect(contract.effect).toBe('show-inline-translation');
    expect(contract.errorKey).toBe('ai.selectedMessageUnavailable');
    expect(contract.sourceText).toBeNull();
    expect(contract.chatMessages).toBeUndefined();
  });

  it('marks missing selected-message text as unavailable', () => {
    const contract = buildSelectedMessageAiContract({
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: 'Dana',
        bodyText: '   ',
      },
    });

    expect(contract.target).toBe('composer-reply-draft');
    expect(contract.effect).toBe('create-reply-draft');
    expect(contract.errorKey).toBe('ai.selectedMessageUnavailable');
    expect(contract.chatMessages).toBeUndefined();
  });

  it('falls back to markdown when selected-message plaintext is empty', () => {
    expect(
      getSelectedMessageAiSourceText({
        bodyPlaintext: '   ',
        bodyMarkdown: '**Need** status update by noon.',
      }),
    ).toBe('**Need** status update by noon.');
  });

  it('uses surface-specific labels and falls back to an unknown author when missing', () => {
    const dmReply = buildSelectedMessageAiContract({
      action: 'reply-draft',
      surface: 'dm',
      sourceMessage: {
        authorDisplayName: '   ',
        bodyText: 'Can you send the deck?',
      },
    });

    const threadRewrite = buildSelectedMessageAiContract({
      action: 'rewrite-draft',
      surface: 'thread',
      sourceMessage: {
        authorDisplayName: null,
        bodyText: 'Please tighten this answer.',
      },
      currentDraft: 'I will get back to you soon.',
    });

    expect(dmReply.chatMessages?.[0]?.content).toContain('DM reply');
    expect(dmReply.chatMessages?.[1]?.content).toContain('Author: Unknown');
    expect(dmReply.chatMessages?.[1]?.content).toContain('Selected DM:');

    expect(threadRewrite.chatMessages?.[0]?.content).toContain('thread reply');
    expect(threadRewrite.chatMessages?.[1]?.content).toContain('Selected thread message from Unknown:');
    expect(threadRewrite.chatMessages?.[1]?.content).toContain('Current draft:');
  });

  it('keeps selected-message reply and rewrite prompts distinct across mobile surfaces', () => {
    const channelReply = buildSelectedMessageAiContract({
      action: 'reply-draft',
      surface: 'channel',
      sourceMessage: {
        authorDisplayName: 'Alice',
        bodyText: 'Please send the update.',
      },
    });
    const dmRewrite = buildSelectedMessageAiContract({
      action: 'rewrite-draft',
      surface: 'dm',
      sourceMessage: {
        authorDisplayName: 'Bob',
        bodyText: 'Need a softer reply.',
      },
      currentDraft: 'I cannot help with this today.',
    });
    const threadReply = buildSelectedMessageAiContract({
      action: 'reply-draft',
      surface: 'thread',
      sourceMessage: {
        authorDisplayName: 'Carol',
        bodyText: 'Can we split this work?',
      },
    });

    expect(channelReply.chatMessages?.[0]?.content).toContain('channel reply drafting assistant');
    expect(channelReply.chatMessages?.[1]?.content).toContain('Selected message:');

    expect(dmRewrite.chatMessages?.[0]?.content).toContain('rewrite a DM reply draft');
    expect(dmRewrite.chatMessages?.[1]?.content).toContain('Selected DM from Bob:');
    expect(dmRewrite.chatMessages?.[1]?.content).toContain('Current draft:');

    expect(threadReply.chatMessages?.[0]?.content).toContain('thread reply drafting assistant');
    expect(threadReply.chatMessages?.[1]?.content).toContain('Selected thread message:');
  });

  it('returns mock-aware success keys for selected-message draft actions', () => {
    expect(getSelectedMessageAiSuccessKey('reply-draft')).toBe('ai.replyDraftApplied');
    expect(getSelectedMessageAiSuccessKey('reply-draft', { mock: true })).toBe(
      'ai.replyDraftAppliedMock',
    );
    expect(getSelectedMessageAiSuccessKey('rewrite-draft')).toBe('ai.rewriteDraftApplied');
    expect(getSelectedMessageAiSuccessKey('rewrite-draft', { mock: true })).toBe(
      'ai.rewriteDraftAppliedMock',
    );
  });
});
