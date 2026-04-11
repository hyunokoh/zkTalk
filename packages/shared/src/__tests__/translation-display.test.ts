import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSLATION_DISPLAY_PREFERENCE,
  getTranslationDisplayPreset,
  inferMessageLanguage,
  listTranslationDisplayPresets,
  normalizeTranslationDisplayPreference,
  resolveTranslationDisplayPresetId,
  resolveTranslationDisplayDecision,
} from '../utils/translation-display';

describe('normalizeTranslationDisplayPreference', () => {
  it('falls back to the default manual-only preference', () => {
    expect(normalizeTranslationDisplayPreference()).toEqual(DEFAULT_TRANSLATION_DISPLAY_PREFERENCE);
  });

  it('normalizes locale casing and backfills target language when auto-translation is enabled', () => {
    expect(
      normalizeTranslationDisplayPreference({
        uiLocale: 'KO',
        mode: 'target_language_except_readable',
        targetLanguage: null,
        readableLanguages: ['KO', 'en', 'en', '  '],
      }),
    ).toEqual({
      uiLocale: 'ko',
      mode: 'target_language_except_readable',
      targetLanguage: 'ko',
      readableLanguages: ['ko', 'en'],
    });
  });
});

describe('resolveTranslationDisplayDecision', () => {
  it('keeps manual-only mode on the original text', () => {
    expect(
      resolveTranslationDisplayDecision({
        messageLanguage: 'ja',
        runtime: 'available',
      }),
    ).toEqual({
      mode: 'manual_only',
      targetLanguage: null,
      shouldAutoTranslate: false,
      render: 'original',
      state: 'manual',
    });
  });

  it('keeps readable languages untouched in readable-exception mode', () => {
    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'ko',
          mode: 'target_language_except_readable',
          targetLanguage: 'ko',
          readableLanguages: ['ko', 'en'],
        },
        messageLanguage: 'en',
        runtime: 'available',
      }),
    ).toEqual({
      mode: 'target_language_except_readable',
      targetLanguage: 'ko',
      shouldAutoTranslate: false,
      render: 'original',
      state: 'original-readable',
    });
  });

  it('requests translation for unreadable languages when the runtime is live', () => {
    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'ko',
          mode: 'target_language_except_readable',
          targetLanguage: 'ko',
          readableLanguages: ['ko', 'en'],
        },
        messageLanguage: 'ja',
        runtime: 'available',
      }),
    ).toEqual({
      mode: 'target_language_except_readable',
      targetLanguage: 'ko',
      shouldAutoTranslate: true,
      render: 'original',
      state: 'translation-pending',
    });
  });

  it('renders translated text once a matching translation exists', () => {
    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
        messageLanguage: 'ko',
        hasTranslatedText: true,
        translationLanguage: 'en',
        runtime: 'available',
      }),
    ).toEqual({
      mode: 'target_language_all',
      targetLanguage: 'en',
      shouldAutoTranslate: true,
      render: 'translated',
      state: 'translation-ready',
    });
  });

  it('keeps the original text when runtime is unavailable or only mock-backed', () => {
    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
        messageLanguage: 'ko',
        runtime: 'unavailable',
      }).state,
    ).toBe('translation-unavailable');

    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
        messageLanguage: 'ko',
        runtime: 'mock',
      }).state,
    ).toBe('translation-runtime-mock');

    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
        messageLanguage: 'ko',
        runtime: 'disabled',
      }).state,
    ).toBe('translation-runtime-disabled');
  });

  it('keeps mock-backed translated output explicitly marked as mock', () => {
    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
        messageLanguage: 'ko',
        hasTranslatedText: true,
        translationLanguage: 'en',
        runtime: 'mock',
      }),
    ).toEqual({
      mode: 'target_language_all',
      targetLanguage: 'en',
      shouldAutoTranslate: true,
      render: 'translated',
      state: 'translation-runtime-mock',
    });
  });

  it('marks stale translated output explicitly', () => {
    expect(
      resolveTranslationDisplayDecision({
        preference: {
          uiLocale: 'en',
          mode: 'target_language_all',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
        messageLanguage: 'ko',
        hasTranslatedText: true,
        translationLanguage: 'en',
        runtime: 'available',
        stale: true,
      }).state,
    ).toBe('translation-stale');
  });
});

describe('inferMessageLanguage', () => {
  it('infers simple script-dominant messages for auto-translation fallback', () => {
    expect(inferMessageLanguage('회의는 오후 세 시에 시작합니다.')).toBe('ko');
    expect(inferMessageLanguage('会議は午後3時に始まります。')).toBe('ja');
    expect(inferMessageLanguage('会议下午三点开始。')).toBe('zh');
    expect(inferMessageLanguage('The meeting starts at 3 PM.')).toBe('en');
    expect(inferMessageLanguage('12345 ???')).toBeNull();
  });
});

describe('translation display presets', () => {
  it('exposes stable preset definitions for local bridge flows', () => {
    expect(listTranslationDisplayPresets()).toEqual([
      {
        id: 'english_only',
        label: 'English only',
        description:
          'Render unreadable incoming content in English and keep English-readable messages as-is.',
        bridgeInstruction: 'Use English for bridge summaries, streamed updates, and final results.',
        translationDisplay: {
          uiLocale: 'en',
          mode: 'target_language_except_readable',
          targetLanguage: 'en',
          readableLanguages: ['en'],
        },
      },
      {
        id: 'korean_preferred_english_readable',
        label: 'Korean preferred, English readable',
        description:
          'Keep Korean and English readable as-is and render other incoming content in Korean.',
        bridgeInstruction:
          'Prefer Korean output, but keep already readable English context intact when that improves clarity.',
        translationDisplay: {
          uiLocale: 'ko',
          mode: 'target_language_except_readable',
          targetLanguage: 'ko',
          readableLanguages: ['ko', 'en'],
        },
      },
      {
        id: 'manual_only',
        label: 'Manual only',
        description:
          'Do not auto-translate incoming content; require explicit manual translation actions.',
        bridgeInstruction:
          'Do not auto-translate bridge content. Preserve original text unless the operator explicitly asks for translation.',
        translationDisplay: {
          uiLocale: 'en',
          mode: 'manual_only',
          targetLanguage: null,
          readableLanguages: [],
        },
      },
    ]);
  });

  it('maps preset ids back from matching normalized preferences', () => {
    expect(
      resolveTranslationDisplayPresetId({
        uiLocale: 'KO',
        mode: 'target_language_except_readable',
        targetLanguage: 'ko',
        readableLanguages: ['en', 'ko'],
      }),
    ).toBe('korean_preferred_english_readable');

    expect(resolveTranslationDisplayPresetId(DEFAULT_TRANSLATION_DISPLAY_PREFERENCE)).toBe(
      'manual_only',
    );
  });

  it('returns null for non-preset custom preferences and clones preset payloads', () => {
    expect(
      resolveTranslationDisplayPresetId({
        uiLocale: 'en',
        mode: 'target_language_all',
        targetLanguage: 'en',
        readableLanguages: ['en'],
      }),
    ).toBeNull();

    const preset = getTranslationDisplayPreset('english_only');
    preset.translationDisplay.readableLanguages.push('ko');

    expect(
      getTranslationDisplayPreset('english_only').translationDisplay.readableLanguages,
    ).toEqual(['en']);
  });
});
