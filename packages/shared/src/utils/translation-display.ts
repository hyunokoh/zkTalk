import type {
  TranslationDisplayMode,
  TranslationDisplayPreference,
  TranslationDisplayPreset,
  TranslationDisplayPresetId,
} from '../types/index';

export const DEFAULT_TRANSLATION_DISPLAY_PREFERENCE: TranslationDisplayPreference = {
  uiLocale: 'en',
  mode: 'manual_only',
  targetLanguage: null,
  readableLanguages: [],
};

const TRANSLATION_DISPLAY_PRESET_DEFINITIONS: TranslationDisplayPreset[] = [
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
      ...DEFAULT_TRANSLATION_DISPLAY_PREFERENCE,
    },
  },
];

export interface ResolveTranslationDisplayDecisionInput {
  preference?: TranslationDisplayPreference | null;
  messageLanguage: string | null;
  hasTranslatedText?: boolean;
  translationLanguage?: string | null;
  runtime: 'available' | 'mock' | 'disabled' | 'unavailable';
  stale?: boolean;
}

export interface TranslationDisplayDecision {
  mode: TranslationDisplayMode;
  targetLanguage: string | null;
  shouldAutoTranslate: boolean;
  render: 'original' | 'translated';
  state:
    | 'manual'
    | 'original-readable'
    | 'original-same-language'
    | 'translation-pending'
    | 'translation-ready'
    | 'translation-stale'
    | 'translation-runtime-mock'
    | 'translation-runtime-disabled'
    | 'translation-unavailable';
}

const HANGUL_REGEX = /[\uac00-\ud7af]/g;
const HIRAGANA_KATAKANA_REGEX = /[\u3040-\u30ff]/g;
const CJK_REGEX = /[\u4e00-\u9fff]/g;
const LATIN_REGEX = /[a-z]/gi;

function normalizeLanguage(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

export function inferMessageLanguage(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const hangulCount = countMatches(trimmed, HANGUL_REGEX);
  const kanaCount = countMatches(trimmed, HIRAGANA_KATAKANA_REGEX);
  const cjkCount = countMatches(trimmed, CJK_REGEX);
  const latinCount = countMatches(trimmed, LATIN_REGEX);

  if (hangulCount > 0 && hangulCount >= kanaCount && hangulCount >= cjkCount) {
    return 'ko';
  }

  if (kanaCount > 0 && kanaCount >= cjkCount) {
    return 'ja';
  }

  if (cjkCount > 0) {
    return 'zh';
  }

  if (latinCount > 0) {
    return 'en';
  }

  return null;
}

function clonePreset(preset: TranslationDisplayPreset): TranslationDisplayPreset {
  return {
    ...preset,
    translationDisplay: {
      ...preset.translationDisplay,
      readableLanguages: [...preset.translationDisplay.readableLanguages],
    },
  };
}

export function normalizeTranslationDisplayPreference(
  preference?: TranslationDisplayPreference | null,
): TranslationDisplayPreference {
  const normalizedUiLocale =
    normalizeLanguage(preference?.uiLocale) ?? DEFAULT_TRANSLATION_DISPLAY_PREFERENCE.uiLocale;
  const normalizedTargetLanguage = normalizeLanguage(preference?.targetLanguage);
  const normalizedReadableLanguages = Array.from(
    new Set(
      (preference?.readableLanguages ?? [])
        .map((language) => normalizeLanguage(language))
        .filter((language): language is string => Boolean(language)),
    ),
  );
  const mode = preference?.mode ?? DEFAULT_TRANSLATION_DISPLAY_PREFERENCE.mode;

  return {
    uiLocale: normalizedUiLocale,
    mode,
    targetLanguage:
      mode === 'manual_only' ? null : (normalizedTargetLanguage ?? normalizedUiLocale),
    readableLanguages: normalizedReadableLanguages,
  };
}

export function listTranslationDisplayPresets(): TranslationDisplayPreset[] {
  return TRANSLATION_DISPLAY_PRESET_DEFINITIONS.map((preset) => clonePreset(preset));
}

export function getTranslationDisplayPreset(
  id: TranslationDisplayPresetId,
): TranslationDisplayPreset {
  const preset = TRANSLATION_DISPLAY_PRESET_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!preset) {
    return clonePreset(TRANSLATION_DISPLAY_PRESET_DEFINITIONS[2]);
  }

  return clonePreset(preset);
}

export function resolveTranslationDisplayPresetId(
  preference?: TranslationDisplayPreference | null,
): TranslationDisplayPresetId | null {
  const normalizedPreference = normalizeTranslationDisplayPreference(preference);
  const normalizedReadableLanguages = [...normalizedPreference.readableLanguages].sort();

  for (const preset of TRANSLATION_DISPLAY_PRESET_DEFINITIONS) {
    const normalizedPreset = normalizeTranslationDisplayPreference(preset.translationDisplay);
    const normalizedPresetReadableLanguages = [...normalizedPreset.readableLanguages].sort();
    if (
      normalizedPreference.uiLocale === normalizedPreset.uiLocale &&
      normalizedPreference.mode === normalizedPreset.mode &&
      normalizedPreference.targetLanguage === normalizedPreset.targetLanguage &&
      normalizedReadableLanguages.length === normalizedPresetReadableLanguages.length &&
      normalizedReadableLanguages.every(
        (language, index) => language === normalizedPresetReadableLanguages[index],
      )
    ) {
      return preset.id;
    }
  }

  return null;
}

export function resolveTranslationDisplayDecision(
  input: ResolveTranslationDisplayDecisionInput,
): TranslationDisplayDecision {
  const preference = normalizeTranslationDisplayPreference(input.preference);
  const messageLanguage = normalizeLanguage(input.messageLanguage);
  const translationLanguage = normalizeLanguage(input.translationLanguage);

  if (preference.mode === 'manual_only') {
    return {
      mode: preference.mode,
      targetLanguage: preference.targetLanguage,
      shouldAutoTranslate: false,
      render: 'original',
      state: 'manual',
    };
  }

  if (messageLanguage && preference.targetLanguage === messageLanguage) {
    return {
      mode: preference.mode,
      targetLanguage: preference.targetLanguage,
      shouldAutoTranslate: false,
      render: 'original',
      state: 'original-same-language',
    };
  }

  if (
    preference.mode === 'target_language_except_readable' &&
    messageLanguage &&
    preference.readableLanguages.includes(messageLanguage)
  ) {
    return {
      mode: preference.mode,
      targetLanguage: preference.targetLanguage,
      shouldAutoTranslate: false,
      render: 'original',
      state: 'original-readable',
    };
  }

  if (!input.hasTranslatedText) {
    return {
      mode: preference.mode,
      targetLanguage: preference.targetLanguage,
      shouldAutoTranslate: true,
      render: 'original',
      state:
        input.runtime === 'unavailable'
          ? 'translation-unavailable'
          : input.runtime === 'disabled'
            ? 'translation-runtime-disabled'
          : input.runtime === 'mock'
            ? 'translation-runtime-mock'
            : 'translation-pending',
    };
  }

  if (
    preference.targetLanguage &&
    translationLanguage &&
    preference.targetLanguage !== translationLanguage
  ) {
    return {
      mode: preference.mode,
      targetLanguage: preference.targetLanguage,
      shouldAutoTranslate: true,
      render: 'original',
      state: 'translation-pending',
    };
  }

  return {
    mode: preference.mode,
    targetLanguage: preference.targetLanguage,
    shouldAutoTranslate: true,
    render: 'translated',
    state:
      input.runtime === 'mock'
        ? 'translation-runtime-mock'
        : input.stale
          ? 'translation-stale'
          : 'translation-ready',
  };
}
