import { api } from './api';
import {
  buildSelectedMessageAiContract,
  getSelectedMessageAiSuccessKey,
  type BuildSelectedMessageAiContractInput,
} from '@zktalk/shared';

export type AIRuntimeStatus = 'configured' | 'mock' | 'disabled' | 'misconfigured';
export type AIProvider = 'openrouter' | 'anthropic' | 'gemini' | 'mock' | 'unset';

export interface AIRuntimeSummary {
  provider: AIProvider;
  status: AIRuntimeStatus;
  keyEnvVar?: 'OPENROUTER_API_KEY' | 'AI_API_KEY' | 'GEMINI_API_KEY';
  siteUrl?: string;
  issue?: string;
}

interface AIRuntimePresentation {
  label: string;
  description: string;
  tone: 'live' | 'mock' | 'unavailable';
  usable: boolean;
  mock: boolean;
  status: AIRuntimeStatus;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function isAiRuntimeUsable(runtime?: AIRuntimeSummary | null): boolean {
  return runtime?.status === 'configured' || runtime?.status === 'mock';
}

export function isMockAiRuntime(runtime?: AIRuntimeSummary | null): boolean {
  return runtime?.status === 'mock';
}

export async function fetchAiRuntime(): Promise<AIRuntimeSummary> {
  return api<AIRuntimeSummary>('/api/ai/runtime');
}

export function getAiRuntimePresentation(
  t: (key: string, params?: Record<string, string>) => string,
  runtime?: AIRuntimeSummary | null,
): AIRuntimePresentation | null {
  if (!runtime) {
    return null;
  }

  if (runtime.status === 'configured') {
    return {
      label: t('ai.runtimeLive'),
      description: t('ai.runtimeLiveHint'),
      tone: 'live',
      usable: true,
      mock: false,
      status: runtime.status,
    };
  }

  if (runtime.status === 'mock') {
    return {
      label: t('ai.runtimeMock'),
      description: t('ai.runtimeMockHint'),
      tone: 'mock',
      usable: true,
      mock: true,
      status: runtime.status,
    };
  }

  if (runtime.status === 'disabled') {
    return {
      label: t('ai.runtimeDisabled'),
      description: runtime.issue
        ? t('ai.runtimeDisabledHintWithIssue', { issue: runtime.issue })
        : t('ai.runtimeDisabledHint'),
      tone: 'unavailable',
      usable: false,
      mock: false,
      status: runtime.status,
    };
  }

  return {
    label: t('ai.runtimeMisconfigured'),
    description: runtime.issue
      ? t('ai.runtimeMisconfiguredHintWithIssue', { issue: runtime.issue })
      : t('ai.runtimeMisconfiguredHint'),
    tone: 'unavailable',
    usable: false,
    mock: false,
    status: runtime.status,
  };
}

export async function requestAiChat(messages: ChatMessage[]): Promise<string> {
  const result = await api<{ reply: string }>('/api/ai/chat', {
    method: 'POST',
    body: { messages },
  });

  return result.reply;
}

export function buildSelectedMessageAiAction(input: BuildSelectedMessageAiContractInput) {
  return buildSelectedMessageAiContract(input);
}

export function getSelectedMessageAiAppliedMessageKey(
  action: 'reply-draft' | 'rewrite-draft',
  runtime?: AIRuntimeSummary | null,
) {
  return getSelectedMessageAiSuccessKey(action, { mock: runtime?.status === 'mock' });
}
