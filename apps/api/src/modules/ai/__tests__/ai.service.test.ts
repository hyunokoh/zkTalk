import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAIRuntimeSummary,
  getConfiguredAIProvider,
  getOpenRouterKey,
  getOpenRouterSiteUrl,
} from '../ai.service.js';

describe('ai.service', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers an explicit OpenRouter site URL when configured', () => {
    vi.stubEnv('OPENROUTER_SITE_URL', 'https://chat.example.com/app');
    vi.stubEnv('ZKTALK_PUBLIC_APP_URL', 'https://fallback.example.com');

    expect(getOpenRouterSiteUrl()).toBe('https://chat.example.com');
  });

  it('falls back to the public app URL when explicit OpenRouter site URL is missing', () => {
    vi.stubEnv('OPENROUTER_SITE_URL', '');
    vi.stubEnv('ZKTALK_PUBLIC_APP_URL', 'https://app.example.com/some/path');

    expect(getOpenRouterSiteUrl()).toBe('https://app.example.com');
  });

  it('ignores loopback origins and falls back to the first public origin', () => {
    vi.stubEnv('OPENROUTER_SITE_URL', 'http://localhost:3000');
    vi.stubEnv('ZKTALK_PUBLIC_APP_URL', 'http://127.0.0.1:3000');
    vi.stubEnv('CORS_ORIGIN', 'http://localhost:3000,https://chat.example.com');

    expect(getOpenRouterSiteUrl()).toBe('https://chat.example.com');
  });

  it('falls back to the first configured CORS origin when no app URL is provided', () => {
    vi.stubEnv('OPENROUTER_SITE_URL', '');
    vi.stubEnv('ZKTALK_PUBLIC_APP_URL', '');
    vi.stubEnv('CORS_ORIGIN', 'https://chat.example.com,https://admin.example.com');

    expect(getOpenRouterSiteUrl()).toBe('https://chat.example.com');
  });

  it('returns undefined when no valid public site URL is configured', () => {
    vi.stubEnv('OPENROUTER_SITE_URL', '');
    vi.stubEnv('ZKTALK_PUBLIC_APP_URL', '');
    vi.stubEnv('CORS_ORIGIN', 'http://localhost:3000');

    expect(getOpenRouterSiteUrl()).toBeUndefined();
  });

  it('reports AI as disabled in production when no provider is configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AI_PROVIDER', '');

    expect(getAIRuntimeSummary()).toEqual({
      provider: 'unset',
      status: 'disabled',
      issue: 'Set AI_PROVIDER and the matching provider API key to enable AI routes.',
    });
  });

  it('reports AI as mock-backed in development when no provider is configured', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AI_PROVIDER', '');

    expect(getAIRuntimeSummary()).toEqual({
      provider: 'unset',
      status: 'mock',
      issue: 'Development runtime will use the built-in mock AI response until AI_PROVIDER is configured.',
    });
  });

  it('uses OPENROUTER_API_KEY only for OpenRouter auth', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'openrouter-key');
    vi.stubEnv('OPENAI_API_KEY', 'openai-key');

    expect(getOpenRouterKey()).toBe('openrouter-key');
  });

  it('does not fall back to OPENAI_API_KEY for OpenRouter auth', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', 'openai-key');

    expect(getOpenRouterKey()).toBe('');
  });

  it('returns an empty string when no AI provider key env is configured', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');

    expect(getOpenRouterKey()).toBe('');
  });

  it('respects explicit AI_PROVIDER selection', () => {
    vi.stubEnv('AI_PROVIDER', 'gemini');
    vi.stubEnv('OPENROUTER_API_KEY', 'openrouter-key');
    vi.stubEnv('AI_API_KEY', 'anthropic-key');

    expect(getConfiguredAIProvider()).toBe('gemini');
  });

  it('reports a configured provider with the matching key env', () => {
    vi.stubEnv('AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key');

    expect(getAIRuntimeSummary()).toEqual({
      provider: 'gemini',
      status: 'configured',
      keyEnvVar: 'GEMINI_API_KEY',
    });
  });

  it('reports a misconfigured provider when its required key env is missing', () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic');
    vi.stubEnv('AI_API_KEY', '');

    expect(getAIRuntimeSummary()).toEqual({
      provider: 'anthropic',
      status: 'misconfigured',
      keyEnvVar: 'AI_API_KEY',
      issue: 'AI_API_KEY must be set when AI_PROVIDER=anthropic',
    });
  });

  it('includes a sanitized public site URL when OpenRouter is selected without a key', () => {
    vi.stubEnv('AI_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('ZKTALK_PUBLIC_APP_URL', 'https://app.example.com/chat');

    expect(getAIRuntimeSummary()).toEqual({
      provider: 'openrouter',
      status: 'misconfigured',
      keyEnvVar: 'OPENROUTER_API_KEY',
      issue: 'OPENROUTER_API_KEY must be set when AI_PROVIDER=openrouter',
      siteUrl: 'https://app.example.com',
    });
  });

  it('includes the sanitized OpenRouter site URL in the runtime summary', () => {
    vi.stubEnv('AI_PROVIDER', 'openrouter');
    vi.stubEnv('OPENROUTER_API_KEY', 'openrouter-key');
    vi.stubEnv('OPENROUTER_SITE_URL', 'https://chat.example.com/app');

    expect(getAIRuntimeSummary()).toEqual({
      provider: 'openrouter',
      status: 'configured',
      keyEnvVar: 'OPENROUTER_API_KEY',
      siteUrl: 'https://chat.example.com',
    });
  });

  it('normalizes explicit AI_PROVIDER values before validation', () => {
    vi.stubEnv('AI_PROVIDER', '  MOCK ');

    expect(getConfiguredAIProvider()).toBe('mock');
  });

  it('does not auto-detect an external AI provider from keys alone', () => {
    vi.stubEnv('AI_PROVIDER', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'openrouter-key');
    vi.stubEnv('AI_API_KEY', 'anthropic-key');
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key');

    expect(getConfiguredAIProvider()).toBeUndefined();
  });

  it('rejects unsupported AI_PROVIDER values', () => {
    vi.stubEnv('AI_PROVIDER', 'openai');

    expect(() => getConfiguredAIProvider()).toThrow(
      'AI_PROVIDER must be one of: openrouter, anthropic, gemini, mock',
    );
  });
});
