import { ApiError } from './api';

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface ErrorMessageOptions {
  fallbackKey?: string;
  rateLimitedKey?: string;
}

export function getUserFacingErrorMessage(
  error: unknown,
  t: Translate,
  options: ErrorMessageOptions = {},
): string {
  const fallback = t(options.fallbackKey ?? 'common.errorOccurred');
  const rateLimited = t(options.rateLimitedKey ?? 'common.rateLimited');

  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED' || error.status === 429) {
      return rateLimited;
    }

    return error.message || fallback;
  }

  if (error instanceof Error) {
    if (/rate[_ -]?limited|too many requests|status 429/i.test(error.message)) {
      return rateLimited;
    }

    return error.message || fallback;
  }

  return fallback;
}
