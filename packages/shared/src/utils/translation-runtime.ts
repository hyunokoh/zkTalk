import {
  createTranslationRenderCacheEntry,
  type TranslationRenderCacheEntry,
} from './translation-render-cache';

export type TranslationRuntimeStatus = 'available' | 'mock' | 'disabled' | 'unavailable';

export interface TranslationRuntimeSummaryLike {
  status: TranslationRuntimeStatus;
  issue?: string;
}

export interface TranslationResponseLike {
  translatedText: string | null;
  runtime: TranslationRuntimeSummaryLike;
}

export type TranslationResponseResolutionState =
  | 'translated'
  | 'translated-mock'
  | 'runtime-disabled'
  | 'runtime-unavailable';

export interface TranslationResponseResolution {
  entry: TranslationRenderCacheEntry | null;
  runtime: TranslationRuntimeSummaryLike;
  state: TranslationResponseResolutionState;
}

export function resolveTranslationResponse(input: {
  response: TranslationResponseLike;
  sourceVersion: string | null;
  targetLanguage: string;
}): TranslationResponseResolution {
  const { response } = input;

  if (response.translatedText) {
    return {
      entry: createTranslationRenderCacheEntry({
        translatedText: response.translatedText,
        targetLanguage: input.targetLanguage,
        sourceVersion: input.sourceVersion,
      }),
      runtime: response.runtime,
      state: response.runtime.status === 'mock' ? 'translated-mock' : 'translated',
    };
  }

  return {
    entry: null,
    runtime: response.runtime,
    state:
      response.runtime.status === 'disabled' ? 'runtime-disabled' : 'runtime-unavailable',
  };
}
