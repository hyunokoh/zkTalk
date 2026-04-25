import { api } from '@/lib/api';

export type AIRuntimeStatus = 'configured' | 'mock' | 'disabled' | 'misconfigured';
export type AIProvider =
  | 'openrouter'
  | 'anthropic'
  | 'gemini'
  | 'mock'
  | 'agent-codex'
  | 'agent-claude'
  | 'unset';

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

export async function fetchAiRuntime(): Promise<AIRuntimeSummary> {
  return api<AIRuntimeSummary>('/api/ai/runtime');
}

export function isAiRuntimeUsable(runtime?: AIRuntimeSummary | null): boolean {
  return runtime?.status === 'configured' || runtime?.status === 'mock';
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
