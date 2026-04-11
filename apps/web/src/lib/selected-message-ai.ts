import {
  getSelectedMessageAiBehavior,
  getSelectedMessageAiSourceText,
  type Message,
  type SelectedMessageAiAction,
  type SelectedMessageAiSurface,
  type User,
} from '@zktalk/shared';
import type { ComposerAiActionRequest } from '@/components/MessageComposer';

interface ReplyTarget {
  message: Message;
  author?: User | null;
}

interface BuildComposerSelectedMessageAiStateInput {
  action: SelectedMessageAiAction;
  surface: SelectedMessageAiSurface;
  message: Message;
  author?: User | null;
}

interface ComposerSelectedMessageAiState {
  replyTo: ReplyTarget | null;
  aiActionRequest: ComposerAiActionRequest;
}

export function buildComposerSelectedMessageAiState(
  input: BuildComposerSelectedMessageAiStateInput,
): ComposerSelectedMessageAiState | null {
  const behavior = getSelectedMessageAiBehavior(input.action);

  if (behavior.target === 'message-inline-translation') {
    return null;
  }

  return {
    replyTo: behavior.keepsReplyTarget
      ? {
          message: input.message,
          author: input.author,
        }
      : null,
    aiActionRequest: {
      requestId: `${input.action}:${input.message.id}:${Date.now()}`,
      action: input.action,
      surface: input.surface,
      sourceMessage: {
        id: input.message.id,
        bodyText: getSelectedMessageAiSourceText(input.message) ?? '',
        authorDisplayName: input.author?.displayName ?? null,
      },
    },
  };
}
