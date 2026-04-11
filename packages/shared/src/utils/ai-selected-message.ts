export type SelectedMessageAiAction = 'reply-draft' | 'rewrite-draft' | 'translate-inline';
export type SelectedMessageAiSurface = 'channel' | 'dm' | 'thread';
export type SelectedMessageAiTarget =
  | 'composer-reply-draft'
  | 'composer-rewrite-draft'
  | 'message-inline-translation';
export type SelectedMessageAiEffect =
  | 'create-reply-draft'
  | 'replace-composer-draft'
  | 'show-inline-translation';

export interface SelectedMessageAiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SelectedMessageAiSource {
  authorDisplayName?: string | null;
  bodyText?: string | null;
}

export interface SelectedMessageAiSourceTextLike {
  bodyPlaintext?: string | null;
  bodyMarkdown?: string | null;
}

export interface BuildSelectedMessageAiContractInput {
  action: SelectedMessageAiAction;
  surface: SelectedMessageAiSurface;
  sourceMessage: SelectedMessageAiSource;
  currentDraft?: string | null;
}

export interface SelectedMessageAiContract {
  action: SelectedMessageAiAction;
  surface: SelectedMessageAiSurface;
  target: SelectedMessageAiTarget;
  effect: SelectedMessageAiEffect;
  sourceText: string | null;
  errorKey?: 'ai.selectedMessageUnavailable' | 'ai.rewriteNeedsDraft';
  chatMessages?: SelectedMessageAiChatMessage[];
}

export interface SelectedMessageAiBehavior {
  action: SelectedMessageAiAction;
  target: SelectedMessageAiTarget;
  effect: SelectedMessageAiEffect;
  requiresCurrentDraft: boolean;
  keepsReplyTarget: boolean;
}

export type SelectedMessageAiSuccessKey =
  | 'ai.replyDraftApplied'
  | 'ai.replyDraftAppliedMock'
  | 'ai.rewriteDraftApplied'
  | 'ai.rewriteDraftAppliedMock';

const SELECTED_MESSAGE_AI_BEHAVIOR_BY_ACTION: Record<
  SelectedMessageAiAction,
  SelectedMessageAiBehavior
> = {
  'reply-draft': {
    action: 'reply-draft',
    target: 'composer-reply-draft',
    effect: 'create-reply-draft',
    requiresCurrentDraft: false,
    keepsReplyTarget: true,
  },
  'rewrite-draft': {
    action: 'rewrite-draft',
    target: 'composer-rewrite-draft',
    effect: 'replace-composer-draft',
    requiresCurrentDraft: true,
    keepsReplyTarget: false,
  },
  'translate-inline': {
    action: 'translate-inline',
    target: 'message-inline-translation',
    effect: 'show-inline-translation',
    requiresCurrentDraft: false,
    keepsReplyTarget: false,
  },
};

function getSurfaceLabel(surface: SelectedMessageAiSurface): string {
  switch (surface) {
    case 'channel':
      return 'channel reply';
    case 'dm':
      return 'DM reply';
    case 'thread':
      return 'thread reply';
  }
}

function getSelectedMessageLabel(surface: SelectedMessageAiSurface): string {
  switch (surface) {
    case 'channel':
      return 'Selected message';
    case 'dm':
      return 'Selected DM';
    case 'thread':
      return 'Selected thread message';
  }
}

function normalizeText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSelectedMessageAiSourceText(
  source: SelectedMessageAiSourceTextLike,
): string | null {
  return normalizeText(source.bodyPlaintext) ?? normalizeText(source.bodyMarkdown);
}

export function getSelectedMessageAiBehavior(
  action: SelectedMessageAiAction,
): SelectedMessageAiBehavior {
  return SELECTED_MESSAGE_AI_BEHAVIOR_BY_ACTION[action];
}

export function buildSelectedMessageAiContract(
  input: BuildSelectedMessageAiContractInput,
): SelectedMessageAiContract {
  const behavior = getSelectedMessageAiBehavior(input.action);
  const sourceText = normalizeText(input.sourceMessage.bodyText);

  if (!sourceText) {
    return {
      action: input.action,
      surface: input.surface,
      target: behavior.target,
      effect: behavior.effect,
      sourceText: null,
      errorKey: 'ai.selectedMessageUnavailable',
    };
  }

  if (input.action === 'translate-inline') {
    return {
      action: input.action,
      surface: input.surface,
      target: behavior.target,
      effect: behavior.effect,
      sourceText,
    };
  }

  const authorLabel = normalizeText(input.sourceMessage.authorDisplayName) ?? 'Unknown';

  if (input.action === 'reply-draft') {
    return {
      action: input.action,
      surface: input.surface,
      target: behavior.target,
      effect: behavior.effect,
      sourceText,
      chatMessages: [
        {
          role: 'system',
          content: `You are a ${getSurfaceLabel(input.surface)} drafting assistant inside zkTalk. Write one concise reply draft in the same language as the source message. Return only the reply text with no framing.`,
        },
        {
          role: 'user',
          content: `Author: ${authorLabel}\n${getSelectedMessageLabel(input.surface)}:\n${sourceText}`,
        },
      ],
    };
  }

  const currentDraft = normalizeText(input.currentDraft);
  if (!currentDraft) {
    return {
      action: input.action,
      surface: input.surface,
      target: behavior.target,
      effect: behavior.effect,
      sourceText,
      errorKey: 'ai.rewriteNeedsDraft',
    };
  }

  return {
    action: input.action,
    surface: input.surface,
    target: behavior.target,
    effect: behavior.effect,
    sourceText,
    chatMessages: [
      {
        role: 'system',
        content: `You rewrite a ${getSurfaceLabel(input.surface)} draft inside zkTalk. Use the selected message as context, keep the draft intent, and return only the rewritten draft text with no framing.`,
      },
      {
        role: 'user',
        content: `${getSelectedMessageLabel(input.surface)} from ${authorLabel}:\n${sourceText}\n\nCurrent draft:\n${currentDraft}`,
      },
    ],
  };
}

export function getSelectedMessageAiSuccessKey(
  action: Extract<SelectedMessageAiAction, 'reply-draft' | 'rewrite-draft'>,
  options?: { mock?: boolean },
): SelectedMessageAiSuccessKey {
  if (action === 'reply-draft') {
    return options?.mock ? 'ai.replyDraftAppliedMock' : 'ai.replyDraftApplied';
  }

  return options?.mock ? 'ai.rewriteDraftAppliedMock' : 'ai.rewriteDraftApplied';
}
