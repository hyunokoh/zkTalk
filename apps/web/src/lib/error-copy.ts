import { ApiError } from '@/lib/api';

const NETWORK_ERROR_PATTERN = /(failed to fetch|networkerror|load failed|connection refused)/i;

interface UploadErrorMessageOptions {
  genericKey: string;
  tooLargeKey: string;
  invalidTypeKey: string;
  networkKey?: string;
}

interface ActionErrorMessageOptions {
  genericKey: string;
  notFoundKey?: string;
  rateLimitedKey?: string;
  networkKey?: string;
}

interface AttachmentSendErrorMessageOptions {
  genericKey?: string;
  tooLargeKey?: string;
  rateLimitedKey?: string;
  networkKey?: string;
}

interface BackupErrorMessageOptions {
  genericKey: string;
  invalidKey?: string;
  tooLargeKey?: string;
  rateLimitedKey?: string;
  networkKey?: string;
}

export function getDesktopHarnessErrorMessage(
  t: (key: string) => string,
  error: unknown,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('common.notAuthorized');
    }

    if (error.status === 404) {
      return t('desktopHarness.destinationUnavailable');
    }

    if (error.status === 429) {
      return t('common.errorOccurred');
    }

    if (error.status >= 500) {
      return t('desktopHarness.connectionError');
    }
  }

  if (error instanceof Error) {
    if (/missing required .*query param|unsupported desktop harness mode/i.test(error.message)) {
      return t('desktopHarness.invalidLink');
    }

    if (NETWORK_ERROR_PATTERN.test(error.message)) {
      return t('desktopHarness.connectionError');
    }
  }

  return t('desktopHarness.requestFailed');
}

export function getUploadErrorMessage(
  t: (key: string) => string,
  error: unknown,
  {
    genericKey,
    tooLargeKey,
    invalidTypeKey,
    networkKey = 'profile.connectionError',
  }: UploadErrorMessageOptions,
): string {
  if (error instanceof ApiError) {
    const message = error.message.toLowerCase();
    if (message.includes('file size exceeds maximum') || error.status === 413) {
      return t(tooLargeKey);
    }

    if (message.includes('only image files can be uploaded') || message.includes('file type not allowed')) {
      return t(invalidTypeKey);
    }

    if (error.status >= 500) {
      return t(networkKey);
    }
  }

  if (error instanceof Error && NETWORK_ERROR_PATTERN.test(error.message)) {
    return t(networkKey);
  }

  return t(genericKey);
}

export function getActionErrorMessage(
  t: (key: string) => string,
  error: unknown,
  {
    genericKey,
    notFoundKey,
    rateLimitedKey,
    networkKey = genericKey,
  }: ActionErrorMessageOptions,
): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('common.notAuthorized');
    }

    if (error.status === 404 && notFoundKey) {
      return t(notFoundKey);
    }

    if (error.status === 429 && rateLimitedKey) {
      return t(rateLimitedKey);
    }

    if (error.status >= 500) {
      return t(networkKey);
    }
  }

  if (error instanceof Error) {
    if (/status 401|status 403/i.test(error.message)) {
      return t('common.notAuthorized');
    }

    if (/status 404/i.test(error.message) && notFoundKey) {
      return t(notFoundKey);
    }

    if (/status 429/i.test(error.message) && rateLimitedKey) {
      return t(rateLimitedKey);
    }

    if (NETWORK_ERROR_PATTERN.test(error.message)) {
      return t(networkKey);
    }
  }

  return t(genericKey);
}

export function getAttachmentActionErrorMessage(
  t: (key: string) => string,
  error: unknown,
): string {
  if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
    return t('attachment.accessDenied');
  }

  if (error instanceof Error && /status 401|status 403/i.test(error.message)) {
    return t('attachment.accessDenied');
  }

  return getActionErrorMessage(t, error, {
    genericKey: 'attachment.openError',
    notFoundKey: 'attachment.unavailable',
  });
}

export function getAttachmentSendErrorMessage(
  t: (key: string) => string,
  error: unknown,
  {
    genericKey = 'attachment.sendError',
    tooLargeKey = 'attachment.tooLarge',
    rateLimitedKey = 'attachment.rateLimited',
    networkKey = genericKey,
  }: AttachmentSendErrorMessageOptions = {},
): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('common.notAuthorized');
    }

    if (error.status === 413) {
      return t(tooLargeKey);
    }

    if (error.status === 429) {
      return t(rateLimitedKey);
    }

    if (error.status >= 500) {
      return t(networkKey);
    }
  }

  if (error instanceof Error) {
    if (/status 401|status 403/i.test(error.message)) {
      return t('common.notAuthorized');
    }

    if (/status 413/i.test(error.message)) {
      return t(tooLargeKey);
    }

    if (/status 429/i.test(error.message)) {
      return t(rateLimitedKey);
    }

    if (NETWORK_ERROR_PATTERN.test(error.message)) {
      return t(networkKey);
    }
  }

  return t(genericKey);
}

export function getBackupExportErrorMessage(
  t: (key: string) => string,
  error: unknown,
): string {
  return getActionErrorMessage(t, error, {
    genericKey: 'backup.exportError',
    rateLimitedKey: 'backup.rateLimited',
    networkKey: 'backup.connectionError',
  });
}

export function getBackupImportErrorMessage(
  t: (key: string) => string,
  error: unknown,
  {
    genericKey = 'backup.importError',
    invalidKey = 'backup.importInvalid',
    tooLargeKey = 'backup.importTooLarge',
    rateLimitedKey = 'backup.rateLimited',
    networkKey = 'backup.connectionError',
  }: BackupErrorMessageOptions = {
    genericKey: 'backup.importError',
  },
): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return t('common.notAuthorized');
    }

    if (error.status === 400 || error.status === 422) {
      return t(invalidKey);
    }

    if (error.status === 413) {
      return t(tooLargeKey);
    }

    if (error.status === 429) {
      return t(rateLimitedKey);
    }

    if (error.status >= 500) {
      return t(networkKey);
    }
  }

  if (error instanceof Error) {
    if (/status 401|status 403/i.test(error.message)) {
      return t('common.notAuthorized');
    }

    if (/status 400|status 422/i.test(error.message)) {
      return t(invalidKey);
    }

    if (/status 413/i.test(error.message)) {
      return t(tooLargeKey);
    }

    if (/status 429/i.test(error.message)) {
      return t(rateLimitedKey);
    }

    if (NETWORK_ERROR_PATTERN.test(error.message)) {
      return t(networkKey);
    }
  }

  return t(genericKey);
}
