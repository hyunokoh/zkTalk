import { afterEach, describe, expect, it, vi } from 'vitest';
import { translateText } from '../translate.service.js';

describe('translate.service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns an explicit mock runtime in development when no translation provider is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TRANSLATION_API_KEY', '');
    vi.stubEnv('AI_API_KEY', '');

    await expect(translateText('Hello', 'ko')).resolves.toEqual({
      translatedText: '[ko] Hello',
      runtime: {
        status: 'mock',
        provider: 'mock',
        issue:
          'Translation is using the local mock runtime because no provider key is configured.',
      },
    });
  });

  it('returns an explicit disabled runtime in production when no translation provider is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TRANSLATION_API_KEY', '');
    vi.stubEnv('AI_API_KEY', '');

    await expect(translateText('Hello', 'ko')).resolves.toEqual({
      translatedText: null,
      runtime: {
        status: 'disabled',
        provider: 'unset',
        issue:
          'Translation runtime is disabled. Set TRANSLATION_API_KEY or AI_API_KEY to enable provider-backed translation.',
      },
    });
  });

  it('returns an explicit unavailable runtime when provider-backed translation fails', async () => {
    vi.stubEnv('TRANSLATION_API_KEY', 'translation-key');
    vi.stubEnv('AI_API_KEY', '');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'bad gateway' }), { status: 502 }),
    );

    await expect(translateText('Hello', 'ko')).resolves.toEqual({
      translatedText: null,
      runtime: {
        status: 'unavailable',
        provider: 'google-translate',
        issue:
          'Translation provider request failed. Check configured credentials and outbound network access.',
      },
    });
  });
});
