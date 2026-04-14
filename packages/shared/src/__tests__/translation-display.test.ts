import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSLATION_DISPLAY_PREFERENCE,
  getTranslationDisplayPreset,
  inferMessageLanguage,
  isValidTranslationLanguageCode,
  listTranslationDisplayPresets,
  normalizeTranslationDisplayPreference,
  parseTranslationLanguageList,
  resolveTranslationDisplayDecision,
  resolveTranslationDisplayPresetId,
  getTranslationDisplayProductSummary,
  summarizeTranslationDisplayPreference,
  validateTranslationDisplayInput,
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

  it('drops invalid language codes and falls back to the default locale when needed', () => {
    expect(
      normalizeTranslationDisplayPreference({
        uiLocale: 'english_us',
        mode: 'target_language_except_readable',
        targetLanguage: 'translator-default',
        readableLanguages: ['EN', 'bad_code', 'ja-JP'],
      }),
    ).toEqual({
      uiLocale: 'en',
      mode: 'target_language_except_readable',
      targetLanguage: 'en',
      readableLanguages: ['en', 'ja-jp'],
    });
  });
});

describe('translation language code helpers', () => {
  it('accepts normalized ISO-style language codes used by product settings', () => {
    expect(isValidTranslationLanguageCode('en')).toBe(true);
    expect(isValidTranslationLanguageCode('pt-BR')).toBe(true);
    expect(isValidTranslationLanguageCode('zh-hant')).toBe(true);
    expect(isValidTranslationLanguageCode('')).toBe(false);
    expect(isValidTranslationLanguageCode('fil')).toBe(true);
    expect(isValidTranslationLanguageCode('en_us')).toBe(false);
  });

  it('parses comma or newline separated readable-language inputs into unique normalized codes', () => {
    expect(parseTranslationLanguageList(' EN, ko\npt-BR, en ')).toEqual(['en', 'ko', 'pt-br']);
  });
});

describe('validateTranslationDisplayInput', () => {
  it('normalizes arbitrary ISO-style language codes for custom translation settings', () => {
    expect(
      validateTranslationDisplayInput({
        preference: {
          uiLocale: 'EN',
          mode: 'manual_only',
          targetLanguage: null,
          readableLanguages: [],
        },
        mode: 'target_language_except_readable',
        targetLanguageInput: ' PT-BR ',
        readableLanguagesInput: ' en, zh-Hant, fil ',
      }),
    ).toEqual({
      success: true,
      translationDisplay: {
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: 'pt-br',
        readableLanguages: ['en', 'zh-hant', 'fil'],
      },
    });
  });

  it('rejects invalid target language codes before save', () => {
    expect(
      validateTranslationDisplayInput({
        preference: DEFAULT_TRANSLATION_DISPLAY_PREFERENCE,
        mode: 'target_language_all',
        targetLanguageInput: 'english_us',
      }),
    ).toEqual({
      success: false,
      reason: 'invalid_target_language',
      invalidLanguage: 'english_us',
    });
  });

  it('rejects invalid readable language codes before save', () => {
    expect(
      validateTranslationDisplayInput({
        preference: DEFAULT_TRANSLATION_DISPLAY_PREFERENCE,
        mode: 'target_language_except_readable',
        targetLanguageInput: 'ko',
        readableLanguagesInput: 'en, bad_code',
      }),
    ).toEqual({
      success: false,
      reason: 'invalid_readable_language',
      invalidLanguage: 'bad_code',
    });
  });
});

describe('summarizeTranslationDisplayPreference', () => {
  it('describes manual-only preferences as keeping original text', () => {
    expect(summarizeTranslationDisplayPreference()).toEqual({
      modeLabel: 'manual_only',
      targetLanguage: null,
      readableLanguages: [],
      summary: 'Manual only. Incoming messages stay in the original language until translated.',
    });
  });

  it('describes full auto-translation using the normalized target language', () => {
    expect(
      summarizeTranslationDisplayPreference({
        uiLocale: 'en',
        mode: 'target_language_all',
        targetLanguage: 'PT-BR',
        readableLanguages: ['en'],
      }),
    ).toEqual({
      modeLabel: 'target_language_all',
      targetLanguage: 'pt-br',
      readableLanguages: [],
      summary: 'Auto-translate all incoming messages into pt-br.',
    });
  });

  it('describes readable-language exceptions using arbitrary language codes', () => {
    expect(
      summarizeTranslationDisplayPreference({
        uiLocale: 'en',
        mode: 'target_language_except_readable',
        targetLanguage: 'zh-Hant',
        readableLanguages: ['en', 'fil', 'zh-Hant'],
      }),
    ).toEqual({
      modeLabel: 'target_language_except_readable',
      targetLanguage: 'zh-hant',
      readableLanguages: ['en', 'fil', 'zh-hant'],
      summary: 'Auto-translate into zh-hant, except messages already readable in en, fil, zh-hant.',
    });
  });
});

describe('getTranslationDisplayProductSummary', () => {
  it('returns product-facing copy for manual-only mode', () => {
    expect(getTranslationDisplayProductSummary()).toEqual({
      headline: 'Manual translation only',
      detail: 'Incoming messages stay original until the user explicitly translates them.',
    });
  });

  it('returns a product-facing summary for full auto-translation', () => {
    expect(
      getTranslationDisplayProductSummary({
        uiLocale: 'en',
        mode: 'target_language_all',
        targetLanguage: 'PT-BR',
        readableLanguages: ['en'],
      }),
    ).toEqual({
      headline: 'Auto-translate everything into pt-br',
      detail:
        'Every incoming message is treated as unreadable and translated into the target language.',
    });
  });

  it('returns a product-facing summary for readable-language exceptions', () => {
    expect(
      getTranslationDisplayProductSummary({
        uiLocale: 'ko',
        mode: 'target_language_except_readable',
        targetLanguage: 'ko',
        readableLanguages: ['ko', 'en'],
      }),
    ).toEqual({
      headline: 'Auto-translate into ko',
      detail: 'Messages already readable in ko, en stay original; everything else is translated.',
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
