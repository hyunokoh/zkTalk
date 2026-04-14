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

export interface ValidateTranslationDisplayInputOptions {
  preference?: TranslationDisplayPreference | null;
  mode: TranslationDisplayMode;
  targetLanguageInput?: string | null;
  readableLanguagesInput?: string | null;
}

export interface TranslationDisplayPreferenceSummary {
  modeLabel: 'manual_only' | 'target_language_all' | 'target_language_except_readable';
  targetLanguage: string | null;
  readableLanguages: string[];
  summary: string;
}

export interface TranslationDisplayProductSummary {
  headline: string;
  detail: string;
}

export type TranslationDisplayInputValidationFailureReason =
  | 'invalid_target_language'
  | 'invalid_readable_language';

export type ValidateTranslationDisplayInputResult =
  | {
      success: true;
      translationDisplay: TranslationDisplayPreference;
    }
  | {
      success: false;
      reason: TranslationDisplayInputValidationFailureReason;
      invalidLanguage: string | null;
    };

const HANGUL_REGEX = /[\uac00-\ud7af]/g;
const HIRAGANA_KATAKANA_REGEX = /[\u3040-\u30ff]/g;
const CJK_REGEX = /[\u4e00-\u9fff]/g;
const LATIN_REGEX = /[a-z]/gi;
const TRANSLATION_LANGUAGE_CODE_REGEX = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;

function normalizeLanguage(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function isValidTranslationLanguageCode(value: string | null | undefined): boolean {
  const normalized = normalizeLanguage(value);
  if (!normalized) {
    return false;
  }

  return (
    normalized.length >= 2 &&
    normalized.length <= 16 &&
    TRANSLATION_LANGUAGE_CODE_REGEX.test(normalized)
  );
}

export function parseTranslationLanguageList(value: string | null | undefined): string[] {
  return Array.from(
    new Set(
      (value ?? '')
        .split(/[\n,]/)
        .map((item) => normalizeLanguage(item))
        .filter((item): item is string => Boolean(item)),
    ),
  );
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
  const normalizedUiLocaleCandidate = normalizeLanguage(preference?.uiLocale);
  const normalizedUiLocale =
    normalizedUiLocaleCandidate && isValidTranslationLanguageCode(normalizedUiLocaleCandidate)
      ? normalizedUiLocaleCandidate
      : DEFAULT_TRANSLATION_DISPLAY_PREFERENCE.uiLocale;
  const normalizedTargetLanguageCandidate = normalizeLanguage(preference?.targetLanguage);
  const normalizedTargetLanguage =
    normalizedTargetLanguageCandidate &&
    isValidTranslationLanguageCode(normalizedTargetLanguageCandidate)
      ? normalizedTargetLanguageCandidate
      : null;
  const normalizedReadableLanguages = Array.from(
    new Set(
      (preference?.readableLanguages ?? [])
        .map((language) => normalizeLanguage(language))
        .filter(
          (language): language is string =>
            Boolean(language) && isValidTranslationLanguageCode(language),
        ),
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

export function validateTranslationDisplayInput(
  options: ValidateTranslationDisplayInputOptions,
): ValidateTranslationDisplayInputResult {
  const normalizedPreference = normalizeTranslationDisplayPreference(options.preference);
  const normalizedTargetLanguage = normalizeLanguage(options.targetLanguageInput);
  const readableLanguages = parseTranslationLanguageList(options.readableLanguagesInput);
  const invalidReadableLanguage =
    readableLanguages.find((language) => !isValidTranslationLanguageCode(language)) ?? null;

  if (invalidReadableLanguage) {
    return {
      success: false,
      reason: 'invalid_readable_language',
      invalidLanguage: invalidReadableLanguage,
    };
  }

  if (options.mode !== 'manual_only' && !isValidTranslationLanguageCode(normalizedTargetLanguage)) {
    return {
      success: false,
      reason: 'invalid_target_language',
      invalidLanguage: normalizedTargetLanguage,
    };
  }

  return {
    success: true,
    translationDisplay: {
      uiLocale: normalizedPreference.uiLocale,
      mode: options.mode,
      targetLanguage: options.mode === 'manual_only' ? null : normalizedTargetLanguage,
      readableLanguages: options.mode === 'target_language_all' ? [] : readableLanguages,
    },
  };
}

export function summarizeTranslationDisplayPreference(
  preference?: TranslationDisplayPreference | null,
): TranslationDisplayPreferenceSummary {
  const normalizedPreference = normalizeTranslationDisplayPreference(preference);
  const readableLanguages = [...normalizedPreference.readableLanguages];

  if (normalizedPreference.mode === 'manual_only') {
    return {
      modeLabel: 'manual_only',
      targetLanguage: null,
      readableLanguages: [],
      summary: 'Manual only. Incoming messages stay in the original language until translated.',
    };
  }

  if (normalizedPreference.mode === 'target_language_all') {
    return {
      modeLabel: 'target_language_all',
      targetLanguage: normalizedPreference.targetLanguage,
      readableLanguages: [],
      summary: `Auto-translate all incoming messages into ${normalizedPreference.targetLanguage}.`,
    };
  }

  const readableSummary =
    readableLanguages.length > 0 ? readableLanguages.join(', ') : 'none configured';

  return {
    modeLabel: 'target_language_except_readable',
    targetLanguage: normalizedPreference.targetLanguage,
    readableLanguages,
    summary: `Auto-translate into ${normalizedPreference.targetLanguage}, except messages already readable in ${readableSummary}.`,
  };
}

export function getTranslationDisplayProductSummary(
  preference?: TranslationDisplayPreference | null,
): TranslationDisplayProductSummary {
  const summary = summarizeTranslationDisplayPreference(preference);

  if (summary.modeLabel === 'manual_only') {
    return {
      headline: 'Manual translation only',
      detail: 'Incoming messages stay original until the user explicitly translates them.',
    };
  }

  if (summary.modeLabel === 'target_language_all') {
    return {
      headline: `Auto-translate everything into ${summary.targetLanguage}`,
      detail:
        'Every incoming message is treated as unreadable and translated into the target language.',
    };
  }

  const readableLanguages =
    summary.readableLanguages.length > 0 ? summary.readableLanguages.join(', ') : 'none configured';

  return {
    headline: `Auto-translate into ${summary.targetLanguage}`,
    detail: `Messages already readable in ${readableLanguages} stay original; everything else is translated.`,
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
