import { describe, expect, it } from 'vitest';
import {
  createTranslationRenderCacheEntry,
  getTranslationRenderSourceVersion,
  resolveTranslationRenderCacheState,
} from '../utils/translation-render-cache';

describe('translation-render-cache', () => {
  it('uses updatedAt before createdAt for the cache source version', () => {
    expect(
      getTranslationRenderSourceVersion({
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T01:00:00.000Z',
      }),
    ).toBe('2026-04-10T01:00:00.000Z');

    expect(
      getTranslationRenderSourceVersion({
        createdAt: '2026-04-10T00:00:00.000Z',
      }),
    ).toBe('2026-04-10T00:00:00.000Z');
  });

  it('marks cache entries stale when the message version changes', () => {
    const entry = createTranslationRenderCacheEntry({
      translatedText: 'Hello',
      targetLanguage: 'EN',
      sourceVersion: '2026-04-10T00:00:00.000Z',
    });

    expect(
      resolveTranslationRenderCacheState({
        entry,
        sourceVersion: '2026-04-10T00:00:00.000Z',
        targetLanguage: 'en',
      }),
    ).toBe('ready');

    expect(
      resolveTranslationRenderCacheState({
        entry,
        sourceVersion: '2026-04-10T02:00:00.000Z',
        targetLanguage: 'en',
      }),
    ).toBe('stale');
  });

  it('rejects mismatched target languages without treating the entry as current', () => {
    const entry = createTranslationRenderCacheEntry({
      translatedText: '안녕하세요',
      targetLanguage: 'ko',
      sourceVersion: '2026-04-10T00:00:00.000Z',
    });

    expect(
      resolveTranslationRenderCacheState({
        entry,
        sourceVersion: '2026-04-10T00:00:00.000Z',
        targetLanguage: 'en',
      }),
    ).toBe('wrong-language');
  });
});
