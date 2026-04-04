import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attachment } from '@zktalk/shared';
import { AttachmentPreview } from '../AttachmentPreview';

const mockGetSessionToken = vi.fn();

vi.mock('@/lib/runtime-config', () => ({
  getApiBaseUrl: () => 'http://127.0.0.1:4000',
}));

vi.mock('@/lib/session-token', () => ({
  getSessionToken: () => mockGetSessionToken(),
}));

vi.mock('@/components/ImageLightbox', () => ({
  ImageLightbox: () => null,
}));

describe('AttachmentPreview', () => {
  beforeEach(() => {
    mockGetSessionToken.mockReset();
    mockGetSessionToken.mockReturnValue('session-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['image-bytes'], { type: 'image/jpeg' }),
        arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer,
      }),
    );
    Object.defineProperty(globalThis.URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:desktop-preview'),
    });
    Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders image attachments as visible previews even when the mime type is generic', async () => {
    const attachment: Attachment = {
      id: 'attachment-1',
      messageId: 'message-1',
      dmMessageId: null,
      storageKey: 'attachments/desktop-photo.jpg',
      fileName: 'desktop-photo.jpg',
      mimeType: 'application/octet-stream',
      fileSize: 1024,
      width: null,
      height: null,
    };

    render(<AttachmentPreview attachments={[attachment]} />);

    await waitFor(() => {
      const image = screen.getByTestId('attachment-image');
      expect(image.getAttribute('src')).toBe('blob:desktop-preview');
    });

    expect(screen.queryByTestId('attachment-file-button')).toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/upload/attachments/attachment-1/file',
      expect.objectContaining({
        credentials: 'include',
        headers: { Authorization: 'Bearer session-token' },
      }),
    );
  });

  it('saves file attachments through the desktop bridge when requested', async () => {
    const saveFile = vi.fn().mockResolvedValue({ path: '/tmp/report.pdf' });
    Object.defineProperty(window, 'zkTalkDesktop', {
      configurable: true,
      value: { saveFile },
    });

    const attachment: Attachment = {
      id: 'attachment-file-1',
      messageId: 'message-1',
      dmMessageId: null,
      storageKey: 'attachments/report.pdf',
      fileName: 'report.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
      width: null,
      height: null,
    };

    render(<AttachmentPreview attachments={[attachment]} />);

    fireEvent.click(screen.getByTestId('attachment-file-save-button'));

    await waitFor(() => {
      expect(saveFile).toHaveBeenCalledWith({
        name: 'report.pdf',
        type: 'application/pdf',
        bytes: Uint8Array.from([1, 2, 3, 4]),
      });
    });
  });
});
