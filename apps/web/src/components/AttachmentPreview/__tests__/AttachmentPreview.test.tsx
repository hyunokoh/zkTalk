import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Attachment } from '@zktalk/shared';
import { AttachmentPreview } from '../AttachmentPreview';

const { mockShowToast } = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
}));

vi.mock('@/lib/runtime-config', () => ({
  getApiBaseUrl: () => 'http://127.0.0.1:4000',
  isDesktopRuntime: () => false,
}));

vi.mock('@/lib/session-token', () => ({
  clearSessionToken: vi.fn(),
  emitAuthSessionLost: vi.fn(),
  getSessionToken: () => 'desktop-session-token',
  hasDesktopHarnessSession: () => true,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/ImageLightbox', () => ({
  ImageLightbox: () => null,
}));

vi.mock('@/stores/toast', () => ({
  useToastStore: (selector: (state: { showToast: typeof mockShowToast }) => unknown) =>
    selector({ showToast: mockShowToast }),
}));

describe('AttachmentPreview', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
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
    Object.defineProperty(window, 'open', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ closed: false })),
    });
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
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

  it('shows an authorization toast when opening an attachment fails with 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      }),
    );

    const attachment: Attachment = {
      id: 'attachment-file-2',
      messageId: 'message-1',
      dmMessageId: null,
      storageKey: 'attachments/private.pdf',
      fileName: 'private.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
      width: null,
      height: null,
    };

    render(<AttachmentPreview attachments={[attachment]} />);

    fireEvent.click(screen.getByTestId('attachment-file-button'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'error',
        message: 'attachment.accessDenied',
      });
    });
  });

  it('attaches desktop auth headers when fetching attachments', async () => {
    const attachment: Attachment = {
      id: 'attachment-file-3',
      messageId: 'message-1',
      dmMessageId: null,
      storageKey: 'attachments/private.pdf',
      fileName: 'private.pdf',
      mimeType: 'application/pdf',
      fileSize: 2048,
      width: null,
      height: null,
    };

    render(<AttachmentPreview attachments={[attachment]} />);

    fireEvent.click(screen.getByTestId('attachment-file-button'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:4000/api/upload/attachments/attachment-file-3/file',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.any(Headers),
        }),
      );
    });

    const requestInit = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get('Authorization')).toBe('Bearer desktop-session-token');
  });

  it('shows a clear fallback message and opens the raw file when image previews cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    const attachment: Attachment = {
      id: 'attachment-image-2',
      messageId: 'message-1',
      dmMessageId: null,
      storageKey: 'attachments/broken.jpg',
      fileName: 'broken.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
      width: null,
      height: null,
    };

    render(<AttachmentPreview attachments={[attachment]} />);

    expect(await screen.findByText('attachment.previewUnavailable')).toBeTruthy();

    fireEvent.click(screen.getByTestId('attachment-image-button'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        tone: 'error',
        message: 'attachment.openError',
      });
    });
  });
});
