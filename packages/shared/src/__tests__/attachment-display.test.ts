import { describe, expect, it } from 'vitest';
import {
  hasOnlyImageAttachments,
  isImageAttachmentMimeType,
  shouldHideAttachmentBody,
} from '../utils/attachment-display.js';

describe('attachment display helpers', () => {
  it('treats generic jpg mime types as images when the file name is image-like', () => {
    expect(isImageAttachmentMimeType('application/octet-stream', 'photo.jpg')).toBe(true);
    expect(
      hasOnlyImageAttachments([
        { fileName: 'photo.jpg', mimeType: 'application/octet-stream' },
      ]),
    ).toBe(true);
  });

  it('keeps non-image generic attachments as files', () => {
    expect(isImageAttachmentMimeType('application/octet-stream', 'report.pdf')).toBe(false);
    expect(
      hasOnlyImageAttachments([
        { fileName: 'report.pdf', mimeType: 'application/octet-stream' },
      ]),
    ).toBe(false);
  });

  it('hides placeholder text for image attachments even when the mime type is generic', () => {
    const attachments = [
      { fileName: 'IMG_0002.jpg', mimeType: 'application/octet-stream' },
    ];

    expect(shouldHideAttachmentBody('(첨부파일)', attachments)).toBe(true);
    expect(shouldHideAttachmentBody('IMG_0002.jpg', attachments)).toBe(true);
  });

  it('hides generated placeholder text for non-image attachments too', () => {
    const attachments = [
      { fileName: 'report.pdf', mimeType: 'application/pdf' },
    ];

    expect(shouldHideAttachmentBody('(첨부파일)', attachments)).toBe(true);
    expect(shouldHideAttachmentBody('report.pdf', attachments)).toBe(true);
    expect(shouldHideAttachmentBody('검토 부탁', attachments)).toBe(false);
  });
});
