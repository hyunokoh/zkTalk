export interface TranslationRenderCacheVersionLike {
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface TranslationRenderCacheEntry {
  translatedText: string;
  targetLanguage: string;
  sourceVersion: string;
}

export interface ResolveTranslationRenderCacheStateInput {
  entry?: TranslationRenderCacheEntry | null;
  sourceVersion: string | null;
  targetLanguage?: string | null;
}

export type TranslationRenderCacheState =
  | 'missing'
  | 'ready'
  | 'stale'
  | 'wrong-language';

function normalizeLanguage(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function getTranslationRenderSourceVersion(
  value: TranslationRenderCacheVersionLike | null | undefined,
): string | null {
  return value?.updatedAt ?? value?.createdAt ?? null;
}

export function createTranslationRenderCacheEntry(input: {
  translatedText: string;
  targetLanguage: string;
  sourceVersion: string | null;
}): TranslationRenderCacheEntry {
  return {
    translatedText: input.translatedText,
    targetLanguage: normalizeLanguage(input.targetLanguage) ?? '',
    sourceVersion: input.sourceVersion ?? '',
  };
}

export function resolveTranslationRenderCacheState(
  input: ResolveTranslationRenderCacheStateInput,
): TranslationRenderCacheState {
  if (!input.entry?.translatedText) {
    return 'missing';
  }

  const normalizedEntryLanguage = normalizeLanguage(input.entry.targetLanguage);
  const normalizedTargetLanguage = normalizeLanguage(input.targetLanguage);

  if (
    normalizedTargetLanguage &&
    normalizedEntryLanguage &&
    normalizedEntryLanguage !== normalizedTargetLanguage
  ) {
    return 'wrong-language';
  }

  if (!input.sourceVersion || input.entry.sourceVersion !== input.sourceVersion) {
    return 'stale';
  }

  return 'ready';
}
