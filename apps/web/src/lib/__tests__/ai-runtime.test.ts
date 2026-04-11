import { describe, expect, it } from 'vitest';
import { getAiRuntimePresentation } from '../ai-runtime';

const t = (key: string, params?: Record<string, string>) =>
  params?.issue ? `${key}:${params.issue}` : key;

describe('getAiRuntimePresentation', () => {
  it('keeps disabled runtimes distinct from generic unavailable state', () => {
    expect(
      getAiRuntimePresentation(t, {
        provider: 'unset',
        status: 'disabled',
        issue: 'Set AI_PROVIDER first.',
      }),
    ).toEqual({
      label: 'ai.runtimeDisabled',
      description: 'ai.runtimeDisabledHintWithIssue:Set AI_PROVIDER first.',
      tone: 'unavailable',
      usable: false,
      mock: false,
      status: 'disabled',
    });
  });

  it('keeps misconfigured runtimes distinct from disabled state', () => {
    expect(
      getAiRuntimePresentation(t, {
        provider: 'openrouter',
        status: 'misconfigured',
        issue: 'OPENROUTER_API_KEY must be set when AI_PROVIDER=openrouter',
      }),
    ).toEqual({
      label: 'ai.runtimeMisconfigured',
      description:
        'ai.runtimeMisconfiguredHintWithIssue:OPENROUTER_API_KEY must be set when AI_PROVIDER=openrouter',
      tone: 'unavailable',
      usable: false,
      mock: false,
      status: 'misconfigured',
    });
  });
});
