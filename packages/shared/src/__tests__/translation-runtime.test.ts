import { describe, expect, it } from 'vitest';
import { resolveTranslationResponse } from '../utils/translation-runtime';

describe('resolveTranslationResponse', () => {
  it('creates a cache entry for live translation output', () => {
    expect(
      resolveTranslationResponse({
        response: {
          translatedText: '회의는 오후 3시에 시작합니다.',
          runtime: { status: 'available' },
        },
        targetLanguage: 'ko',
        sourceVersion: '2026-04-10T00:00:00.000Z',
      }),
    ).toEqual({
      entry: {
        translatedText: '회의는 오후 3시에 시작합니다.',
        targetLanguage: 'ko',
        sourceVersion: '2026-04-10T00:00:00.000Z',
      },
      runtime: { status: 'available' },
      state: 'translated',
    });
  });

  it('marks mock-backed translation output explicitly', () => {
    expect(
      resolveTranslationResponse({
        response: {
          translatedText: '[ko] hello',
          runtime: {
            status: 'mock',
            issue: 'Translation is using the local mock runtime because no provider key is configured.',
          },
        },
        targetLanguage: 'ko',
        sourceVersion: '2026-04-10T00:00:00.000Z',
      }),
    ).toEqual({
      entry: {
        translatedText: '[ko] hello',
        targetLanguage: 'ko',
        sourceVersion: '2026-04-10T00:00:00.000Z',
      },
      runtime: {
        status: 'mock',
        issue: 'Translation is using the local mock runtime because no provider key is configured.',
      },
      state: 'translated-mock',
    });
  });

  it('keeps disabled runtimes explicit when no translated text is returned', () => {
    expect(
      resolveTranslationResponse({
        response: {
          translatedText: null,
          runtime: {
            status: 'disabled',
            issue: 'Translation runtime is disabled.',
          },
        },
        targetLanguage: 'ko',
        sourceVersion: null,
      }),
    ).toEqual({
      entry: null,
      runtime: {
        status: 'disabled',
        issue: 'Translation runtime is disabled.',
      },
      state: 'runtime-disabled',
    });
  });

  it('treats provider failures as explicit runtime unavailability', () => {
    expect(
      resolveTranslationResponse({
        response: {
          translatedText: null,
          runtime: {
            status: 'unavailable',
            issue: 'Translation provider request failed.',
          },
        },
        targetLanguage: 'en',
        sourceVersion: null,
      }),
    ).toEqual({
      entry: null,
      runtime: {
        status: 'unavailable',
        issue: 'Translation provider request failed.',
      },
      state: 'runtime-unavailable',
    });
  });
});
