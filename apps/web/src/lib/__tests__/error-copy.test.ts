import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  getActionErrorMessage,
  getAttachmentActionErrorMessage,
  getAttachmentSendErrorMessage,
  getBackupExportErrorMessage,
  getBackupImportErrorMessage,
  getDesktopHarnessErrorMessage,
  getUploadErrorMessage,
} from '../error-copy';

const t = (key: string) => key;

describe('error-copy', () => {
  it('maps upload validation and network failures to product copy keys', () => {
    expect(
      getUploadErrorMessage(t, new ApiError(413, 'file size exceeds maximum'), {
        genericKey: 'community.iconUploadError',
        tooLargeKey: 'community.iconUploadTooLarge',
        invalidTypeKey: 'community.iconUploadInvalidType',
      }),
    ).toBe('community.iconUploadTooLarge');

    expect(
      getUploadErrorMessage(t, new ApiError(400, 'Only image files can be uploaded'), {
        genericKey: 'community.iconUploadError',
        tooLargeKey: 'community.iconUploadTooLarge',
        invalidTypeKey: 'community.iconUploadInvalidType',
      }),
    ).toBe('community.iconUploadInvalidType');

    expect(
      getUploadErrorMessage(t, new TypeError('Failed to fetch'), {
        genericKey: 'community.iconUploadError',
        tooLargeKey: 'community.iconUploadTooLarge',
        invalidTypeKey: 'community.iconUploadInvalidType',
      }),
    ).toBe('profile.connectionError');
  });

  it('maps realtime and action failures away from raw error text', () => {
    expect(
      getActionErrorMessage(t, new ApiError(403, 'Forbidden'), {
        genericKey: 'voice.joinFailed',
      }),
    ).toBe('common.notAuthorized');

    expect(
      getActionErrorMessage(t, new TypeError('Failed to fetch'), {
        genericKey: 'dm.sendError',
      }),
    ).toBe('dm.sendError');

    expect(
      getActionErrorMessage(t, new Error('request failed with status 429'), {
        genericKey: 'dm.sendError',
        rateLimitedKey: 'attachment.rateLimited',
      }),
    ).toBe('attachment.rateLimited');

    expect(
      getActionErrorMessage(t, new ApiError(500, 'Internal server error'), {
        genericKey: 'settings.saveError',
        networkKey: 'profile.connectionError',
      }),
    ).toBe('profile.connectionError');
  });

  it('maps attachment open/download failures to the shared product copy', () => {
    expect(
      getAttachmentActionErrorMessage(t, new ApiError(404, 'Not found')),
    ).toBe('attachment.unavailable');

    expect(
      getAttachmentActionErrorMessage(t, new Error('request failed with status 403')),
    ).toBe('attachment.accessDenied');
  });

  it('maps attachment send failures consistently across message surfaces', () => {
    expect(
      getAttachmentSendErrorMessage(t, new ApiError(413, 'Too large')),
    ).toBe('attachment.tooLarge');

    expect(
      getAttachmentSendErrorMessage(t, new Error('request failed with status 429')),
    ).toBe('attachment.rateLimited');

    expect(
      getAttachmentSendErrorMessage(t, new TypeError('Failed to fetch')),
    ).toBe('attachment.sendError');
  });

  it('maps backup export and import failures to product copy', () => {
    expect(
      getBackupExportErrorMessage(t, new ApiError(403, 'Forbidden')),
    ).toBe('common.notAuthorized');

    expect(
      getBackupExportErrorMessage(t, new TypeError('Failed to fetch')),
    ).toBe('backup.connectionError');

    expect(
      getBackupImportErrorMessage(t, new ApiError(400, 'Invalid backup')),
    ).toBe('backup.importInvalid');

    expect(
      getBackupImportErrorMessage(t, new ApiError(413, 'Too large')),
    ).toBe('backup.importTooLarge');

    expect(
      getBackupImportErrorMessage(t, new Error('request failed with status 429')),
    ).toBe('backup.rateLimited');
  });

  it('maps desktop harness failures away from raw internal details', () => {
    expect(
      getDesktopHarnessErrorMessage(t, new ApiError(403, 'Forbidden')),
    ).toBe('common.notAuthorized');

    expect(
      getDesktopHarnessErrorMessage(t, new ApiError(404, 'Not found')),
    ).toBe('desktopHarness.destinationUnavailable');

    expect(
      getDesktopHarnessErrorMessage(
        t,
        new Error('Desktop harness is missing required communitySlug query param.'),
      ),
    ).toBe('desktopHarness.invalidLink');

    expect(
      getDesktopHarnessErrorMessage(t, new TypeError('Failed to fetch')),
    ).toBe('desktopHarness.connectionError');
  });
});
